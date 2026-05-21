import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, AlertCircle, Loader2,
  CreditCard, Building2, User, ChevronDown, ChevronUp
} from "lucide-react";
import toast from "react-hot-toast";
import { getUserProfile, validateToken } from "../api/authApi";
import {
  fetchAugmontKycProfile,
  fetchAugmontUserBanks,
  updateAugmontKyc,
  createAugmontUserBank,
  getAugmontUser,
  setPrimaryAugmontUserBank,
} from "../api/augmontApi";
import {
  transbankValidatePan,
  transbankAadhaarGenerateOtp,
  transbankAadhaarSubmitOtp,
  transbankValidateBankAccount,
} from "../api/transbankApi";

const panRegex  = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PRIMARY_BANK_ID_KEY = "primaryBankId";

const getBankId = (bank, fallback = "") =>
  String(
    bank?.provider_bank_id ||
    bank?.userBankId ||
    bank?.bankId ||
    bank?.id ||
    fallback
  ).trim();

const storePrimaryBank = (bank, bankId = getBankId(bank)) => {
  if (!bankId) return;
  localStorage.setItem(PRIMARY_BANK_ID_KEY, bankId);
  localStorage.setItem("primaryBank", JSON.stringify({
    userBankId: bankId,
    accountName: bank?.accountName || "",
    accountNumber: bank?.accountNumber || "",
    ifscCode: bank?.ifscCode || ""
  }));
};

const ensureSingleBankPrimary = async (uniqueId, bankList) => {
  const banks = Array.isArray(bankList) ? bankList : [];
  const apiPrimaryBank = banks.find(bank => bank?.isPrimary || bank?.is_primary);

  if (apiPrimaryBank) {
    const apiPrimaryBankId = getBankId(apiPrimaryBank);
    storePrimaryBank(apiPrimaryBank, apiPrimaryBankId);
    return banks.map(bank => ({
      ...bank,
      isPrimary: getBankId(bank) === apiPrimaryBankId
    }));
  }

  if (banks.length === 1) {
    const onlyBank = banks[0];
    const onlyBankId = getBankId(onlyBank);
    if (!onlyBankId) return banks;
    await setPrimaryAugmontUserBank({ uniqueId, userBankId: onlyBankId }).catch(() => null);
    storePrimaryBank(onlyBank, onlyBankId);
    return [{ ...onlyBank, isPrimary: true }];
  }

  return banks;
};

const resolveUniqueId = () => {
  const au = getAugmontUser();
  const pr = getUserProfile();
  return au?.uniqueId || pr?.uniqueId || pr?.augmontUniqueId || localStorage.getItem("userUniqueId") || "";
};

