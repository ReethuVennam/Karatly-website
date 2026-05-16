/**
 * src/components/KycStatusBanner.jsx
 *
 * Shows KYC and bank verification status on the Dashboard.
 * Non-blocking — user can dismiss or click to complete KYC.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ShieldCheck, CreditCard, Building2, X } from "lucide-react";
import {
  fetchAugmontKycProfile,
  fetchAugmontUserBanks,
  getAugmontUser
} from "../api/augmontApi";
import { getUserProfile } from "../api/authApi";

const resolveUniqueId = () => {
  const augmontUser = getAugmontUser();
  const profile     = getUserProfile();
  return (
    augmontUser?.uniqueId ||
    profile?.uniqueId ||
    profile?.augmontUniqueId ||
    localStorage.getItem("userUniqueId") ||
    ""
  );
};

export default function KycStatusBanner() {
  const navigate  = useNavigate();
  const uniqueId  = resolveUniqueId();

  const [kycApproved,  setKycApproved]  = useState(false);
  const [bankVerified, setBankVerified] = useState(false);
  const [dismissed,    setDismissed]    = useState(false);
  const [loading,      setLoading]      = useState(Boolean(uniqueId));

  useEffect(() => {
    if (!uniqueId) return;

    // Check KYC status from Augmont
    fetchAugmontKycProfile(uniqueId).then((res) => {
      if (res?.ok) {
        const status = (res.kycProfile?.status || "").toLowerCase();
        setKycApproved(status === "approved");
      }
      setLoading(false);
    });

    // Check bank from Augmont API (DB backed, not localStorage)
    fetchAugmontUserBanks(uniqueId).then((res) => {
      if (res?.ok && res?.banks?.length > 0) {
        setBankVerified(true);
      }
    }).catch(() => {});
  }, [uniqueId]);

  // Don't show if loading or dismissed
  if (loading || dismissed) return null;

  const allVerified = kycApproved && bankVerified;

  return (
    <div className={`rounded-2xl border p-4 mb-4 ${
      allVerified
        ? "border-emerald-500/20 bg-emerald-500/5"
        : "border-yellow-400/20 bg-yellow-400/5"
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {allVerified
            ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            : <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
          }
          <div>
            <p className={`text-sm font-semibold ${allVerified ? "text-emerald-300" : "text-yellow-300"}`}>
              {allVerified ? "KYC Verified" : "Complete your KYC verification"}
            </p>
            <p className="mt-1 text-xs text-white/50">
              {allVerified
                ? "Your identity and bank account are verified."
                : "Verify your identity to unlock higher purchase limits and enable gold withdrawals."}
            </p>

            {/* Status pills */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${
                kycApproved
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}>
                <CreditCard size={11} />
                PAN {kycApproved ? "Verified" : "Not Verified"}
              </span>

              <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${
                bankVerified
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}>
                <Building2 size={11} />
                Bank {bankVerified ? "Added" : "Not Added"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!allVerified && (
            <button
              onClick={() => navigate("/kyc")}
              className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-bold text-black transition hover:bg-yellow-300"
            >
              Complete KYC
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="rounded-full p-1.5 text-white/30 hover:text-white/60 transition"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
