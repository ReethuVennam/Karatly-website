import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getUserProfile } from "../api/authApi";
import { buildSellInvoicePdf } from "../utils/augmontInvoicePdf";
import {
  fetchAugmontUserBanks,
  fetchLiveGoldRateSnapshot,
  createAugmontSellOrder,
  fetchAugmontSellOrderDetail,
  fetchAugmontSellInvoice,
} from "../api/augmontApi";
import { prepareAugmontOrderContext } from "../utils/augmontOrderContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const formatGrams = (value) => `${Number(value || 0).toFixed(4)} g`;
const MAX_SELL_AMOUNT = 1000000;
const SELL_COOLDOWN_HOURS = 48;
const PRIMARY_BANK_ID_KEY = "primaryBankId";
const getStoredPrimaryBankId = () => String(localStorage.getItem(PRIMARY_BANK_ID_KEY) || "").trim();
const getStoredPrimaryBank = () => {
  try { return JSON.parse(localStorage.getItem("primaryBank") || "null"); } catch { return null; }
};
// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateMerchantTxnId = (uniqueId) => {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `KTL-SELL-${uniqueId}-${ts}-${rand}`;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SellGold() {
  const [goldOwned, setGoldOwned] = useState(() =>
    Number(localStorage.getItem("goldBalance") || 0)
  );
  const [grams, setGrams] = useState("1");
  const [amount, setAmount] = useState("");
  const [goldPrice, setGoldPrice] = useState(0);
  const [lockPrice, setLockPrice] = useState("");
  // FIX: store blockId from live rates snapshot
  const [blockId, setBlockId] = useState("");
  const [isRateLoading, setIsRateLoading] = useState(true);
  const [rateError, setRateError] = useState("");
  const [isSelling, setIsSelling] = useState(false);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [sellFlowStatus, setSellFlowStatus] = useState("idle");
  const [sellFlowError, setSellFlowError] = useState("");
  const [orderResult, setOrderResult] = useState(null);
  const [banks,         setBanks]         = useState([]);
  const [selectedBank,  setSelectedBank]  = useState(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const primaryBank = selectedBank; // keep compatibility

  const quickGrams = [0.5, 1, 2, 5];
  const userProfile = getUserProfile();
  const uniqueId = userProfile?.uniqueId || localStorage.getItem("augmontUniqueId") || "";
  const payout = useMemo(() => Number(amount || 0), [amount]);
  const parsedGrams = useMemo(() => Number.parseFloat(grams || "0"), [grams]);
  const hasLiveRate = goldPrice > 0;

  // ─── Load live sell rate ──────────────────────────────────────────────────

  const loadRate = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsRateLoading(true);
    const result = await fetchLiveGoldRateSnapshot({ allowNetwork: false });
    if (!result?.ok) {
      setRateError(result?.message || "Unable to fetch live sell price");
      setIsRateLoading(false);
      return false;
    }
    const nextPrice = Number(result?.snapshot?.sellPrice || 0);
    if (nextPrice <= 0) {
      setRateError("Live sell rate is unavailable. Retrying…");
      setIsRateLoading(false);
      return false;
    }
    setGoldPrice(nextPrice);
    setLockPrice(String(nextPrice));
    // FIX: capture blockId from snapshot root
    setBlockId(String(result?.snapshot?.blockId || result?.blockId || "").trim());
    setRateError("");
    const g = Number.parseFloat(grams || "0");
    if (g > 0) setAmount((g * nextPrice).toFixed(2));
    setIsRateLoading(false);
    return true;
  }, [grams]);

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

  // Load banks from local DB
  useEffect(() => {
    if (!uniqueId) return;
    fetchAugmontUserBanks(uniqueId).then(res => {
      if (res?.ok && res.banks?.length > 0) {
        setBanks(res.banks);
        const primary = res.banks.find(b => b.isPrimary === 1 || b.isPrimary === true);
        setSelectedBank(primary || res.banks[0]);
      }
    });
  }, [uniqueId]);

  // ─── Input handler ────────────────────────────────────────────────────────

  const resetFlowState = () => {
    setSellFlowStatus("idle");
    setSellFlowError("");
    setOrderResult(null);
  };

  const handleGramChange = (value) => {
    resetFlowState();
    setGrams(value);
    if (!value || !goldPrice) { setAmount(""); return; }
    const g = Number.parseFloat(value);
    if (Number.isFinite(g) && g >= 0) setAmount((g * goldPrice).toFixed(2));
  };

  // ─── Sell flow ────────────────────────────────────────────────────────────

  const handleSell = async () => {
    if (!hasLiveRate) { toast.error("Live sell rate is unavailable. Please retry."); return; }
    if (parsedGrams <= 0) { toast.error("Enter a valid gram amount."); return; }
    if (parsedGrams > goldOwned) { toast.error("You don't have enough gold to sell."); return; }
    if (!primaryBank) { toast.error("No bank account found. Please add one in Profile first."); return; }

    setIsSelling(true);
    setSellFlowError("");
    setSellFlowStatus("placing");

    let currentBank = primaryBank;
    try {
      const bankRes = await fetchAugmontUserBanks(uniqueId);
      if (bankRes?.ok && Array.isArray(bankRes.banks) && bankRes.banks.length > 0) {
        const remoteBanks = bankRes.banks;
        setBanks(remoteBanks);
        const primary = remoteBanks.find(b => b.isPrimary === 1 || b.isPrimary === true);
        currentBank = primary || remoteBanks[0];
        if (currentBank) {
          setSelectedBank(currentBank);
        }
      }
    } catch {
      // ignore bank refresh failures; use current selection as fallback
    }

    if (!currentBank) {
      const message = "No bank account found. Please add one in Profile first.";
      setSellFlowStatus("failed");
      setSellFlowError(message);
      setIsSelling(false);
      toast.error(message);
      return;
    }

    let orderContext;
    try {
      orderContext = await prepareAugmontOrderContext("sell");
    } catch (error) {
      const message = error?.message || "Could not prepare sell order. Please retry.";
      setSellFlowStatus("failed");
      setSellFlowError(message);
      setIsSelling(false);
      toast.error(message);
      return;
    }

    const liveSellRate = Number(orderContext.rate || 0);
    const liveBlockId = orderContext.blockId;
    const liveLockPrice = liveSellRate.toFixed(2);
    const livePayout = parsedGrams * liveSellRate;

    if (livePayout > MAX_SELL_AMOUNT) {
      const message = `Maximum sell amount is ${currencyFormatter.format(MAX_SELL_AMOUNT)}.`;
      setSellFlowStatus("failed");
      setSellFlowError(message);
      setIsSelling(false);
      toast.error(message);
      return;
    }

    setGoldPrice(liveSellRate);
    setLockPrice(liveLockPrice);
    setBlockId(liveBlockId);
    setAmount(livePayout.toFixed(2));
    setRateError("");

    const merchantTransactionId = generateMerchantTxnId(orderContext.uniqueId);

    const orderResponse = await createAugmontSellOrder({
      request: {
        metalType: "gold",
        quantity: parsedGrams.toFixed(4),
        uniqueId: orderContext.uniqueId,
        userBankId:
          currentBank?.userBankId ||
          currentBank?.bankId ||
          currentBank?.id ||
          "",
      },
    });

    if (!orderResponse?.ok) {
      const msg = orderResponse?.message || "Sell order failed";
      setSellFlowStatus("failed");
      setSellFlowError(msg);
      setIsSelling(false);
      toast.error(msg);
      return;
    }

    const detailResponse = await fetchAugmontSellOrderDetail({
      merchantTransactionId,
      uniqueId: orderContext.uniqueId
    });
    setIsSelling(false);

    const order = orderResponse.order || {};
    const detail = detailResponse?.order || {};

    setOrderResult({
      merchantTransactionId,
      transactionId: order?.transactionId || detail?.transactionId || "",
      grams: parsedGrams,
      payout: livePayout,
      lockPrice: liveLockPrice,
      status: detail?.status || order?.status || "Completed",
      bankAccount: primaryBank.accountNumber,
    });

    const backendGoldBalance = Number(
      order?.goldBalance ?? detail?.goldBalance ?? NaN
    );
    const updated = Number.isFinite(backendGoldBalance)
      ? backendGoldBalance
      : Math.max(0, goldOwned - parsedGrams);
    localStorage.setItem("goldBalance", updated.toFixed(4));
    setGoldOwned(updated);
    window.dispatchEvent(new Event("goldBalanceUpdated"));

    setSellFlowStatus("success");
    toast.success(`Sold ${formatGrams(parsedGrams)} gold for ${currencyFormatter.format(livePayout)}`);
  };

  // ─── Invoice ──────────────────────────────────────────────────────────────

  const handleOpenInvoice = async () => {
    const txId = orderResult?.transactionId;
    if (!txId) { toast.error("No transaction ID available yet."); return; }

    setIsLoadingInvoice(true);
    const res = await fetchAugmontSellInvoice({ transactionId: txId });
    setIsLoadingInvoice(false);

    if (!res?.ok) { toast.error(res?.message || "Invoice unavailable"); return; }

    const d =
      res?.raw?.payload?.result?.data ||
      res?.invoice?.payload?.result?.data ||
      res?.invoice?.result?.data ||
      res?.invoice?.data || {};

    if (!d?.transactionId) { toast.error("Invoice data unavailable"); return; }

    buildSellInvoicePdf(d);
  };

  // ─── Workflow steps ───────────────────────────────────────────────────────

  const workflowSteps = [
    {
      label: "Live Augmont sell rate fetched",
      done: hasLiveRate && !isRateLoading && !rateError,
      value: hasLiveRate ? `${currencyFormatter.format(goldPrice)}/g` : "Waiting for live sell rate…",
    },
    {
      label: "Augmont uniqueId available",
      done: Boolean(uniqueId),
      value: uniqueId || "Log out and log in again",
    },
    {
      label: "Bank account on file",
      done: Boolean(primaryBank),
      value: primaryBank
        ? `${primaryBank.accountName} — ****${String(primaryBank.accountNumber).slice(-4)}`
        : "No bank account — add one in Profile",
    },
    {
      label: "Sufficient gold balance",
      done: parsedGrams > 0 && parsedGrams <= goldOwned,
      value: `Available: ${formatGrams(goldOwned)} | Selling: ${formatGrams(parsedGrams)}`,
    },
    {
      label: "Max sell ≤ ₹10,00,000",
      done: payout > 0 && payout <= MAX_SELL_AMOUNT,
      value: payout > 0 ? `₹${payout.toFixed(2)}` : "Enter grams to calculate",
    },
    {
      label: "Sell order placed with Augmont",
      done: sellFlowStatus === "success",
      value: orderResult?.merchantTransactionId || "Not placed yet",
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
    <div className="space-y-6 rounded-2xl bg-[#111] p-6">
      {/* Header + live rate */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-semibold">Sell Gold</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
              Live Augmont Sell Rate
            </span>
            {isSelling && <span className="text-yellow-300">Placing sell order…</span>}
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
            <button onClick={() => loadRate()} className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-100 transition hover:bg-red-500/20">Retry</button>
          </div>
        ) : (
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-right">
            <p className="text-xs uppercase tracking-[0.24em] text-white/50">Current sell price</p>
            <p className="mt-1 text-2xl font-semibold text-yellow-300">{currencyFormatter.format(goldPrice)}/g</p>
            <button onClick={() => loadRate()} className="mt-2 rounded-lg border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70 transition hover:border-yellow-500/30 hover:text-white">
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Quick gram shortcuts */}
      <div className="flex flex-wrap gap-3">
        {quickGrams.map((g) => (
          <button key={g} onClick={() => handleGramChange(String(g))} disabled={!goldPrice}
            className="rounded-lg bg-[#222] px-4 py-2 text-sm transition hover:bg-yellow-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50">
            {g}g
          </button>
        ))}
      </div>

      {/* Input */}
      <label className="block">
        <span className="mb-2 block text-sm text-white/60">Gold quantity</span>
        <div className="flex items-center rounded-lg border border-white/10 bg-black px-3">
          <input
            type="text"
            inputMode="decimal"
            value={grams}
            onChange={(e) => handleGramChange(e.target.value)}
            onWheel={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
              }
            }}
            className="w-full bg-transparent p-3 outline-none"
            disabled={!goldPrice}
            max={goldOwned}
            step="0.0001"
          />
          <span className="text-white/50">g</span>
        </div>
        {parsedGrams > goldOwned && (
          <p className="mt-1 text-xs text-red-400">Exceeds your balance of {formatGrams(goldOwned)}</p>
        )}
      </label>

      {/* Bank account */}
      {primaryBank ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs uppercase tracking-widest text-white/40">Payout bank account</p>
          <p className="mt-2 text-sm font-medium text-white">{primaryBank.accountName}</p>
          <p className="mt-1 text-xs text-white/50">****{String(primaryBank.accountNumber).slice(-4)} · {primaryBank.ifscCode}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 text-sm text-orange-200">
          No bank account found. Add one in Profile before selling.
        </div>
      )}

      {/* 48hr cooldown notice */}
      <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4 text-xs text-amber-200/80">
        ⚠ Augmont requires a {SELL_COOLDOWN_HOURS}-hour waiting period after any buy order before selling.
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-2">
        <div className="flex justify-between text-sm text-white/60"><span>Gold available</span><span>{formatGrams(goldOwned)}</span></div>
        <div className="flex justify-between text-sm text-white/60"><span>You sell</span><span>{formatGrams(parsedGrams)}</span></div>
        <div className="flex justify-between text-sm text-white/60"><span>Sell price per gram</span><span>{currencyFormatter.format(goldPrice || 0)}/g</span></div>
        <div className="flex justify-between text-sm font-semibold text-white border-t border-white/10 pt-2">
          <span>Estimated payout</span><span>{currencyFormatter.format(payout)}</span>
        </div>
      </div>

      {/* Workflow steps */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
        <p className="text-sm font-semibold text-white">Sell flow status</p>
        <div className="mt-4 space-y-3">
          {workflowSteps.map((step) => (
            <div key={step.label} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-3">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${step.done ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/55"}`}>
                {step.done ? "✓" : "…"}
              </span>
              <div><p className="text-sm text-white">{step.label}</p><p className="mt-1 text-xs text-white/50">{step.value}</p></div>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {sellFlowError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
          {sellFlowError}
        </div>
      )}

      {/* Order result */}
      {orderResult && sellFlowStatus === "success" && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-sm font-semibold text-emerald-300 mb-3">✓ Sell order placed successfully</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-black/20 p-3">
              <p className="text-xs text-white/45">Transaction ID</p>
              <p className="mt-1 text-sm font-medium text-white break-all font-mono">{orderResult.transactionId || "Pending"}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-3">
              <p className="text-xs text-white/45">Gold sold</p>
              <p className="mt-1 text-sm font-medium text-white">{formatGrams(orderResult.grams)}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-3">
              <p className="text-xs text-white/45">Payout amount</p>
              <p className="mt-1 text-sm font-medium text-white">{currencyFormatter.format(orderResult.payout)}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-3">
              <p className="text-xs text-white/45">Rate used</p>
              <p className="mt-1 text-sm font-medium text-white">₹{orderResult.lockPrice}/g</p>
            </div>
            <div className="rounded-lg bg-black/20 p-3">
              <p className="text-xs text-white/45">To bank account</p>
              <p className="mt-1 text-sm font-medium text-white">****{String(orderResult.bankAccount).slice(-4)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid gap-3 md:grid-cols-2">
        <button onClick={handleSell}
          disabled={!hasLiveRate || isRateLoading || isSelling || parsedGrams <= 0 || parsedGrams > goldOwned || !primaryBank || payout > MAX_SELL_AMOUNT}
          className="w-full rounded-xl bg-yellow-500 py-3 font-semibold text-black transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60">
          {isSelling ? "Placing Sell Order…" : "Sell Gold"}
        </button>
        <button onClick={handleOpenInvoice} disabled={!orderResult?.transactionId || isLoadingInvoice}
          className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-emerald-100 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60">
          {isLoadingInvoice ? "Generating Invoice…" : "Download Invoice"}
        </button>
      </div>
    </div>

      {/* Bank selection modal */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#161A1F] p-6 md:rounded-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">Select Bank Account</h3>
              <button onClick={() => setShowBankModal(false)} className="text-white/30 hover:text-white/60">✕</button>
            </div>
            <div className="space-y-3">
              {banks.map((bank, i) => {
                const id = String(bank?.userBankId || bank?.bankId || bank?.id || i);
                const isSelected = selectedBank && String(
                  selectedBank?.userBankId ||
                  selectedBank?.bankId ||
                  selectedBank?.id ||
                  ""
                ) === id;
                return (
                  <button
                    key={id}
                    onClick={() => { setSelectedBank(bank); setShowBankModal(false); }}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? "border-yellow-400/40 bg-yellow-400/10"
                        : "border-white/10 bg-black/20 hover:border-white/20"
                    }`}
                  >
                    <p className="text-sm font-semibold text-white">{bank.accountName}</p>
                    <p className="text-xs text-white/50 mt-0.5">****{String(bank.accountNumber).slice(-4)} · {bank.ifscCode}</p>
                    {isSelected && <p className="text-[10px] text-yellow-400 mt-1.5">✓ Selected for settlement</p>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