// ─── Accordion Section ────────────────────────────────────────
function KycSection({ icon, title, subtitle, status, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const verified = status === "verified";

  return (
    <div className={`rounded-2xl border transition-colors ${verified ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/10 bg-[#161A1F]"}`}>
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${verified ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-400/10 text-yellow-400"}`}>
            {verified ? <CheckCircle2 size={18} /> : icon}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${verified ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-400/10 text-yellow-400"}`}>
            {verified ? "Verified" : "Pending"}
          </span>
          {open ? <ChevronUp size={15} className="text-white/30" /> : <ChevronDown size={15} className="text-white/30" />}
        </div>
      </button>
      {open && <div className="border-t border-white/8 px-5 pb-5 pt-4">{children}</div>}
    </div>
  );
}

// ─── PAN ─────────────────────────────────────────────────────
function PanSection({ uniqueId, kycApproved, panNumber, onVerified }) {
  const [pan,     setPan]     = useState(panNumber || "");
  const [name,    setName]    = useState("");
  const [dob,     setDob]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  if (kycApproved) return (
    <div className="flex items-center gap-2 text-sm text-emerald-400">
      <CheckCircle2 size={14} /> PAN {panNumber} verified with Augmont.
    </div>
  );

  const handleSubmit = async () => {
    const cleaned = pan.trim().toUpperCase();
    if (!panRegex.test(cleaned)) { setError("Enter a valid PAN (e.g. ABCDE1234F)"); return; }
    if (!name.trim()) { setError("Enter name as per PAN card"); return; }
    if (!dob) { setError("Select your date of birth"); return; }
    setLoading(true); setError("");

    const v = await transbankValidatePan({ panNumber: cleaned, name: name.trim(), mobile: getUserProfile()?.mobileNumber || "" });
    if (!v?.ok || !v?.isValid) { setLoading(false); setError(v?.message || "PAN could not be verified."); return; }

    const r = await updateAugmontKyc({ uniqueId, request: { panNumber: cleaned, nameAsPerPan: name.trim(), dateOfBirth: dob, status: "approved" } });
    setLoading(false);
    if (!r?.ok) { setError(r?.message || "PAN submission failed."); return; }
    toast.success("PAN verified successfully");
    onVerified();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-yellow-400/15 bg-yellow-400/5 p-3 text-xs text-yellow-200/70">
        PAN is required for KYC compliance and purchases above ₹2,00,000.
      </div>
      {[
        { label: "PAN Number", val: pan, set: v => { setPan(v.toUpperCase()); setError(""); }, ph: "ABCDE1234F", mono: true, max: 10 },
        { label: "Name as per PAN", val: name, set: v => { setName(v.toUpperCase()); setError(""); }, ph: "FULL NAME AS ON PAN" },
      ].map(({ label, val, set, ph, mono, max }) => (
        <label key={label} className="block">
          <span className="mb-1.5 block text-xs font-medium text-white/50">{label}</span>
          <input value={val} onChange={e => set(e.target.value)} placeholder={ph} maxLength={max}
            className={`w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-white/20 outline-none focus:border-yellow-400/40 ${mono ? "font-mono tracking-widest" : ""}`} />
        </label>
      ))}
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-white/50">Date of Birth</span>
        <input type="date" value={dob} onChange={e => { setDob(e.target.value); setError(""); }} max={new Date().toISOString().split("T")[0]}
          className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-yellow-400/40" />
      </label>
      {error && <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300"><AlertCircle size={13} />{error}</div>}
      <button onClick={handleSubmit} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-60 transition">
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? "Verifying…" : "Verify & Submit PAN"}
      </button>
    </div>
  );
}

// ─── Aadhaar ──────────────────────────────────────────────────
function AadhaarSection({ uniqueId, verified, onVerified }) {
  const [aadhaar,   setAadhaar]   = useState("");
  const [otp,       setOtp]       = useState("");
  const [sessionId, setSessionId] = useState("");
  const [stage,     setStage]     = useState("enter");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  if (verified) return (
    <div className="flex items-center gap-2 text-sm text-emerald-400">
      <CheckCircle2 size={14} /> Aadhaar verified successfully.
    </div>
  );

  const sendOtp = async () => {
    const c = aadhaar.replace(/\D/g, "");
    if (c.length !== 12) { setError("Enter a valid 12-digit Aadhaar"); return; }
    setLoading(true); setError("");
    const r = await transbankAadhaarGenerateOtp(c);
    setLoading(false);
    if (!r?.ok) { setError(r?.message || "Could not send OTP."); return; }
    setSessionId(r.sessionId || "");
    setStage("otp");
    toast.success("OTP sent to Aadhaar-linked mobile");
  };

  const submitOtp = async () => {
    if (otp.replace(/\D/g, "").length !== 6) { setError("Enter the 6-digit OTP"); return; }
    setLoading(true); setError("");
    const r = await transbankAadhaarSubmitOtp(sessionId, otp.trim(), uniqueId, aadhaar.replace(/\D/g, ""));
    if (!r?.ok) { setLoading(false); setError(r?.message || "OTP verification failed."); return; }
    const photo = r?.raw?.photo || r?.raw?.data?.photo || null;
    if (photo) localStorage.setItem("profilePhoto", photo.startsWith("data:") ? photo : `data:image/jpeg;base64,${photo}`);
    await updateAugmontKyc({ uniqueId, request: { aadharNumber: aadhaar.replace(/\D/g, "") } });
    setLoading(false);
    toast.success("Aadhaar verified");
    onVerified();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-yellow-400/15 bg-yellow-400/5 p-3 text-xs text-yellow-200/70">
        An OTP will be sent to the mobile number linked with your Aadhaar.
      </div>
      {stage === "enter" ? (
        <>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-white/50">Aadhaar Number</span>
            <input value={aadhaar} onChange={e => { setAadhaar(e.target.value.replace(/\D/g,"").slice(0,12)); setError(""); }} placeholder="123456789012" maxLength={12}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono tracking-widest text-white placeholder-white/20 outline-none focus:border-yellow-400/40" />
          </label>
          {error && <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300"><AlertCircle size={13} />{error}</div>}
          <button onClick={sendOtp} disabled={loading || aadhaar.replace(/\D/g,"").length !== 12} className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-60 transition">
            {loading && <Loader2 size={14} className="animate-spin" />}{loading ? "Sending…" : "Send OTP"}
          </button>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-300">
            OTP sent to Aadhaar-linked mobile (****{aadhaar.slice(-4)})
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-white/50">Enter OTP</span>
            <input value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g,"").slice(0,6)); setError(""); }} placeholder="6-digit OTP" maxLength={6}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono tracking-widest text-white placeholder-white/20 outline-none focus:border-yellow-400/40" />
          </label>
          {error && <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300"><AlertCircle size={13} />{error}</div>}
          <button onClick={submitOtp} disabled={loading || otp.replace(/\D/g,"").length !== 6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-60 transition">
            {loading && <Loader2 size={14} className="animate-spin" />}{loading ? "Verifying…" : "Verify OTP"}
          </button>
          <div className="flex gap-4 text-center">
            <button onClick={async () => { const r = await transbankAadhaarGenerateOtp(aadhaar.replace(/\D/g,"")); if(r?.ok) toast.success("OTP resent"); }} className="flex-1 text-xs text-white/30 hover:text-white/50 transition">Resend OTP</button>
            <button onClick={() => { setStage("enter"); setOtp(""); setError(""); }} className="flex-1 text-xs text-white/30 hover:text-white/50 transition">Change number</button>
            <button onClick={() => { toast("Aadhaar saved without OTP"); onVerified(); }} className="flex-1 text-xs text-white/20 hover:text-white/40 transition">Skip OTP</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Bank ─────────────────────────────────────────────────────
function BankSection({ uniqueId, banks, onVerified }) {
  const [form,    setForm]    = useState({ accountName: "", accountNumber: "", ifscCode: "" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const getCreatedBankId = (response) =>
    String(
      response?.data?.payload?.result?.data?.userBankId ||
      response?.data?.payload?.result?.userBankId ||
      response?.raw?.payload?.result?.data?.userBankId ||
      response?.raw?.payload?.result?.userBankId ||
      response?.bank?.userBankId ||
      response?.userBankId ||
      ""
    ).trim();

  const handleSubmit = async () => {
    if (!form.accountName.trim() || !form.accountNumber.trim()) { setError("Account name and number required"); return; }
    if (!ifscRegex.test(form.ifscCode.trim())) { setError("Enter a valid IFSC (e.g. SBIN0001234)"); return; }
    setLoading(true); setError("");

    const v = await transbankValidateBankAccount({ accountName: form.accountName.trim(), accountNumber: form.accountNumber.trim(), ifscCode: form.ifscCode.trim() });
    if (!v?.ok || !v?.isValid) { setLoading(false); setError(v?.message || "Bank validation failed."); return; }

    const r = await createAugmontUserBank({ uniqueId, request: { accountNumber: form.accountNumber.trim(), accountName: form.accountName.trim(), ifscCode: form.ifscCode.trim() } });
    setLoading(false);
    if (!r?.ok) { setError(r?.message || "Could not add bank."); return; }
    const createdBankId = getCreatedBankId(r);
    const isFirstBank = !Array.isArray(banks) || banks.length === 0;
    if (isFirstBank) {
      if (createdBankId) {
        await setPrimaryAugmontUserBank({ uniqueId, userBankId: createdBankId }).catch(() => null);
        storePrimaryBank(form, createdBankId);
      } else {
        const banksRes = await fetchAugmontUserBanks(uniqueId);
        const latestBanks = banksRes?.ok && Array.isArray(banksRes.banks) ? banksRes.banks : [];
        const matchedBank = latestBanks.find(bank =>
          String(bank?.accountNumber || bank?.account_number || "").replace(/\s/g, "") === form.accountNumber.trim() &&
          String(bank?.ifscCode || bank?.ifsc_code || "").toUpperCase() === form.ifscCode.trim().toUpperCase()
        );
        const matchedBankId = getBankId(matchedBank);
        if (matchedBankId) {
          await setPrimaryAugmontUserBank({ uniqueId, userBankId: matchedBankId }).catch(() => null);
          storePrimaryBank(matchedBank, matchedBankId);
        }
      }
    }
    toast.success("Bank verified and added");
    onVerified();
  };

  return (
    <div className="space-y-4">
      {banks.length > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs text-emerald-400/70 uppercase tracking-wider mb-2">Existing accounts</p>
          {banks.map((b, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-sm font-medium text-white">{b.accountName}</p>
                <p className="text-xs text-white/40">****{String(b.accountNumber).slice(-4)} · {b.ifscCode}</p>
              </div>
              <CheckCircle2 size={13} className="text-emerald-400" />
            </div>
          ))}
          <p className="text-xs text-white/30 mt-2">Add another account below</p>
        </div>
      )}
      <div className="rounded-xl border border-yellow-400/15 bg-yellow-400/5 p-3 text-xs text-yellow-200/70">
        Bank account is verified in real-time before being added.
      </div>
      {[
        { key: "accountName",   label: "Account Holder Name",  ph: "As per bank records" },
        { key: "accountNumber", label: "Account Number",       ph: "Enter account number" },
        { key: "ifscCode",      label: "IFSC Code",            ph: "SBIN0001234"          },
      ].map(({ key, label, ph }) => (
        <label key={key} className="block">
          <span className="mb-1.5 block text-xs font-medium text-white/50">{label}</span>
          <input value={form[key]} onChange={e => { setForm(p => ({ ...p, [key]: key === "ifscCode" ? e.target.value.toUpperCase() : e.target.value })); setError(""); }} placeholder={ph}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-white/20 outline-none focus:border-yellow-400/40" />
        </label>
      ))}
      {error && <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300"><AlertCircle size={13} />{error}</div>}
      <button onClick={handleSubmit} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-60 transition">
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? "Validating…" : "Validate & Add Bank"}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function KYCPage() {
  const navigate = useNavigate();
  const uniqueId = resolveUniqueId();

  const [loading,         setLoading]         = useState(true);
  const [kycApproved,     setKycApproved]     = useState(false);
  const [panNumber,       setPanNumber]       = useState("");
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [banks,           setBanks]           = useState([]);
  const [bankVerified,    setBankVerified]    = useState(false);

  useEffect(() => {
    if (!uniqueId) { setLoading(false); return; }
    const profile = getUserProfile();
    setAadhaarVerified(profile?.aadhaarVerified || !!localStorage.getItem("profilePhoto"));
    Promise.all([
      fetchAugmontKycProfile(uniqueId),
      fetchAugmontUserBanks(uniqueId),
    ]).then(async ([kycRes, banksRes]) => {
      if (kycRes?.ok) {
        setKycApproved((kycRes.kycProfile?.status || "").toLowerCase() === "approved");
        setPanNumber(kycRes.kycProfile?.panNumber || "");
      }
      if (banksRes?.ok) {
        const normalizedBanks = await ensureSingleBankPrimary(uniqueId, banksRes.banks || []);
        setBanks(normalizedBanks);
        setBankVerified(normalizedBanks.length > 0);
      }
      setLoading(false);
    });
  }, [uniqueId]);

  const allDone = kycApproved && aadhaarVerified && bankVerified;

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0E11]">
      <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <button onClick={() => navigate(-1)} className="font-medium text-yellow-400 hover:text-yellow-300 transition">← Back</button>
        <h1 className="text-base font-semibold">KYC Verification</h1>
        <div />
      </div>

      <div className="mx-auto max-w-xl px-4 py-6 space-y-4">

        {allDone ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">All KYC steps completed</p>
              <p className="text-xs text-white/40 mt-0.5">Your account is fully verified</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-yellow-400/15 bg-yellow-400/5 p-4 text-sm text-yellow-200/70">
            Complete the steps below in any order. Each step is independent — tap to expand.
          </div>
        )}

        <KycSection icon={<CreditCard size={18} />} title="PAN Verification" subtitle="Validate your PAN for KYC compliance" status={kycApproved ? "verified" : "pending"} defaultOpen={!kycApproved}>
          <PanSection uniqueId={uniqueId} kycApproved={kycApproved} panNumber={panNumber} onVerified={() => setKycApproved(true)} />
        </KycSection>

        <KycSection icon={<User size={18} />} title="Aadhaar Verification" subtitle="Verify via OTP sent to Aadhaar-linked mobile" status={aadhaarVerified ? "verified" : "pending"} defaultOpen={!aadhaarVerified && kycApproved}>
          <AadhaarSection uniqueId={uniqueId} verified={aadhaarVerified} onVerified={() => setAadhaarVerified(true)} />
        </KycSection>

        <KycSection icon={<Building2 size={18} />} title="Bank Account" subtitle="Required for gold sell payouts" status={bankVerified ? "verified" : "pending"} defaultOpen={!bankVerified && kycApproved && aadhaarVerified}>
          <BankSection uniqueId={uniqueId} banks={banks} onVerified={() => {
            fetchAugmontUserBanks(uniqueId).then(async r => {
              if (r?.ok) {
                const normalizedBanks = await ensureSingleBankPrimary(uniqueId, r.banks || []);
                setBanks(normalizedBanks);
                setBankVerified(normalizedBanks.length > 0);
              }
            });
          }} />
        </KycSection>

        <button onClick={() => navigate("/dashboard")} className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm text-white/50 hover:text-white transition">
          {allDone ? "Go to Dashboard →" : "Complete later — Go to Dashboard"}
        </button>

      </div>
    </div>
  );
}
