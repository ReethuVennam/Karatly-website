import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  getUserProfile,
  validateToken
} from "../api/authApi";
import {
  deleteAugmontUserBank,
  fetchAugmontAddresses,
  fetchAugmontBuyOrders,
  fetchAugmontSellOrders,
  fetchAugmontKycProfile,
  fetchAugmontPassbook,
  fetchAugmontUserBanks,
  fetchAugmontUserProfile,
  getAugmontUser,
  setPrimaryAugmontUserBank,
  updateAugmontUserBank,
} from "../api/augmontApi";
import { transbankValidateBankAccount } from "../api/transbankApi";
import {
  User, Shield, ShieldCheck, CreditCard, Building2,
  CheckCircle2, XCircle, AlertCircle, Plus, Pencil,
  Trash2, Loader2, ChevronRight, X
} from "lucide-react";

// ── Constants ────────────────────────────────────────────────
const MAX_BANKS = 3;
const MAX_MODS  = 3;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const getBankModCount = (id) => parseInt(localStorage.getItem(`bankMods_${id}`) || "0", 10);
const incrementBankMod = (id) => localStorage.setItem(`bankMods_${id}`, String(getBankModCount(id) + 1));

const detectIfscMismatch = (banks, accountNumber, ifscCode) => {
  const existing = banks.find(b =>
    String(b.accountNumber || "").replace(/\s/g, "") === String(accountNumber).replace(/\s/g, "")
  );
  if (!existing) return null;
  if (String(existing.ifscCode || "").toUpperCase() !== String(ifscCode).toUpperCase()) {
    return `Account ${accountNumber} is already registered with IFSC ${existing.ifscCode}.`;
  }
  return null;
};

const PRIMARY_BANK_ID_KEY = "primaryBankId";
const getStoredPrimaryBankId = () => String(localStorage.getItem(PRIMARY_BANK_ID_KEY) || "").trim();
const setStoredPrimaryBankId = (id) => localStorage.setItem(PRIMARY_BANK_ID_KEY, String(id || "").trim());
const clearStoredPrimaryBank = () => {
  localStorage.removeItem(PRIMARY_BANK_ID_KEY);
  localStorage.removeItem("primaryBank");
};
const getBankId = (bank, fallback = "") =>
  String(
    bank?.provider_bank_id ||
    bank?.userBankId ||
    bank?.bankId ||
    bank?.id ||
    fallback
  ).trim();
const getProfileBankId = () => {
  const profile = getUserProfile() || {};
  return String(profile?.userBankId || profile?.bankId || "").trim();
};

const resolveUniqueId = () => {
  const au = getAugmontUser();
  const pr = getUserProfile();
  return au?.uniqueId || pr?.uniqueId || pr?.augmontUniqueId || localStorage.getItem("userUniqueId") || "";
};

