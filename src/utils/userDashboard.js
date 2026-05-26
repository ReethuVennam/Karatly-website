import {
  fetchAugmontBuyOrders,
  fetchAugmontKycProfile,
  fetchAugmontPassbook,
  fetchAugmontRateHistory,
  fetchAugmontUserBanks,
  fetchLiveGoldRateSnapshot,
  getAugmontUser
} from "../api/augmontApi";
import { getUserProfile, validateToken } from "../api/authApi";
import { isKycVerified } from "./kycGuards";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const resolveUniqueId = () => {
  const profile = getUserProfile() || {};
  const augmontUser = getAugmontUser() || {};
  return (
    profile.uniqueId ||
    profile.augmontUniqueId ||
    augmontUser.uniqueId ||
    localStorage.getItem("userUniqueId") ||
    ""
  );
};

const getHistoryRange = (days = 30) => {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - days);
  return {
    fromDate: fromDate.toISOString().slice(0, 10),
    toDate: toDate.toISOString().slice(0, 10)
  };
};

export async function loadUserDashboardData({
  uniqueId = resolveUniqueId(),
  forceRates = true,
  includeOrders = true
} = {}) {
  await validateToken().catch(() => {});

  const { fromDate, toDate } = getHistoryRange(30);

  const [ratesRes, goldHistoryRes, silverHistoryRes, passbookRes, kycRes, banksRes, ordersRes] =
    await Promise.all([
      fetchLiveGoldRateSnapshot({ allowNetwork: true, force: forceRates }),
      fetchAugmontRateHistory({ fromDate, toDate, metalType: "gold", allowNetwork: true, force: forceRates }),
      fetchAugmontRateHistory({ fromDate, toDate, metalType: "silver", allowNetwork: true, force: forceRates }),
      uniqueId ? fetchAugmontPassbook(uniqueId) : Promise.resolve({ ok: false }),
      uniqueId ? fetchAugmontKycProfile(uniqueId) : Promise.resolve({ ok: false }),
      uniqueId ? fetchAugmontUserBanks(uniqueId) : Promise.resolve({ ok: false }),
      uniqueId && includeOrders ? fetchAugmontBuyOrders({ uniqueId }) : Promise.resolve({ ok: false, orders: [] })
    ]);

  const snapshot = ratesRes?.snapshot || {};
  const goldBuy = toNumber(snapshot.buyPrice ?? snapshot.gold?.buyPrice);
  const goldSell = toNumber(snapshot.sellPrice ?? snapshot.gold?.sellPrice);
  const silverBuy = toNumber(snapshot.silver?.buyPrice ?? snapshot.silver?.currentPrice);
  const silverSell = toNumber(snapshot.silver?.sellPrice ?? snapshot.silver?.currentPrice);

  if (goldBuy > 0) localStorage.setItem("goldPrice", String(goldBuy));
  if (goldSell > 0) localStorage.setItem("goldSellRate", String(goldSell));
  if (silverBuy > 0) localStorage.setItem("silverPrice", String(silverBuy));

  const passbook = passbookRes?.ok ? passbookRes.passbook || {} : {};
  const goldGrams = toNumber(
    passbook.goldGrms ?? passbook.goldBalance ?? passbook.gold ?? localStorage.getItem("goldBalance"),
    0
  );
  const silverGrams = toNumber(passbook.silverGrms ?? passbook.silverBalance ?? passbook.silver, 0);

  if (goldGrams >= 0) localStorage.setItem("goldBalance", goldGrams.toFixed(4));
  if (silverGrams >= 0) localStorage.setItem("silverBalance", String(silverGrams));

  const profile = getUserProfile() || {};
  const kycProfile = kycRes?.ok ? kycRes.kycProfile || {} : {};
  const banks = banksRes?.ok ? banksRes.banks || [] : [];

  const orders = ordersRes?.ok ? ordersRes.orders || [] : [];
  const buys = orders.filter((o) => String(o.status || "").toLowerCase() !== "cancelled");
  const totalPaid = buys.reduce((s, o) => s + toNumber(o.amount), 0);
  const totalGrams = buys.reduce((s, o) => s + toNumber(o.gold ?? o.quantity), 0);
  const avgBuy = totalGrams > 0 ? totalPaid / totalGrams : goldBuy;
  const portfolioValue = goldSell > 0 ? goldGrams * goldSell : goldGrams * goldBuy;
  const invested = goldGrams * avgBuy;
  const profit = portfolioValue - invested;

  return {
    uniqueId,
    rates: {
      ok: ratesRes?.ok,
      snapshot,
      goldBuy,
      goldSell,
      silverBuy,
      silverSell,
      blockId: snapshot.blockId || "",
      message: ratesRes?.message
    },
    history: {
      gold: goldHistoryRes?.ok ? goldHistoryRes.history || [] : [],
      silver: silverHistoryRes?.ok ? silverHistoryRes.history || [] : []
    },
    passbook: { goldGrams, silverGrams, raw: passbook },
    kyc: {
      profile: kycProfile,
      verified: isKycVerified(profile, kycProfile),
      status: kycProfile?.status || profile.kycStatus || "pending"
    },
    banks,
    portfolio: {
      goldGrams,
      silverGrams,
      portfolioValue,
      invested,
      profit,
      profitPercent: invested > 0 ? (profit / invested) * 100 : 0
    },
    orders: buys
  };
}
