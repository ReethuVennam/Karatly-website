import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowDownRight, ArrowUpRight, Clock, Landmark, WalletCards } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import BuyGold from "./BuyGold";
import SellGold from "./SellGold";
import LiveMetalChart from "../components/LiveMetalChart";
import TransactionHistory from "../components/TransactionHistory";
import {
  fetchAugmontBuyOrders,
  fetchAugmontKycProfile,
  fetchAugmontPassbook,
  fetchAugmontRateHistory,
  fetchAugmontSipRates,
  fetchLiveGoldRateSnapshot,
  getAugmontUser
} from "../api/augmontApi";
import { getUserProfile } from "../api/authApi";

const PRODUCT_SELECTION_KEY = "selectedGoldProduct";

const getInitialSelectedProduct = (location) => {
  if (location.state?.selectedProduct) {
    localStorage.setItem(PRODUCT_SELECTION_KEY, JSON.stringify(location.state.selectedProduct));
    return location.state.selectedProduct;
  }
  try {
    const raw = localStorage.getItem(PRODUCT_SELECTION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getInitialTab = (location) => {
  const nextTab = new URLSearchParams(location.search).get("tab");
  return ["overview", "buy", "sell", "history", "orders"].includes(nextTab)
    ? nextTab
    : "overview";
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDisplayGrams = (value) => Number(toNumber(value).toFixed(4));

const formatMoney = (value, options = {}) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: options.minimumFractionDigits ?? 2
  });

const getDateRange = () => {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 20);
  return {
    fromDate: fromDate.toISOString().slice(0, 10),
    toDate: toDate.toISOString().slice(0, 10)
  };
};

export default function Portfolio() {
  const navigate = useNavigate();
  const location = useLocation();

  const [gold, setGold] = useState(0);
  const [value, setValue] = useState(0);
  const [invested, setInvested] = useState(0);
  const [rateHistory, setRateHistory] = useState([]);
  const [kycVerified, setKycVerified] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => getInitialTab(location));
  const [selectedProduct] = useState(() => getInitialSelectedProduct(location));

  const uniqueId = useMemo(() => {
    const augmontUser = getAugmontUser();
    const profile = getUserProfile();
    return (
      augmontUser?.uniqueId ||
      augmontUser?.customerMappedId ||
      profile?.uniqueId ||
      profile?.augmontUniqueId ||
      localStorage.getItem("userUniqueId") ||
      ""
    );
  }, []);

  useEffect(() => {
    const load = async ({ includePassbook = true, allowNetwork = true, forceRates = false } = {}) => {
      try {
        let buyRate = toNumber(localStorage.getItem("goldPrice"));
        let sellRate = toNumber(localStorage.getItem("goldSellRate"));
        const { fromDate, toDate } = getDateRange();

        const [rates, historyRes] = await Promise.all([
          fetchLiveGoldRateSnapshot({ allowNetwork, force: forceRates }),
          fetchAugmontSipRates(undefined, { allowNetwork, force: forceRates }),
          fetchAugmontRateHistory({ fromDate, toDate, metalType: "gold", allowNetwork, force: forceRates })
        ]);
        setRateHistory(historyRes?.ok ? historyRes.history || [] : []);
        setRatesLoading(false);

        buyRate = toNumber(
          rates?.snapshot?.buyPrice ??
            rates?.snapshot?.gold?.buyPrice ??
            rates?.snapshot?.currentPrice,
          buyRate
        );
        sellRate = toNumber(rates?.snapshot?.sellPrice ?? rates?.snapshot?.gold?.sellPrice);

        if (buyRate > 0) localStorage.setItem("goldPrice", String(buyRate));
        if (sellRate > 0) {
          localStorage.setItem("goldSellRate", String(sellRate));
          localStorage.setItem("goldSellRateTime", String(Date.now()));
        }

        const profile = getUserProfile() || {};
        const kycRes = uniqueId ? await fetchAugmontKycProfile(uniqueId).catch(() => null) : null;
        const kycStatus = (kycRes?.kycProfile?.status || profile.kycStatus || "").toLowerCase();
        setKycVerified(
          profile.panVerified ||
            profile.aadhaarVerified ||
            ["approved", "verified", "completed"].includes(kycStatus)
        );

        if (!includePassbook) {
          const cachedGoldGrams = toDisplayGrams(localStorage.getItem("goldBalance"));
          setGold(cachedGoldGrams);
          setValue(sellRate > 0 ? cachedGoldGrams * sellRate : 0);
          return;
        }

        let goldGrams = toDisplayGrams(localStorage.getItem("goldBalance"));
        if (uniqueId) {
          try {
            const passbookRes = await fetchAugmontPassbook(uniqueId);
            if (passbookRes?.ok) {
              const passbook = passbookRes.passbook;
              const liveBalance = toNumber(
                passbook?.goldGrms ?? passbook?.goldBalance ?? passbook?.gold ?? passbook?.metalBalance,
                goldGrams
              );
              if (liveBalance >= 0) {
                goldGrams = toDisplayGrams(liveBalance);
                localStorage.setItem("goldBalance", goldGrams.toFixed(4));
              }
            }
          } catch (error) {
            console.warn("Passbook fetch failed, using cached balance:", error);
          }
        }

        setGold(goldGrams);
        setValue(sellRate > 0 ? goldGrams * sellRate : 0);

        if (uniqueId) {
          try {
            const buyRes = await fetchAugmontBuyOrders({ uniqueId });
            const buys = (buyRes?.orders || []).filter(
              (order) => (order.status || "").toLowerCase() !== "cancelled"
            );
            const totalAmountPaid = buys.reduce((sum, order) => sum + toNumber(order.amount), 0);
            const totalGramsBought = buys.reduce((sum, order) => sum + toNumber(order.gold), 0);
            const avgBuyPrice = totalGramsBought > 0 ? totalAmountPaid / totalGramsBought : buyRate || 0;
            setInvested(goldGrams * avgBuyPrice);
          } catch (error) {
            console.warn("Order history fetch failed, using live rate fallback:", error);
            if (buyRate > 0) setInvested(goldGrams * buyRate);
          }
        } else if (buyRate > 0) {
          setInvested(goldGrams * buyRate);
        }
      } catch (error) {
        console.error("Portfolio load error:", error);
      }
    };

    load();
    const handleBalanceUpdated = () => load({ allowNetwork: false });
    window.addEventListener("goldBalanceUpdated", handleBalanceUpdated);
    const intervalId = window.setInterval(() => load({ includePassbook: false, forceRates: true }), 30 * 1000);
    return () => {
      window.removeEventListener("goldBalanceUpdated", handleBalanceUpdated);
      window.clearInterval(intervalId);
    };
  }, [uniqueId]);

  const profit = useMemo(() => value - invested, [value, invested]);
  const profitPercent = useMemo(() => {
    if (!invested) return "0.00";
    return ((profit / invested) * 100).toFixed(2);
  }, [profit, invested]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    navigate(`/portfolio?tab=${tab}`, {
      replace: true,
      state: selectedProduct ? { selectedProduct } : null
    });
  };

  if (activeTab === "buy") {
    return (
      <div className="karatly-shell min-h-screen text-white">
        <BuyGold key={selectedProduct?.id || "default-buy"} selectedProduct={selectedProduct} />
      </div>
    );
  }

  if (activeTab === "sell") {
    return (
      <div className="karatly-shell min-h-screen text-white">
        <SellGold />
      </div>
    );
  }

  const stats = [
    { label: "Portfolio value", value: `₹${formatMoney(value)}`, icon: WalletCards },
    { label: "Gold holding", value: `${gold.toFixed(4)} g`, icon: Landmark },
    { label: "Invested", value: `₹${formatMoney(invested)}`, icon: Clock }
  ];

  return (
    <div className="karatly-shell min-h-screen text-white">
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-5 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 text-sm text-white/65 transition hover:text-yellow-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          <p className="text-xs uppercase tracking-[0.22em] text-yellow-300/80">Karatly Portfolio</p>
        </div>

        <section className="karatly-panel rounded-lg p-5">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Current value</p>
              <h1 className="mt-2 text-3xl font-bold text-yellow-300 md:text-4xl">
                ₹{formatMoney(value)}
              </h1>
              <p className={`mt-2 flex items-center gap-1 text-sm ${profit >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {profit >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {profit >= 0 ? "+" : ""}₹{formatMoney(profit)} ({profitPercent}%)
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {stats.map(({ label, value: statValue, icon: Icon }) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-black/25 p-4">
                    <Icon className="h-4 w-4 text-yellow-300" />
                    <p className="mt-3 text-xs text-white/45">{label}</p>
                    <p className="mt-1 text-base font-semibold">{statValue}</p>
                  </div>
                ))}
              </div>
            </div>
            <LiveMetalChart data={rateHistory} loading={ratesLoading} metalLabel="Gold" />
          </div>
        </section>

        <nav className="mt-5 grid overflow-hidden rounded-lg border border-white/10 bg-[#14110c] text-sm sm:grid-cols-5">
          {["overview", "buy", "sell", "history", "orders"].map((tab) => (
            <button
              key={tab}
              onClick={() => (tab === "orders" ? navigate("/orders") : switchTab(tab))}
              className={`px-4 py-3 font-semibold transition ${
                activeTab === tab
                  ? "bg-gradient-to-r from-yellow-300 to-amber-500 text-black"
                  : "text-white/55 hover:text-white"
              }`}
            >
              {tab === "orders" ? "Orders" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        {activeTab === "overview" && (
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <section className="karatly-card rounded-lg p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-yellow-300/80">Quick actions</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => switchTab("buy")}
                  className="rounded-lg border border-yellow-500/25 bg-yellow-400 px-4 py-4 text-left text-black transition hover:bg-yellow-300"
                >
                  <p className="text-xs font-semibold uppercase">Instant</p>
                  <p className="mt-1 text-xl font-bold">Buy Gold</p>
                </button>
                <button
                  onClick={() => switchTab("sell")}
                  className="rounded-lg border border-white/10 bg-black/25 px-4 py-4 text-left transition hover:border-yellow-500/35"
                >
                  <p className="text-xs font-semibold uppercase text-white/45">Anytime</p>
                  <p className="mt-1 text-xl font-bold">Sell Gold</p>
                </button>
              </div>
            </section>

            <section className="karatly-card rounded-lg p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-yellow-300/80">Vault status</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span className="text-white/55">Holding</span>
                  <span className="font-semibold">{gold.toFixed(4)} g</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span className="text-white/55">Estimated value</span>
                  <span className="font-semibold">₹{formatMoney(value)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/55">KYC</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      kycVerified ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {kycVerified ? "Verified" : "Pending"}
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "history" && (
          <div className="mt-6">
            <TransactionHistory uniqueId={uniqueId} />
          </div>
        )}
      </main>
    </div>
  );
}
