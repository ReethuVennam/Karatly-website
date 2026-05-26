import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { clearAuthSession, getUserProfile, validateToken } from "../api/authApi";
import {
  fetchAugmontKycProfile,
  fetchAugmontUserBanks,
  fetchAugmontUserProfile,
  getAugmontUser,
} from "../api/augmontApi";
import { loadUserDashboardData } from "../utils/userDashboard";
import {
  Bell,
  ChevronRight,
  CreditCard,
  HelpCircle,
  IdCard,
  Loader2,
  Lock,
  LogOut,
  Rocket,
  ShieldCheck,
  Wallet,
} from "lucide-react";

const resolveUniqueId = () => {
  const au = getAugmontUser();
  const pr = getUserProfile();
  return au?.uniqueId || pr?.uniqueId || pr?.augmontUniqueId || localStorage.getItem("userUniqueId") || "";
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const initialProfile = useMemo(() => getUserProfile() || {}, []);
  const uniqueId = resolveUniqueId();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(initialProfile.fullName || "");
  const [phone, setPhone] = useState(initialProfile.mobileNumber || "");
  const [email, setEmail] = useState(initialProfile.email || "");
  const [kycStatus, setKycStatus] = useState("pending");
  const [goldBalance, setGoldBalance] = useState("0.0000");
  const [silverBalance, setSilverBalance] = useState("0");
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [banks, setBanks] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState(() => {
    const profile = getUserProfile() || {};
    return profile.profilePhoto || localStorage.getItem("profilePhoto") || "";
  });

  useEffect(() => {
    if (!uniqueId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const auth = await validateToken();
      if (!auth?.ok) {
        navigate("/login");
        return;
      }

      const [profileRes, kycRes, banksRes, dashboard] = await Promise.all([
        fetchAugmontUserProfile(uniqueId),
        fetchAugmontKycProfile(uniqueId),
        fetchAugmontUserBanks(uniqueId),
        loadUserDashboardData({ uniqueId, forceRates: true }),
      ]);

      if (profileRes?.ok) {
        const profile = profileRes.profile || {};
        setName(profile.userName || initialProfile.fullName || "");
        setPhone(profile.mobileNumber || initialProfile.mobileNumber || "");
        setEmail(profile.emailId || initialProfile.email || "");
      }
      if (kycRes?.ok) setKycStatus((kycRes.kycProfile?.status || "pending").toLowerCase());
      if (banksRes?.ok) setBanks(banksRes.banks || []);
      setGoldBalance(String(dashboard.passbook.goldGrams || 0));
      setSilverBalance(String(dashboard.passbook.silverGrams || 0));
      setPortfolioValue(dashboard.portfolio.portfolioValue || 0);
      const latestProfile = getUserProfile() || {};
      setProfilePhoto(latestProfile.profilePhoto || localStorage.getItem("profilePhoto") || "");
      setLoading(false);
    };

    load();
  }, [initialProfile.email, initialProfile.fullName, initialProfile.mobileNumber, navigate, uniqueId]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  const initials = name ? name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() : "HP";
  const verified = /approved|verified|completed/i.test(kycStatus);

  return (
    <div className="karatly-shell min-h-screen text-white">
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 pb-12 pt-28">
        <section className="overflow-hidden rounded-lg border border-yellow-500/55 bg-black">
          <div className="relative p-8">
            <div className="absolute inset-0 opacity-45 [background-image:repeating-radial-gradient(ellipse_at_center,rgba(234,179,8,0.5)_0_1px,transparent_1px_12px)]" />
            <div className="relative z-10">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-yellow-400 text-lg font-bold text-black">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt={name || "Profile"} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div>
                  <p className="font-semibold">{name || "Hariprasanth"}</p>
                  <p className="text-xs text-white/45">{email || phone || "hariprasanth@karatly.in"}</p>
                  <span className="mt-2 inline-flex rounded-full bg-yellow-500/20 px-2 py-1 text-[10px] font-semibold text-yellow-300">
                    Gold Member - Tier II
                  </span>
                </div>
              </div>
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                {[
                  ["Gold", `${parseFloat(goldBalance).toFixed(2)}g`, "text-yellow-300", Wallet],
                  ["Silver", `${parseFloat(silverBalance || 182).toFixed(0)}g`, "text-cyan-300", ShieldCheck],
                  ["Portfolio Value", `₹${Number(portfolioValue || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, "text-emerald-400", CreditCard],
                ].map(([label, amount, color, Icon]) => (
                  <div key={label} className="flex items-center gap-4 rounded-md border border-white/15 bg-[#15191a] p-5">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-black text-yellow-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${color}`}>{amount}</p>
                      <p className="mt-1 text-xs text-white/45">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="karatly-card mt-8 flex items-center justify-between rounded-md p-5">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-yellow-500/20 text-yellow-300">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Boost Your tier</p>
              <p className="text-xs text-white/45">Invest ₹7,300 more this month to reach Tier III.</p>
            </div>
          </div>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('openTradeModal', { detail: { type: 'buy' } }))} className="rounded-md bg-yellow-400 px-4 py-2 text-xs font-bold text-black">
            Invest Now
          </button>
        </section>

        <ProfileSection
          title="Account"
          rows={[
            ["KYC Verification", verified ? "Your identity is verified" : "Tap to complete verification", ShieldCheck, verified ? "Verified" : "", "/kyc"],
            ["Aadhaar Verification", initialProfile?.aadhaarVerified ? "Aadhaar is verified" : "Tap to verify Aadhaar", IdCard, initialProfile?.aadhaarVerified ? "Verified" : "", "/kyc"],
            ["Bank Account", banks.length > 0 ? `${banks.length} bank account${banks.length > 1 ? "s" : ""} added` : "Add bank account for sell payouts", CreditCard, banks.length > 0 ? "Added" : "", "/bank"],
          ]}
        />

        <ProfileSection
          title="Settings"
          rows={[
            ["Notification", "Stay updated with important alerts", Bell, "", "/notifications"],
            ["Security", "Manage passwords and privacy", Lock, "", "/settings"],
            ["Help & Support", "FAQs and Contact Support", HelpCircle, "", "/help"],
            ["Terms & Condition", "Regulations of company", Wallet, "", "/terms"],
          ]}
        />

        <button
          type="button"
          onClick={handleLogout}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-[#101516] py-4 text-sm font-semibold text-red-500"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>

        <p className="mt-8 text-center text-xs text-white/45">Karatly v2.6.0 - Made with care</p>
      </main>
    </div>
  );
}

function ProfileSection({ title, rows }) {
  const navigate = useNavigate();
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-bold uppercase">{title}</h2>
      <div className="overflow-hidden rounded-md border border-white/10 bg-[#101516]">
        {rows.map(([label, sub, Icon, right, path]) => (
          <button
            key={label}
            type="button"
            onClick={() => path && navigate(path)}
            className="flex w-full items-center justify-between border-b border-white/10 px-5 py-4 text-left last:border-b-0 hover:bg-white/5"
          >
            <span className="flex items-center gap-4">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-yellow-300">
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="text-xs text-white/40">{sub}</span>
              </span>
            </span>
            {typeof right === "string" && right ? (
              <span className="rounded bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-300">{right}</span>
            ) : right || <ChevronRight className="h-4 w-4 text-white/45" />}
          </button>
        ))}
      </div>
    </section>
  );
}
