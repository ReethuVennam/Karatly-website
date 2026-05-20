import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  fetchLiveGoldRateSnapshot,
  createAugmontBuyOrder,
  fetchAugmontBuyInvoice,
  fetchAugmontKycProfile,
} from "../api/augmontApi";
import { fetchAugmontBuyOrders } from "../api/augmontApi";
import { buildBuyInvoicePdf } from "../utils/augmontInvoicePdf";
import { prepareAugmontOrderContext } from "../utils/augmontOrderContext";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const GST = 0.03;
const MAX_BUY = 5000000;
const NON_KYC_FY_LIMIT = 5000;
const KYC_VERIFIED_FY_LIMIT = 500000;
const MIN_BUY_PRETAX = 5; // ₹5 exclusive of tax

const currency = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(n);

const isKycVerifiedStatus = (status = "") =>
  /approved|verified|completed/i.test(String(status));

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function BuyGold() {
  const user = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const uniqueId = user?.augmontUniqueId || user?.uniqueId || "";
  const kycVerifiedFromProfile = isKycVerifiedStatus(user?.augmontKycStatus);

  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [isRateLoading, setIsRateLoading] = useState(true);
  const [rateError, setRateError] = useState("");
  const [buyFlowStatus, setBuyFlowStatus] = useState("idle");
  const [buyFlowError, setBuyFlowError] = useState("");

  // ─────────────────────────────────────────────
  // Fetch Rate
  // ─────────────────────────────────────────────
  const loadRate = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsRateLoading(true);
    const res = await fetchLiveGoldRateSnapshot({ allowNetwork: false });
    if (!res?.snapshot || res.snapshot.buyPrice <= 0) {
      setRateError("Live buy rate unavailable. Please retry.");
      setIsRateLoading(false);
      return;
    }
    setRate(res.snapshot.buyPrice);
    // FIX: blockId lives at snapshot root, not at res root
    setRateError("");
    setIsRateLoading(false);
  }, []);

  useEffect(() => {
    loadRate();
    const handleRatesUpdated = (event) => {
      if (event?.detail?.name === "live") loadRate({ silent: true });
    };
    window.addEventListener("augmontRatesUpdated", handleRatesUpdated);
    return () => {
      window.removeEventListener("augmontRatesUpdated", handleRatesUpdated);
    };
  }, [loadRate]);

  // ─────────────────────────────────────────────
  // Calculations
  // ─────────────────────────────────────────────
  const amt = Number(amount || 0);
  const preTax = amt / (1 + GST);
  const gstAmt = amt - preTax;
  const grams = rate ? preTax / rate : 0;

  // ─────────────────────────────────────────────
  // BUY
  // ─────────────────────────────────────────────
  const handleBuy = async () => {
    if (!amt) return toast.error("Enter amount");

    // Minimum ₹5 exclusive of tax
    const preTaxCheck = amt / (1 + GST);
    if (preTaxCheck < MIN_BUY_PRETAX) {
      return toast.error(`Minimum purchase is ₹${MIN_BUY_PRETAX} exclusive of tax (₹${(MIN_BUY_PRETAX * (1 + GST)).toFixed(2)} total).`);
    }

    if (amt > MAX_BUY) {
      return toast.error(`Maximum buy amount is ${currency(MAX_BUY)}.`);
    }

    // FY purchase cap: non-KYC users are capped lower; verified users get the higher limit.
    try {
      const [buyRes, kycRes] = await Promise.all([
        fetchAugmontBuyOrders({ uniqueId }),
        uniqueId ? fetchAugmontKycProfile(uniqueId).catch(() => null) : Promise.resolve(null),
      ]);
      const liveKycStatus = kycRes?.kycProfile?.status || user?.augmontKycStatus || "";
      const fyLimit = isKycVerifiedStatus(liveKycStatus)
        ? KYC_VERIFIED_FY_LIMIT
        : NON_KYC_FY_LIMIT;
      const fyStart = new Date();
      fyStart.setMonth(3); fyStart.setDate(1); // April 1
      if (fyStart > new Date()) fyStart.setFullYear(fyStart.getFullYear() - 1);

      const fyBuys = (buyRes?.orders || []).filter(o => {
        const d = new Date(o.createdAt || o.date || 0);
        return d >= fyStart && (o.status || "").toLowerCase() !== "cancelled";
      });
      const fyTotal = fyBuys.reduce((sum, o) => sum + Number(o.amount || 0), 0);

      if (fyTotal + amt > fyLimit) {
        toast.error(`Purchase blocked. Your cumulative gold purchases this financial year will exceed ${currency(fyLimit)}. Remaining limit: ${currency(Math.max(0, fyLimit - fyTotal))}`);
        return;
      }
    } catch (e) {
      console.warn("Could not verify FY purchase limit:", e);
    }

    setLoading(true);
    setBuyFlowError("");
    setBuyFlowStatus("placing");

    try {
      const orderContext = await prepareAugmontOrderContext("buy");
      const liveRate = Number(orderContext.rate || 0);
      const liveBlockId = orderContext.blockId;
      const liveGrams = liveRate ? preTax / liveRate : 0;

      setRate(liveRate);
      setRateError("");

      const merchantTransactionId = `KTL-BUY-${Date.now()}`;

      const res = await createAugmontBuyOrder({
        request: {
          merchantTransactionId,
          uniqueId: orderContext.uniqueId,
          lockPrice: liveRate.toFixed(2),
          metalType: "gold",
          amount: amt.toFixed(2),
          modeOfPayment: "wallet",
          blockId: liveBlockId
        }
      });

      if (!res?.ok) {
        const msg = res?.message || "Buy failed";
        setBuyFlowStatus("failed");
        setBuyFlowError(msg);
        toast.error(msg);
        return;
      }

      const data =
        res?.raw?.payload?.result?.data ||
        res?.data?.payload?.result?.data ||
        res?.data?.result?.data ||
        res?.data?.data ||
        res?.data ||
        res;

      const txId = data?.transactionId;

      if (!txId) {
        toast.error("Invalid transaction response");
        setBuyFlowStatus("failed");
        return;
      }

      if (data?.goldBalance) {
        localStorage.setItem("goldBalance", data.goldBalance);
        window.dispatchEvent(new Event("goldBalanceUpdated"));
      }

      setOrderResult({
        transactionId: txId,
        merchantTransactionId,
        amount: amt,
        grams: liveGrams,
        rate: liveRate,
      });

      setBuyFlowStatus("success");
      toast.success("Gold purchased");
    } catch (error) {
      setBuyFlowStatus("failed");
      const message = error?.message || "Network error. Please try again.";
      setBuyFlowError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // INVOICE
  // ─────────────────────────────────────────────
  const handleInvoice = async () => {
    const txId = orderResult?.transactionId;
    if (!txId) return toast.error("Missing transaction ID");

    setInvoiceLoading(true);

    try {
      let attempts = 0;
      let data = null;

      while (attempts < 3 && !data) {
        const res = await fetchAugmontBuyInvoice({ transactionId: txId });

        data =
          res?.raw?.payload?.result?.data ||
          res?.invoice?.payload?.result?.data ||
          res?.invoice?.result?.data ||
          res?.invoice?.data ||
          res?.data?.payload?.result?.data ||
          res?.data?.result?.data ||
          res?.data;

        if (!data?.transactionId) {
          data = null;
          await new Promise((r) => setTimeout(r, 1500));
          attempts++;
        }
      }

      if (!data?.transactionId) {
        toast.error("Invoice not ready. Try again in a moment.");
        return;
      }

      buildBuyInvoicePdf(data);
    } catch {
      toast.error("Invoice failed");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const quickAmounts = [100, 500, 1000, 5000];

  const workflowSteps = [
    {
      label: "Live Augmont buy rate fetched",
      done: rate > 0 && !isRateLoading && !rateError,
      value: rate > 0 ? `${currency(rate)}/g` : "Waiting for live buy rate…",
    },
    {
      label: "Augmont uniqueId available",
      done: Boolean(uniqueId),
      value: uniqueId || "Log out and log in again",
    },
    {
      label: "Amount entered",
      done: amt > 0,
      value: amt > 0 ? currency(amt) : "Enter an amount above",
    },
    {
      label: "Buy order placed with Augmont",
      done: buyFlowStatus === "success",
      value: orderResult?.merchantTransactionId || "Not placed yet",
    },
  ];

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-6 rounded-2xl bg-[#111] p-6">

      {/* Header + live rate */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-semibold">Buy Gold</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-yellow-300">
              Live Augmont Buy Rate
            </span>
            {loading && <span className="text-yellow-300">Placing buy order…</span>}
          </div>
        </div>

        {isRateLoading ? (
          <div className="w-full max-w-xs animate-pulse rounded-xl border border-white/10 bg-black/40 p-4 md:w-64">
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="mt-3 h-7 w-36 rounded bg-white/10" />
          </div>
        ) : rateError ? (
          <div className="w-full max-w-sm rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
            <p>{rateError}</p>
            <button
              onClick={loadRate}
              className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-100 transition hover:bg-red-500/20"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-right">
            <p className="text-xs uppercase tracking-[0.24em] text-white/50">Current buy price</p>
            <p className="mt-1 text-2xl font-semibold text-yellow-300">{currency(rate)}/g</p>
            <button
              onClick={loadRate}
              className="mt-2 rounded-lg border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70 transition hover:border-yellow-500/30 hover:text-white"
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Quick amount shortcuts */}
      <div className="flex flex-wrap gap-3">
        {quickAmounts.map((q) => (
          <button
            key={q}
            onClick={() => { setAmount(String(q)); setBuyFlowStatus("idle"); setBuyFlowError(""); setOrderResult(null); }}
            disabled={!rate}
            className="rounded-lg bg-[#222] px-4 py-2 text-sm transition hover:bg-yellow-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            ₹{q.toLocaleString("en-IN")}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <label className="block">
        <span className="mb-2 block text-sm text-white/60">Amount to invest (₹)</span>
        <div className="flex items-center rounded-lg border border-white/10 bg-black px-3">
          <span className="text-white/50 pr-2">₹</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setBuyFlowStatus("idle"); setBuyFlowError(""); setOrderResult(null); }}
            onWheel={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
              }
            }}
            className="w-full bg-transparent p-3 outline-none"
            placeholder="Enter amount"
            disabled={!rate}
          />
        </div>
      </label>

      {/* Breakdown */}
      {amt > 0 && rate > 0 && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-2">
          <div className="flex justify-between text-sm text-white/60">
            <span>Pre-tax amount</span><span>{currency(preTax)}</span>
          </div>
          <div className="flex justify-between text-sm text-white/60">
            <span>GST (3%)</span><span>{currency(gstAmt)}</span>
          </div>
          <div className="flex justify-between text-sm text-white/60">
            <span>Buy rate</span><span>{currency(rate)}/g</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-white border-t border-white/10 pt-2">
            <span>You get</span><span>{grams.toFixed(4)} gms gold</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-white">
            <span>Total paid</span><span>{currency(amt)}</span>
          </div>
        </div>
      )}

      {/* KYC notice */}
      {!kycVerifiedFromProfile && amt > NON_KYC_FY_LIMIT && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 text-sm text-orange-200">
          ⚠ KYC verification required for purchases above {currency(NON_KYC_FY_LIMIT)}.
        </div>
      )}

      {/* Workflow steps */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
        <p className="text-sm font-semibold text-white">Buy flow status</p>
        <div className="mt-4 space-y-3">
          {workflowSteps.map((step) => (
            <div key={step.label} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-3">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${step.done ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/55"}`}>
                {step.done ? "✓" : "…"}
              </span>
              <div>
                <p className="text-sm text-white">{step.label}</p>
                <p className="mt-1 text-xs text-white/50">{step.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {buyFlowError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
          {buyFlowError}
        </div>
      )}

      {/* Order result */}
      {orderResult && buyFlowStatus === "success" && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-sm font-semibold text-emerald-300 mb-3">✓ Buy order placed successfully</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-black/20 p-3">
              <p className="text-xs text-white/45">Transaction ID</p>
              <p className="mt-1 text-sm font-medium text-white break-all font-mono">{orderResult.transactionId}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-3">
              <p className="text-xs text-white/45">Gold purchased</p>
              <p className="mt-1 text-sm font-medium text-white">{orderResult.grams.toFixed(4)} g</p>
            </div>
            <div className="rounded-lg bg-black/20 p-3">
              <p className="text-xs text-white/45">Amount paid</p>
              <p className="mt-1 text-sm font-medium text-white">{currency(orderResult.amount)}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-3">
              <p className="text-xs text-white/45">Rate</p>
              <p className="mt-1 text-sm font-medium text-white">{currency(orderResult.rate)}/g</p>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid gap-3 md:grid-cols-2">
        <button
          onClick={handleBuy}
          disabled={!rate || loading || amt <= 0}
          className="w-full rounded-xl bg-yellow-500 py-3 font-semibold text-black transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Placing Buy Order…" : "Buy Gold"}
        </button>
        <button
          onClick={handleInvoice}
          disabled={!orderResult?.transactionId || invoiceLoading}
          className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-emerald-100 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {invoiceLoading ? "Generating Invoice…" : "Download Invoice"}
        </button>
      </div>
    </div>
  );
}