function StatusBadge({ verified, label }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
      verified ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/10 text-red-400"
    }`}>
      {verified ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {label}
    </span>
  );
}

export default function ProfilePage() {
  const navigate       = useNavigate();
  const initialProfile = useMemo(() => getUserProfile() || {}, []);
  const uniqueId       = resolveUniqueId();

  const [loading,       setLoading]       = useState(true);
  const [name,          setName]          = useState(initialProfile.fullName || "");
  const [phone,         setPhone]         = useState(initialProfile.mobileNumber || "");
  const [email,         setEmail]         = useState(initialProfile.email || "");
  const [city,          setCity]          = useState(initialProfile.augmontCity || "");
  const [stateName,     setStateName]     = useState(initialProfile.augmontState || "");
  const [pincode,       setPincode]       = useState(initialProfile.pinCode || "");
  const [profilePhoto,  setProfilePhoto]  = useState(() => {
    const profile = getUserProfile();
    return profile?.profilePhoto || localStorage.getItem("profilePhoto") || null;
  });
  const [kycStatus,     setKycStatus]     = useState("pending");
  const [panNumber,     setPanNumber]     = useState("");
  const [goldBalance,   setGoldBalance]   = useState("0.0000");
  const [banks,         setBanks]         = useState([]);
  const [showBankForm,  setShowBankForm]  = useState(false);
  const [bankAction,    setBankAction]    = useState("create");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [primaryBankId, setPrimaryBankId] = useState(getStoredPrimaryBankId());
  const [bankForm,      setBankForm]      = useState({ accountName: "", accountNumber: "", ifscCode: "" });
  const [bankLoading,   setBankLoading]   = useState(false);
  const [bankMsg,       setBankMsg]       = useState({ text: "", type: "" });
  const [addresses,     setAddresses]     = useState([]);
  const [transactions,  setTransactions]  = useState([]);
  const [txLoading,     setTxLoading]     = useState(false);
  const [passbookData,  setPassbookData]  = useState({ goldGrms: "0.0000", silverGrms: "0.0000" });
  const [sellableBalance, setSellableBalance] = useState("0.0000");

  useEffect(() => {
    if (!uniqueId) { setLoading(false); return; }
    const load = async () => {
      const auth = await validateToken();
      if (!auth?.ok) { navigate("/login"); return; }

      const [profileRes, kycRes, banksRes, passbookRes] = await Promise.all([
        fetchAugmontUserProfile(uniqueId),
        fetchAugmontKycProfile(uniqueId),
        fetchAugmontUserBanks(uniqueId),
        fetchAugmontPassbook(uniqueId),
      ]);

      if (profileRes?.ok) {
        const p = profileRes.profile || {};
        setName(p.userName || initialProfile.fullName || "");
        setPhone(p.mobileNumber || initialProfile.mobileNumber || "");
        setEmail(p.emailId || initialProfile.email || "");
        setCity(p.userCity || initialProfile.augmontCity || "");
        setStateName(p.userState || initialProfile.augmontState || "");
        setPincode(p.userPincode || initialProfile.pinCode || "");
      }
      if (kycRes?.ok) {
        const k = kycRes.kycProfile || {};
        setKycStatus((k.status || "pending").toLowerCase());
        setPanNumber(k.panNumber || "");
      }
      if (banksRes?.ok) {
        const loadedBanks = banksRes.banks || [];
        const apiPrimaryBank = loadedBanks.find(bank => bank?.isPrimary || bank?.is_primary);
        setBanks(loadedBanks);
        if (apiPrimaryBank) {
          const apiPrimaryBankId = getBankId(apiPrimaryBank);
          setStoredPrimaryBankId(apiPrimaryBankId);
          setPrimaryBankId(apiPrimaryBankId);
        }
      }
      if (passbookRes?.ok) {
        const pb = passbookRes.passbook || {};
        setGoldBalance(pb.goldGrms || "0.0000");
        setPassbookData({ goldGrms: pb.goldGrms || "0.0000", silverGrms: pb.silverGrms || "0.0000" });
        setSellableBalance(pb.sellableBalance || pb.goldGrms || "0.0000");
      }

      // Load addresses and keep only the first one
      fetchAugmontAddresses(uniqueId).then(res => {
        if (res?.ok) {
          const list = Array.isArray(res.addresses) ? res.addresses : [];
          const firstAddress = list.length ? list[0] : null;
          setAddresses(firstAddress ? [firstAddress] : []);
          if (firstAddress) {
            setCity(firstAddress.cityName || firstAddress.city || city);
            setStateName(firstAddress.stateName || firstAddress.state || stateName);
            setPincode(firstAddress.pincode || firstAddress.pinCode || pincode);
          }
        }
      });

      setLoading(false);
    };
    load();
  }, [uniqueId]);

  useEffect(() => {
    if (!banks.length || !primaryBankId) return;
    const hasStored = banks.some(bank => getBankId(bank) === primaryBankId);
    if (!hasStored) {
      clearStoredPrimaryBank();
      setPrimaryBankId("");
    }
  }, [banks, primaryBankId]);

  const makePrimaryBank = async (bank) => {
    const bankId = getBankId(bank);
    if (!bankId) return;
    const res = await setPrimaryAugmontUserBank({ uniqueId, userBankId: bankId });
    if (!res?.ok) {
      setBankMsg({ text: res?.message || "Failed to set primary bank", type: "error" });
      return;
    }
    setStoredPrimaryBankId(bankId);
    localStorage.setItem("primaryBank", JSON.stringify({
      userBankId: bankId,
      accountName: bank.accountName || "",
      accountNumber: bank.accountNumber || "",
      ifscCode: bank.ifscCode || ""
    }));
    setPrimaryBankId(bankId);
    setBanks(prevBanks =>
      prevBanks.map(item => ({
        ...item,
        isPrimary: getBankId(item) === bankId
      }))
    );
    setBankMsg({ text: "Primary bank selected.", type: "success" });
  };

  const openAddBank = () => {
    if (banks.length >= MAX_BANKS) {
      setBankMsg({ text: `Maximum ${MAX_BANKS} bank accounts allowed.`, type: "error" });
      return;
    }
    setBankForm({ accountName: name, accountNumber: "", ifscCode: "" });
    setBankAction("create");
    setSelectedBankId("");
    setBankMsg({ text: "", type: "" });
    setShowBankForm(true);
  };

  const openEditBank = (bank) => {
    const id = getBankId(bank);
    if (getBankModCount(id) >= MAX_MODS) {
      setBankMsg({ text: "Modification limit reached for this bank.", type: "error" });
      return;
    }
    setBankForm({
      accountName:   bank.accountName || "",
      accountNumber: bank.accountNumber || "",
      ifscCode:      (bank.ifscCode || "").toUpperCase(),
    });
    setBankAction("update");
    setSelectedBankId(id);
    setBankMsg({ text: "", type: "" });
    setShowBankForm(true);
  };

  const handleBankSubmit = async () => {
    const { accountName, accountNumber, ifscCode } = bankForm;
    if (!accountName.trim() || !accountNumber.trim()) {
      setBankMsg({ text: "Account name and number are required.", type: "error" });
      return;
    }
    if (!ifscRegex.test(ifscCode.trim())) {
      setBankMsg({ text: "Enter a valid IFSC code (e.g. SBIN0001234).", type: "error" });
      return;
    }
    if (bankAction === "create") {
      const mismatch = detectIfscMismatch(banks, accountNumber.trim(), ifscCode.trim());
      if (mismatch) { setBankMsg({ text: mismatch, type: "error" }); return; }
    }

    setBankLoading(true);
    setBankMsg({ text: "", type: "" });

    const validateRes = await transbankValidateBankAccount({
      accountName: accountName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim(),
    });

    if (!validateRes?.ok || !validateRes?.isValid) {
      setBankLoading(false);
      setBankMsg({ text: validateRes?.message || "Bank account validation failed. Please check your details.", type: "error" });
      return;
    }

    const targetBankId =
      selectedBankId ||
      getProfileBankId() ||
      getBankId(banks.find(bank => bank?.isPrimary || bank?.is_primary)) ||
      getBankId(banks[0]);

    if (!targetBankId) {
      setBankLoading(false);
      setBankMsg({ text: "Bank account id is required to update bank details.", type: "error" });
      return;
    }

    const res = await updateAugmontUserBank({
      uniqueId,
      userBankId: targetBankId,
      request: {
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        ifscCode: ifscCode.trim(),
        status: "active"
      }
    });

    setBankLoading(false);
    if (!res?.ok) { setBankMsg({ text: res?.message || "Failed to save bank.", type: "error" }); return; }
    if (bankAction === "update") incrementBankMod(targetBankId);

    const banksRes = await fetchAugmontUserBanks(uniqueId);
    if (banksRes?.ok) setBanks(banksRes.banks || []);

    setBankMsg({ text: bankAction === "update" ? "Bank updated successfully." : "Bank verified and added successfully.", type: "success" });
    setShowBankForm(false);
  };

  const fetchTransactions = async () => {
    setTxLoading(true);
    const [buyRes, sellRes] = await Promise.all([
      fetchAugmontBuyOrders({ uniqueId }),
      fetchAugmontSellOrders({ uniqueId }),
    ]);
    const buys  = (buyRes?.orders  || []).map(o => ({ ...o, txType: "buy"  }));
    const sells = (sellRes?.orders || []).map(o => ({ ...o, txType: "sell" }));
    const all   = [...buys, ...sells].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    setTransactions(all.slice(0, 10));
    setTxLoading(false);
  };

  const handleDeleteBank = async (bank) => {
    const id = getBankId(bank);
    if (!id) return;
    setBankLoading(true);
    const res = await deleteAugmontUserBank({ uniqueId, userBankId: id });
    setBankLoading(false);
    if (res?.ok) {
      if (id === primaryBankId) {
        clearStoredPrimaryBank();
        setPrimaryBankId("");
      }
      const banksRes = await fetchAugmontUserBanks(uniqueId);
      if (banksRes?.ok) setBanks(banksRes.banks || []);
      setBankMsg({ text: "Bank deleted.", type: "success" });
    } else {
      setBankMsg({ text: res?.message || "Failed to delete bank.", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0E11]">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  const kycApproved  = kycStatus === "approved";
  const bankVerified = banks.length > 0;
  const storedProfile = getUserProfile();
  const aadhaarVerified = storedProfile?.aadhaarVerified || !!profilePhoto;
  const initials     = name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "U";

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-8 pt-24 space-y-5">

        {/* ── Profile Card ── */}
        <div className="rounded-2xl border border-white/10 bg-[#161A1F] overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-yellow-400/20 via-amber-500/10 to-transparent" />
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-4">
              <div className="h-20 w-20 rounded-full border-4 border-[#161A1F] overflow-hidden bg-yellow-400 flex items-center justify-center">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-black">{initials}</span>
                )}
              </div>
              {kycApproved && bankVerified && (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                  <ShieldCheck size={13} /> KYC Verified
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-white">{name || "User"}</h2>
            <p className="text-sm text-white/50 mt-0.5">{phone || "—"}</p>
            <p className="text-xs text-white/30 mt-0.5">{email || "—"}</p>
            {city && stateName && (
              <p className="text-xs text-white/30 mt-1">{city}, {stateName} {pincode}</p>
            )}
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20 px-4 py-2">
              <span className="text-xs text-white/50">Gold Balance</span>
              <span className="text-sm font-bold text-yellow-400">{parseFloat(goldBalance).toFixed(4)} gms</span>
            </div>
          </div>
        </div>

        {/* ── KYC Status ── */}
        <div className="rounded-2xl border border-white/10 bg-[#161A1F] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-yellow-400" />
              <h3 className="text-base font-semibold">KYC Status</h3>
            </div>
            {!kycApproved && (
              <button
                onClick={() => navigate("/kyc")}
                className="flex items-center gap-1.5 rounded-xl bg-yellow-400 px-4 py-2 text-xs font-bold text-black hover:bg-yellow-300 transition"
              >
                Complete KYC <ChevronRight size={12} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* PAN */}
            <div
              onClick={() => !kycApproved && navigate("/kyc")}
              className={`rounded-xl border border-white/8 bg-black/20 p-4 ${!kycApproved ? "cursor-pointer hover:border-yellow-400/30 transition" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CreditCard size={14} className="text-white/40" />
                  <span className="text-xs uppercase tracking-wider text-white/40">PAN</span>
                </div>
                {!kycApproved && <ChevronRight size={13} className="text-yellow-400/50" />}
              </div>
              <p className="text-sm font-mono font-semibold text-white mb-2">{panNumber || "Not submitted"}</p>
              <StatusBadge verified={kycApproved} label={kycApproved ? "Verified" : "Tap to verify →"} />
            </div>

            {/* Aadhaar */}
            <div
              onClick={() => !aadhaarVerified && navigate("/kyc")}
              className={`rounded-xl border border-white/8 bg-black/20 p-4 ${!aadhaarVerified ? "cursor-pointer hover:border-yellow-400/30 transition" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-white/40" />
                  <span className="text-xs uppercase tracking-wider text-white/40">Aadhaar</span>
                </div>
                {!aadhaarVerified && <ChevronRight size={13} className="text-yellow-400/50" />}
              </div>
              <p className="text-sm font-semibold text-white mb-2">{aadhaarVerified ? "Verified" : "Not verified"}</p>
              <StatusBadge verified={aadhaarVerified} label={aadhaarVerified ? "Verified" : "Tap to verify →"} />
            </div>

            {/* Bank */}
            <div
              onClick={() => !bankVerified && navigate("/kyc")}
              className={`rounded-xl border border-white/8 bg-black/20 p-4 ${!bankVerified ? "cursor-pointer hover:border-yellow-400/30 transition" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-white/40" />
                  <span className="text-xs uppercase tracking-wider text-white/40">Bank</span>
                </div>
                {!bankVerified && <ChevronRight size={13} className="text-yellow-400/50" />}
              </div>
              <p className="text-sm font-semibold text-white mb-2">
                {bankVerified ? `${banks.length} account${banks.length > 1 ? "s" : ""} added` : "Not added"}
              </p>
              <StatusBadge verified={bankVerified} label={bankVerified ? "Added" : "Tap to add →"} />
            </div>
          </div>

          {!kycApproved && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-yellow-400/15 bg-yellow-400/5 p-3 text-xs text-yellow-200/70">
              <AlertCircle size={13} className="mt-0.5 shrink-0 text-yellow-400" />
              Complete KYC to enable gold withdrawals and purchases above ₹2,00,000.
            </div>
          )}
        </div>

        {/* ── Bank Details ── */}
        <div className="rounded-2xl border border-white/10 bg-[#161A1F] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-yellow-400" />
              <h3 className="text-base font-semibold">Bank Accounts</h3>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">{banks.length}/{MAX_BANKS}</span>
            </div>
            {banks.length < MAX_BANKS && !showBankForm && (
              <button onClick={openAddBank} className="flex items-center gap-1.5 rounded-xl border border-yellow-400/30 px-4 py-2 text-xs font-semibold text-yellow-300 hover:bg-yellow-400/10 transition">
                <Plus size={13} /> Add Bank
              </button>
            )}
          </div>

          {showBankForm && (
            <div className="mb-5 rounded-xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold">{bankAction === "update" ? "Edit Bank Account" : "Add New Bank Account"}</p>
                <button onClick={() => setShowBankForm(false)} className="text-white/30 hover:text-white/60"><X size={16} /></button>
              </div>
              <div className="space-y-3">
                {[
                  { key: "accountName",   label: "Account Holder Name",  placeholder: "As per bank records" },
                  { key: "accountNumber", label: "Account Number",       placeholder: "Enter account number" },
                  { key: "ifscCode",      label: "IFSC Code",            placeholder: "SBIN0001234"          },
                ].map(({ key, label, placeholder }) => (
                  <label key={key} className="block">
                    <span className="mb-1.5 block text-xs font-medium text-white/50">{label}</span>
                    <input
                      value={bankForm[key]}
                      onChange={e => setBankForm(prev => ({ ...prev, [key]: key === "ifscCode" ? e.target.value.toUpperCase() : e.target.value }))}
                      placeholder={placeholder}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-yellow-400/40"
                    />
                  </label>
                ))}
              </div>
              {bankMsg.text && (
                <div className={`mt-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${bankMsg.type === "error" ? "border border-red-500/20 bg-red-500/5 text-red-300" : "border border-emerald-500/20 bg-emerald-500/5 text-emerald-300"}`}>
                  {bankMsg.type === "error" ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                  {bankMsg.text}
                </div>
              )}
              <div className="mt-4 flex gap-3">
                <button onClick={handleBankSubmit} disabled={bankLoading} className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-60 transition">
                  {bankLoading && <Loader2 size={14} className="animate-spin" />}
                  {bankLoading ? "Validating…" : bankAction === "update" ? "Update Bank" : "Validate & Add"}
                </button>
                <button onClick={() => setShowBankForm(false)} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-white/50 hover:text-white transition">Cancel</button>
              </div>
            </div>
          )}

          {!showBankForm && bankMsg.text && (
            <div className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${bankMsg.type === "error" ? "border border-red-500/20 bg-red-500/5 text-red-300" : "border border-emerald-500/20 bg-emerald-500/5 text-emerald-300"}`}>
              {bankMsg.type === "error" ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
              {bankMsg.text}
            </div>
          )}

          {banks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
              <Building2 className="mx-auto h-8 w-8 text-white/20 mb-3" />
              <p className="text-sm text-white/40">No bank accounts added yet</p>
              <p className="text-xs text-white/25 mt-1">Add a bank account to enable gold withdrawals</p>
            </div>
          ) : (
            <div className="space-y-3">
              {banks.map((bank, i) => {
                const id       = getBankId(bank, `bank-${i}`);
                const modsLeft = MAX_MODS - getBankModCount(id);
                const accNum   = String(bank.accountNumber || "");
                const isPrimary = Boolean(bank?.isPrimary || bank?.is_primary) || id === primaryBankId;
                return (
                  <div key={id} className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10">
                        <Building2 size={16} className="text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{bank.accountName || "Bank Account"}</p>
                        <p className="text-xs text-white/40 mt-0.5">****{accNum.slice(-4)} · {bank.ifscCode || "—"}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <StatusBadge verified label="Verified" />
                          {modsLeft < MAX_MODS && <span className="text-[10px] text-white/25">{modsLeft} edits left</span>}
                          {isPrimary && <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">PRIMARY</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isPrimary ? (
                        <button onClick={() => makePrimaryBank(bank)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:border-yellow-400/40 hover:text-white transition">
                          Make Primary
                        </button>
                      ) : null}
                      <button onClick={() => openEditBank(bank)} disabled={modsLeft === 0} className="rounded-lg border border-white/10 p-2 text-white/40 hover:text-white disabled:opacity-20 transition" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDeleteBank(bank)} className="rounded-lg border border-red-500/20 p-2 text-red-400/60 hover:text-red-400 transition" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Balance ── */}
        <div className="rounded-2xl border border-white/10 bg-[#161A1F] p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-lg">💰</span>
            <h3 className="text-base font-semibold">Balance</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/8 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Gold Balance</p>
              <p className="text-2xl font-bold text-yellow-400">{parseFloat(goldBalance).toFixed(4)}</p>
              <p className="text-xs text-white/30 mt-1">gms</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Sellable Balance</p>
              <p className="text-2xl font-bold text-white">{parseFloat(sellableBalance).toFixed(4)}</p>
              <p className="text-xs text-white/30 mt-1">gms</p>
            </div>
          </div>
        </div>

        {/* ── Passbook ── */}
        <div className="rounded-2xl border border-white/10 bg-[#161A1F] p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-lg">📒</span>
            <h3 className="text-base font-semibold">Passbook</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/8 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Gold Grams</p>
              <p className="text-2xl font-bold text-yellow-400">{passbookData.goldGrms}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Silver Grams</p>
              <p className="text-2xl font-bold text-white">{passbookData.silverGrms}</p>
            </div>
          </div>
        </div>

        {/* ── Transactions ── */}
        <div className="rounded-2xl border border-white/10 bg-[#161A1F] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <h3 className="text-base font-semibold">Transactions</h3>
            </div>
            <button
              onClick={fetchTransactions}
              disabled={txLoading}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-xs text-white/60 hover:text-white transition disabled:opacity-50"
            >
              {txLoading && <Loader2 size={12} className="animate-spin" />}
              {txLoading ? "Fetching…" : "Fetch Transactions"}
            </button>
          </div>
          {transactions.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-6">Click "Fetch Transactions" to load history</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx, i) => (
                <div key={tx.transactionId || i} className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${
                      tx.txType === "buy" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/10 text-red-400"
                    }`}>{tx.txType}</span>
                    <div>
                      <p className="text-xs font-mono text-white/60">{String(tx.transactionId || "").slice(0, 20)}…</p>
                      <p className="text-[10px] text-white/30">{tx.createdAt ? new Date(tx.createdAt).toLocaleString("en-IN") : "—"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">₹{Number(tx.inclTaxAmt || tx.amount || 0).toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-white/40">{Number(tx.qty || tx.gold || 0).toFixed(4)} gms</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Saved Addresses ── */}
        {addresses.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#161A1F] p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-lg">📍</span>
              <h3 className="text-base font-semibold">Saved Addresses</h3>
            </div>
            <div className="space-y-3">
              {addresses.map((addr, i) => (
                <div key={addr?.userAddressId || i} className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                  <p className="text-sm text-white/70">{addr?.address || "Saved address"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
