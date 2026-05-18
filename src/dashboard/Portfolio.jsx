import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BuyGold from "./BuyGold";
import SellGold from "./SellGold";
import GoldPriceChart from "../components/GoldPriceChart";
import TransactionHistory from "../components/TransactionHistory";
import {
  fetchAugmontBuyOrders,
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
    localStorage.setItem(
      PRODUCT_SELECTION_KEY,
      JSON.stringify(location.state.selectedProduct)
    );
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

  const [gold,     setGold]     = useState(0);
  const [value,    setValue]    = useState(0);
  const [invested, setInvested] = useState(0);
  const [activeTab, setActiveTab] = useState(() => getInitialTab(location));
  const [selectedProduct] = useState(() => getInitialSelectedProduct(location));

  // ── Resolve uniqueId from Augmont profile (source of truth) ────────────────
  // Priority: Augmont profile API → stored augmont user → localStorage fallbacks
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
    const load = async ({
      includePassbook = true,
      allowNetwork = true,
      forceRates = false
    } = {}) => {
      try {
        // ── Step 1: Get live rates ───────────────────────────────────────────
        // Fetch the live Augmont sell rate used for portfolio valuation.
        let buyRate = toNumber(localStorage.getItem("goldPrice"));
        let sellRate = toNumber(localStorage.getItem("goldSellRate"));

        const { fromDate, toDate } = getDateRange();
        const [rates] = await Promise.all([
          fetchLiveGoldRateSnapshot({ allowNetwork, force: forceRates }),
          fetchAugmontSipRates(undefined, { allowNetwork, force: forceRates }),
          fetchAugmontRateHistory({
            fromDate,
            toDate,
            metalType: "gold",
            allowNetwork,
            force: forceRates
          })
        ]);
        buyRate = toNumber(
          rates?.snapshot?.buyPrice ??
            rates?.snapshot?.gold?.buyPrice ??
            rates?.snapshot?.currentPrice,
          buyRate
        );
        sellRate = toNumber(
          rates?.snapshot?.sellPrice ?? rates?.snapshot?.gold?.sellPrice
        );
        if (buyRate  > 0) localStorage.setItem("goldPrice",    String(buyRate));
        if (sellRate > 0) {
          localStorage.setItem("goldSellRate",     String(sellRate));
          localStorage.setItem("goldSellRateTime", String(Date.now()));
        }

        if (!includePassbook) {
          const cachedGoldGrams = toDisplayGrams(localStorage.getItem("goldBalance"));
          setGold(cachedGoldGrams);
          setValue(sellRate > 0 ? cachedGoldGrams * sellRate : 0);
          return;
        }

        // ── Step 2: Get live gold balance from Augmont passbook (not localStorage)
        let goldGrams = toDisplayGrams(localStorage.getItem("goldBalance"));
        if (uniqueId) {
          try {
            const passbookRes = await fetchAugmontPassbook(uniqueId);
            if (passbookRes?.ok) {
              const pb = passbookRes.passbook;
              // Augmont passbook returns goldBalance / silverBalance
              const liveBalance = toNumber(
                pb?.goldGrms ?? pb?.goldBalance ?? pb?.gold ?? pb?.metalBalance,
                goldGrams
              );
              if (liveBalance >= 0) {
                goldGrams = toDisplayGrams(liveBalance);
                localStorage.setItem("goldBalance", goldGrams.toFixed(4));
              }
            }
          } catch (e) {
            console.warn("Passbook fetch failed, using cached balance:", e);
          }
        }
        setGold(goldGrams);

        // Portfolio value = passbook goldGrms * live gSell.
        setValue(sellRate > 0 ? goldGrams * sellRate : 0);

        // ── Step 4: Calculate invested amount using weighted average cost ────────
        // Net Invested = goldHeld × weightedAvgBuyPrice
        // This correctly reflects the cost basis of ONLY the gold currently held
        if (uniqueId) {
          try {
            const buyRes = await fetchAugmontBuyOrders({ uniqueId });
            const buys = (buyRes?.orders || [])
              .filter(o => (o.status || "").toLowerCase() !== "cancelled");

            // Weighted average buy price = total ₹ paid ÷ total grams bought
            const totalAmountPaid  = buys.reduce((sum, o) => sum + toNumber(o.amount), 0);
            const totalGramsBought = buys.reduce((sum, o) => sum + toNumber(o.gold), 0);
            const avgBuyPrice = totalGramsBought > 0
              ? totalAmountPaid / totalGramsBought
              : (buyRate || 0);

            // Cost basis of current holdings = grams held × avg buy price
            const costBasis = goldGrams * avgBuyPrice;
            setInvested(costBasis);
          } catch (e) {
            console.warn("Order history fetch failed, using live rate fallback:", e);
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
    const handleBalanceUpdated = () => {
      load({ allowNetwork: false });
    };
    window.addEventListener("goldBalanceUpdated", handleBalanceUpdated);
    const intervalId = window.setInterval(
      () => load({ includePassbook: false, forceRates: true }),
      30 * 1000
    );
    return () => {
      window.removeEventListener("goldBalanceUpdated", handleBalanceUpdated);
      window.clearInterval(intervalId);
    };
  }, [uniqueId]);

  const profit = useMemo(() => value - invested, [value, invested]);

  const profitPercent = useMemo(() => {
    if (!invested) return 0;
    return ((profit / invested) * 100).toFixed(2);
  }, [profit, invested]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    navigate(`/portfolio?tab=${tab}`, {
      replace: true,
      state: selectedProduct ? { selectedProduct } : null
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="font-medium text-yellow-400 transition hover:text-yellow-300"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-xl font-semibold">Portfolio</h1>
        <div />
      </div>

      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {/* Portfolio value card */}
        <div className="rounded-2xl border border-yellow-400/20 bg-gradient-to-br from-yellow-500/20 to-yellow-300/5 p-6">
          <p className="text-sm text-white/50">Portfolio Value</p>
          <h1 className="mt-2 text-4xl font-bold text-yellow-400">
            ₹{value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </h1>
          <p className={`mt-2 text-sm ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>
            {profit >= 0 ? "+" : ""}₹
            {profit.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ({profitPercent}%)
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-[#111] p-4">
            <p className="text-xs text-white/50">Gold</p>
            <h3 className="text-lg font-semibold">{gold.toFixed(4)} gms</h3>
          </div>
          <div className="rounded-xl bg-[#111] p-4">
            <p className="text-xs text-white/50">Invested</p>
            <h3 className="text-lg font-semibold">
              ₹{invested.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="rounded-xl bg-[#111] p-4">
            <p className="text-xs text-white/50">Profit</p>
            <h3 className={`text-lg font-semibold ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>
              ₹{profit.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-white/10">
          {["overview", "buy", "sell", "history", "orders"].map((tab) => (
            <button
              key={tab}
              onClick={() => tab === "orders" ? navigate("/orders") : switchTab(tab)}
              className={`pb-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? "border-b-2 border-yellow-400 text-yellow-400"
                  : "text-white/50 hover:text-white"
              }`}
            >
              {tab === "orders" ? "MY ORDERS" : tab.toUpperCase()}
            </button>
          ))}
        </div>

        {activeTab === "overview" && <GoldPriceChart />}
        {activeTab === "buy" && (
          <BuyGold
            key={selectedProduct?.id || "default-buy"}
            selectedProduct={selectedProduct}
          />
        )}
        {activeTab === "sell" && <SellGold />}

        {/* TC20/TC21: Transaction history with date+time */}
        {activeTab === "history" && (
          <TransactionHistory uniqueId={uniqueId} />
        )}
      </div>
    </div>
  );
}
