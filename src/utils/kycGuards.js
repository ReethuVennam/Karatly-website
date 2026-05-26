import { getUserProfile } from "../api/authApi";
import { fetchAugmontBuyOrders, fetchAugmontKycProfile } from "../api/augmontApi";

export const NON_KYC_FY_LIMIT = 5000;
export const KYC_VERIFIED_FY_LIMIT = 500000;
export const KYC_PURCHASE_THRESHOLD = 5000;
export const MIN_BUY_PRETAX = 5;
export const GST_RATE = 0.03;

export const getFinancialYearStart = () => {
  const fyStart = new Date();
  fyStart.setMonth(3);
  fyStart.setDate(1);
  fyStart.setHours(0, 0, 0, 0);
  if (fyStart > new Date()) fyStart.setFullYear(fyStart.getFullYear() - 1);
  return fyStart;
};

export const isKycVerified = (profile = {}, kycProfile = {}) => {
  const status = String(
    kycProfile?.status || profile?.kycStatus || profile?.augmontKycStatus || ""
  ).toLowerCase();
  return (
    profile?.panVerified === true ||
    profile?.aadhaarVerified === true ||
    profile?.bankVerified === true ||
    ["approved", "verified", "completed"].includes(status)
  );
};

export const getKycLimit = (profile = {}, kycProfile = {}) =>
  isKycVerified(profile, kycProfile) ? KYC_VERIFIED_FY_LIMIT : NON_KYC_FY_LIMIT;

export const sumFinancialYearPurchases = (orders = [], fyStart = getFinancialYearStart()) =>
  (orders || [])
    .filter((order) => {
      const date = new Date(order.date || order.createdAt || 0);
      return date >= fyStart && String(order.status || "").toLowerCase() !== "cancelled";
    })
    .reduce((sum, order) => sum + Number(order.amount || 0), 0);

export async function resolveKycContext(uniqueId) {
  const profile = getUserProfile() || {};
  let kycProfile = null;
  if (uniqueId) {
    try {
      const res = await fetchAugmontKycProfile(uniqueId);
      if (res?.ok) kycProfile = res.kycProfile || {};
    } catch {
      kycProfile = null;
    }
  }
  return { profile, kycProfile, verified: isKycVerified(profile, kycProfile) };
}

export async function checkPurchaseAllowed({ uniqueId, amount, profile: inputProfile }) {
  const paidAmount = Number(amount || 0);
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    return { ok: false, code: "INVALID_AMOUNT", message: "Enter a valid purchase amount." };
  }

  const preTax = paidAmount / (1 + GST_RATE);
  if (preTax < MIN_BUY_PRETAX) {
    return {
      ok: false,
      code: "MIN_AMOUNT",
      message: `Minimum purchase is ₹${MIN_BUY_PRETAX} exclusive of tax.`
    };
  }

  const { profile, kycProfile, verified } = await resolveKycContext(uniqueId);
  const activeProfile = inputProfile || profile;

  if (!verified && paidAmount > KYC_PURCHASE_THRESHOLD) {
    return {
      ok: false,
      code: "KYC_REQUIRED",
      message: `Complete KYC to buy above ₹${KYC_PURCHASE_THRESHOLD.toLocaleString("en-IN")}.`,
      action: "/kyc"
    };
  }

  if (!uniqueId) {
    return {
      ok: false,
      code: "NO_USER",
      message: "Session expired. Please log in again.",
      action: "/login"
    };
  }

  try {
    const buyResponse = await fetchAugmontBuyOrders({ uniqueId });
    if (!buyResponse?.ok) {
      return {
        ok: false,
        code: "LIMIT_CHECK_FAILED",
        message: buyResponse?.message || "Could not verify purchase limit. Try again.",
        blocking: true
      };
    }

    const fyLimit = getKycLimit(activeProfile, kycProfile);
    const fyTotal = sumFinancialYearPurchases(buyResponse.orders);
    if (fyTotal + paidAmount > fyLimit) {
      const remaining = Math.max(0, fyLimit - fyTotal);
      return {
        ok: false,
        code: "FY_LIMIT",
        message: verified
          ? `Financial-year limit reached. Remaining: ₹${remaining.toLocaleString("en-IN")}.`
          : `Without KYC you can buy up to ₹${NON_KYC_FY_LIMIT.toLocaleString("en-IN")}/year. Remaining: ₹${remaining.toLocaleString("en-IN")}. Complete KYC for higher limits.`,
        action: verified ? null : "/kyc",
        remaining
      };
    }
  } catch {
    return {
      ok: false,
      code: "LIMIT_CHECK_FAILED",
      message: "Could not verify purchase limit. Check connection and retry.",
      blocking: true
    };
  }

  return { ok: true, verified, kycProfile };
}

export function checkSellBankReady(banks = []) {
  const list = Array.isArray(banks) ? banks : [];
  if (list.length === 0) {
    return {
      ok: false,
      code: "NO_BANK",
      message: "Add a bank account to receive sell payouts.",
      action: "/bank"
    };
  }
  const primary =
    list.find((b) => b?.isPrimary || b?.is_primary) ||
    list[0];
  const bankId = String(
    primary?.userBankId || primary?.bankId || primary?.provider_bank_id || primary?.id || ""
  ).trim();
  if (!bankId) {
    return {
      ok: false,
      code: "INVALID_BANK",
      message: "Primary bank is invalid. Update it in Payment Methods.",
      action: "/bank"
    };
  }
  return { ok: true, bank: primary, bankId };
}
