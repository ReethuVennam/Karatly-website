import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Loader2,
  Lock,
  Plus,
  Smartphone,
  Trash2
} from "lucide-react";
import AppSubpageLayout, { AppPageBack } from "../components/AppSubpageLayout";
import { getUserProfile, validateToken } from "../api/authApi";
import { fetchAugmontUserBanks, getAugmontUser } from "../api/augmontApi";

const resolveUniqueId = () => {
  const au = getAugmontUser();
  const pr = getUserProfile();
  return au?.uniqueId || pr?.uniqueId || pr?.augmontUniqueId || localStorage.getItem("userUniqueId") || "";
};

const maskAccount = (num) => {
  const s = String(num || "");
  if (s.length < 4) return "****";
  return `** ${s.slice(-4)}`;
};

export default function BankPage() {
  const navigate = useNavigate();
  const uniqueId = resolveUniqueId();
  const [loading, setLoading] = useState(true);
  const [banks, setBanks] = useState([]);

  useEffect(() => {
    if (!uniqueId) {
      setLoading(false);
      return;
    }
    validateToken().then((auth) => {
      if (!auth?.ok) navigate("/login");
    });
    fetchAugmontUserBanks(uniqueId).then((res) => {
      if (res?.ok) setBanks(res.banks || []);
      setLoading(false);
    });
  }, [navigate, uniqueId]);

  const primaryBank = banks.find((b) => b?.isPrimary || b?.is_primary) || banks[0];

  return (
    <AppSubpageLayout>
      <AppPageBack title="Payment Methods" />

      <section className="karatly-subpage-hero relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-yellow-500/20 to-transparent" />
        <div className="relative">
          <p className="text-xs text-white/45">Auto Debit</p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">SIP via UPI Mandate</h2>
          <p className="mt-2 text-sm text-white/50">Next charge ₹2,500 on 5 Jun · aarav@okhdfc</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-lg bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-yellow-300"
            >
              Manage Mandate
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/10"
            >
              Pause
            </button>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xs font-bold tracking-[0.2em] text-white/80">SAVED ACCOUNTS</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
          </div>
        ) : (
          <div className="space-y-3">
            {primaryBank ? (
              <div className="karatly-subpage-panel flex items-center justify-between rounded-xl px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-white/8 text-yellow-300">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {(primaryBank.bankName || "HDFC BANK").toUpperCase()} {maskAccount(primaryBank.accountNumber)}
                    </p>
                    <p className="text-xs text-white/45">Savings · IMPS Instant</p>
                  </div>
                </div>
                <span className="rounded border border-emerald-500/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Default
                </span>
              </div>
            ) : null}

            <div className="karatly-subpage-panel flex items-center justify-between rounded-xl px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-white/8 text-yellow-300">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">hari@oksbi</p>
                  <p className="text-xs text-white/45">UPI · Instant Credit</p>
                </div>
              </div>
              <button type="button" className="text-white/40 hover:text-red-400" aria-label="Remove UPI">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate("/kyc")}
              className="karatly-subpage-panel flex w-full items-center gap-4 rounded-xl px-5 py-4 text-left transition hover:bg-white/[0.03]"
            >
              <div className="grid h-11 w-11 place-items-center rounded-full bg-white/8 text-yellow-300">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Add new account</p>
                <p className="text-xs text-white/45">Bank or UPI</p>
              </div>
            </button>
          </div>
        )}
      </section>

      <p className="mt-12 flex items-center justify-center gap-2 text-center text-xs text-white/40">
        <Lock className="h-3.5 w-3.5 text-emerald-400/80" />
        Verified beneficiary · Encrypted with 256-bit SSL
      </p>
    </AppSubpageLayout>
  );
}
