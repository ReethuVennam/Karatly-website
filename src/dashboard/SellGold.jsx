import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  Landmark,
  Loader2,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { getUserProfile } from "../api/authApi";
import { buildSellInvoicePdf } from "../utils/augmontInvoicePdf";
import {
  createAugmontSellOrder,
  fetchAugmontPrimaryUserBank,
  fetchAugmontSellInvoice,
  fetchAugmontSellOrderDetail,
  fetchAugmontUserBanks,
  fetchLiveGoldRateSnapshot,
} from "../api/augmontApi";
import { prepareAugmontOrderContext } from "../utils/augmontOrderContext";

const MAX_SELL_AMOUNT = 1000000;
const SELL_COOLDOWN_HOURS = 48;
const PRIMARY_BANK_ID_KEY = "primaryBankId";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));
const formatGrams = (value) => `${Number(value || 0).toFixed(4)} g`;
const getStoredPrimaryBankId = () => String(localStorage.getItem(PRIMARY_BANK_ID_KEY) || "").trim();

const getBankId = (bank, fallback = "") =>
  String(
    bank?.provider_bank_id ||
      bank?.userBankId ||
      bank?.bankId ||
      bank?.id ||
      fallback
  ).trim();

const normalizeBank = (bank) =>
  bank
    ? {
        ...bank,
        userBankId: getBankId(bank),
        bankId: bank?.bankId || bank?.provider_bank_id || "",
        accountName: bank?.accountName || bank?.account_holder_name || "",
        accountNumber: bank?.accountNumber || bank?.account_number || "",
        ifscCode: bank?.ifscCode || bank?.ifsc_code || "",
        isPrimary: Boolean(bank?.isPrimary || bank?.is_primary),
      }
    : null;

const generateMerchantTxnId = (uniqueId) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `KTL-SELL-${uniqueId}-${timestamp}-${random}`;
};

const stepItems = [
  ["quantity", "Amount"],
  ["review", "Review"],
  ["bank", "Payout"],
  ["success", "Sell Gold"],
];

export default function SellGold() {
  const [goldOwned, setGoldOwned] = useState(() => Number(localStorage.getItem("goldBalance") || 0));
  const [grams, setGrams] = useState("1");
  const [amount, setAmount] = useState("");
  const [goldPrice, setGoldPrice] = useState(0);
  const [isRateLoading, setIsRateLoading] = useState(true);
  const [rateError, setRateError] = useState("");
  const [isSelling, setIsSelling] = useState(false);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [sellFlowError, setSellFlowError] = useState("");
  const [orderResult, setOrderResult] = useState(null);
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [screen, setScreen] = useState("quantity");

  const userProfile = getUserProfile();
  const uniqueId = userProfile?.uniqueId || localStorage.getItem("augmontUniqueId") || "";
  const parsedGrams = useMemo(() => Number.parseFloat(grams || "0"), [grams]);
  const payout = useMemo(() => Number(amount || 0), [amount]);
  const hasLiveRate = goldPrice > 0;
  const currentStep = screen === "processing"
    ? 3
    : Math.max(0, stepItems.findIndex(([key]) => key === screen));

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
      setRateError("Live sell rate is unavailable. Retrying...");
      setIsRateLoading(false);
      return false;
    }
    setGoldPrice(nextPrice);
    setRateError("");
    const quantity = Number.parseFloat(grams || "0");
    if (quantity > 0) setAmount((quantity * nextPrice).toFixed(2));
    setIsRateLoading(false);
    return true;
  }, [grams]);

  useEffect(() => {
    loadRate();
    const handleRatesUpdated = (event) => {
      if (event?.detail?.name === "live") loadRate({ silent: true });
    };
    window.addEventListener("augmontRatesUpdated", handleRatesUpdated);
    return () => window.removeEventListener("augmontRatesUpdated", handleRatesUpdated);
  }, [loadRate]);

  useEffect(() => {
    if (!uniqueId) return;
    fetchAugmontUserBanks(uniqueId).then((response) => {
      if (response?.ok && response.banks?.length > 0) {
        const normalizedBanks = response.banks.map(normalizeBank).filter(Boolean);
        setBanks(normalizedBanks);
        const storedPrimaryBankId = getStoredPrimaryBankId();
        const primaryFromStorage = storedPrimaryBankId
          ? normalizedBanks.find((bank) => getBankId(bank) === storedPrimaryBankId)
          : null;
        const primary = primaryFromStorage || normalizedBanks.find((bank) => bank.isPrimary) || normalizedBanks[0];
        setSelectedBank(primary);
      }
    });
  }, [uniqueId]);

  const resetFlow = () => {
    setSellFlowError("");
    setOrderResult(null);
  };

  const handleGramChange = (value) => {
    resetFlow();
    setGrams(value);
    const quantity = Number.parseFloat(value || "0");
    if (!quantity || !goldPrice) {
      setAmount("");
      return;
    }
    setAmount((quantity * goldPrice).toFixed(2));
  };

  const handleSell = async () => {
    if (!hasLiveRate) return toast.error("Live sell rate is unavailable. Please retry.");
    if (parsedGrams <= 0) return toast.error("Enter a valid gram amount.");
    if (parsedGrams > goldOwned) return toast.error("You don't have enough gold to sell.");
    if (payout > MAX_SELL_AMOUNT) return toast.error(`Maximum sell amount is ${formatCurrency(MAX_SELL_AMOUNT)}.`);

    setIsSelling(true);
    setSellFlowError("");
    setScreen("processing");

    let orderContext;
    try {
      orderContext = await prepareAugmontOrderContext("sell");
    } catch (error) {
      const message = error?.message || "Could not prepare sell order. Please retry.";
      setSellFlowError(message);
      setIsSelling(false);
      setScreen("bank");
      toast.error(message);
      return;
    }

    let currentBank = selectedBank;
    try {
      const bankResponse = await fetchAugmontPrimaryUserBank({ uniqueId: orderContext.uniqueId });
      if (bankResponse?.ok && Array.isArray(bankResponse.banks) && bankResponse.banks.length > 0) {
        const normalizedBanks = bankResponse.banks.map(normalizeBank).filter(Boolean);
        currentBank = normalizedBanks.find((bank) => bank.isPrimary) || normalizedBanks[0];
        setBanks(normalizedBanks);
        setSelectedBank(currentBank);
      }
    } catch {
      currentBank = selectedBank;
    }

    const sellUserBankId = getBankId(currentBank);
    if (!sellUserBankId) {
      const message = "No primary bank account found. Please set a primary bank in Profile first.";
      setSellFlowError(message);
      setIsSelling(false);
      setScreen("bank");
      toast.error(message);
      return;
    }

    const liveSellRate = Number(orderContext.rate || 0);
    const livePayout = parsedGrams * liveSellRate;
    const merchantTransactionId = generateMerchantTxnId(orderContext.uniqueId);

    setGoldPrice(liveSellRate);
    setAmount(livePayout.toFixed(2));
    setRateError("");

    const orderResponse = await createAugmontSellOrder({
      request: {
        metalType: "gold",
        quantity: parsedGrams.toFixed(4),
        uniqueId: orderContext.uniqueId,
        userBankId: sellUserBankId,
      },
    });

    if (!orderResponse?.ok) {
      const message = orderResponse?.message || "Sell order failed";
      setSellFlowError(message);
      setIsSelling(false);
      setScreen("bank");
      toast.error(message);
      return;
    }

    const detailResponse = await fetchAugmontSellOrderDetail({
      merchantTransactionId,
      uniqueId: orderContext.uniqueId,
    });
    setIsSelling(false);

    const order = orderResponse.order || {};
    const detail = detailResponse?.order || {};

    setOrderResult({
      merchantTransactionId,
      transactionId: order?.transactionId || detail?.transactionId || "",
      grams: parsedGrams,
      payout: livePayout,
      lockPrice: liveSellRate.toFixed(2),
      status: detail?.status || order?.status || "Completed",
      bankAccount: currentBank?.accountNumber || "",
    });

    const backendGoldBalance = Number(order?.goldBalance ?? detail?.goldBalance ?? NaN);
    const updatedBalance = Number.isFinite(backendGoldBalance)
      ? backendGoldBalance
      : Math.max(0, goldOwned - parsedGrams);
    localStorage.setItem("goldBalance", updatedBalance.toFixed(4));
    setGoldOwned(updatedBalance);
    window.dispatchEvent(new Event("goldBalanceUpdated"));

    setScreen("success");
    toast.success(`Sold ${formatGrams(parsedGrams)} gold for ${formatCurrency(livePayout)}`);
  };

  const handleOpenInvoice = async () => {
    const txId = orderResult?.transactionId;
    if (!txId) return toast.error("No transaction ID available yet.");

    setIsLoadingInvoice(true);
    const response = await fetchAugmontSellInvoice({ transactionId: txId });
    setIsLoadingInvoice(false);

    if (!response?.ok) return toast.error(response?.message || "Invoice unavailable");

    const data =
      response?.raw?.payload?.result?.data ||
      response?.invoice?.payload?.result?.data ||
      response?.invoice?.result?.data ||
      response?.invoice?.data ||
      {};

    if (!data?.transactionId) return toast.error("Invoice data unavailable");
    buildSellInvoicePdf(data);
  };

  const goBack = () => {
    if (screen === "quantity") {
      window.history.back();
      return;
    }
    const previous = stepItems[Math.max(0, currentStep - 1)]?.[0] || "quantity";
    setScreen(previous === "processing" ? "bank" : previous);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,rgba(119,78,11,0.42),transparent_28rem),linear-gradient(135deg,#0a0906,#020202_48%,#201403)] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <button type="button" onClick={goBack} className="inline-flex items-center gap-2 text-sm text-white/65 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/25 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-200">
            <ShieldCheck className="h-4 w-4" />
            Secure sell checkout
          </div>
        </div>

        <section className="rounded-2xl border border-yellow-500/25 bg-black/45 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-yellow-300/70">Sell Gold</p>
              <h1 className="mt-2 text-3xl font-bold">Convert gold to cash</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/50">
                Choose amount, review payout, select bank details, then sell gold securely.
              </p>
            </div>
            <Stepper currentStep={currentStep} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
            <main>{renderStep()}</main>
            {screen !== "processing" && screen !== "success" ? (
              <SellSummary
                goldOwned={goldOwned}
                grams={parsedGrams}
                goldPrice={goldPrice}
                payout={payout}
                selectedBank={selectedBank}
                isRateLoading={isRateLoading}
                rateError={rateError}
              />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );

  function renderStep() {
    if (screen === "review") {
      return (
        <Card>
          <StepTitle eyebrow="Step 2 of 4" title="Review sell order" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <InfoTile label="Gold to sell" value={formatGrams(parsedGrams)} />
            <InfoTile label="Live sell rate" value={`${formatCurrency(goldPrice)}/g`} />
            <InfoTile label="Estimated payout" value={formatCurrency(payout)} />
            <InfoTile label="Remaining gold" value={formatGrams(Math.max(0, goldOwned - parsedGrams))} />
          </div>
          <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100/80">
            Augmont requires a {SELL_COOLDOWN_HOURS}-hour waiting period after buy orders before selling eligible gold.
          </div>
          <PrimaryButton onClick={() => setScreen("bank")}>Confirm payout bank</PrimaryButton>
        </Card>
      );
    }

    if (screen === "bank") {
      return (
        <Card>
          <StepTitle eyebrow="Step 3 of 4" title="Payout bank details" />
          <p className="mt-2 text-sm text-white/45">
            Select the bank account where your sell payout should be deposited.
          </p>
          {banks.length > 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {banks.map((bank, index) => {
                const id = getBankId(bank, index);
                const selected = selectedBank && getBankId(selectedBank) === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedBank(bank)}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected ? "border-yellow-400 bg-yellow-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-3">
                        <span className={`grid h-10 w-10 place-items-center rounded-full ${selected ? "bg-yellow-400 text-black" : "bg-white/10 text-white/50"}`}>
                          <Landmark className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block font-semibold">{bank.accountName || "Bank Account"}</span>
                          <span className="text-xs text-white/45">****{String(bank.accountNumber || "").slice(-4)} · {bank.ifscCode || "IFSC"}</span>
                        </span>
                      </span>
                      {selected ? <CheckCircle2 className="h-5 w-5 text-yellow-300" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-orange-500/20 bg-orange-500/10 p-5 text-sm text-orange-100">
              No bank account found. Add and set a primary bank in Profile before selling.
            </div>
          )}
          <button
            type="button"
            onClick={() => { window.location.href = "/profile"; }}
            className="mt-4 rounded-xl border border-yellow-500/30 px-4 py-3 text-sm font-semibold text-yellow-300 hover:bg-yellow-500/10"
          >
            Add new bank account
          </button>
          {sellFlowError ? <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{sellFlowError}</div> : null}
          <PrimaryButton disabled={!selectedBank || isSelling} onClick={handleSell}>
            {isSelling ? "Placing sell order..." : "Sell Gold"}
          </PrimaryButton>
        </Card>
      );
    }

    if (screen === "processing") {
      return (
        <Card className="lg:col-span-2">
          <StepTitle eyebrow="Step 4 of 4" title="Selling gold" />
          <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full border border-white/20">
              <Loader2 className="h-11 w-11 animate-spin text-yellow-300" />
            </div>
            <h2 className="mt-8 text-2xl font-bold">Confirming your payout</h2>
            <p className="mt-2 max-w-md text-sm text-white/45">Please wait while we place your Augmont sell order.</p>
          </div>
        </Card>
      );
    }

    if (screen === "success") {
      const resultPayout = orderResult?.payout || payout;
      const resultGrams = orderResult?.grams || parsedGrams;
      return (
        <Card className="lg:col-span-2">
          <StepTitle eyebrow="Step 4 of 4" title="Sell order complete" />
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-8 text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-yellow-400 text-black">
                <Check className="h-12 w-12" />
              </div>
              <h2 className="mt-6 text-2xl font-bold">Sell Successful</h2>
              <p className="mt-2 text-sm text-white/55">{formatGrams(resultGrams)} sold. Payout will be processed to your selected bank.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button onClick={() => window.location.href = "/dashboard"} className="rounded-xl border border-white/15 px-5 py-3 font-semibold">
                  Go Home
                </button>
                <button onClick={() => setScreen("quantity")} className="karatly-gold-button rounded-xl px-5 py-3 font-semibold">
                  Sell more
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-yellow-300">Order details</p>
              <div className="mt-4 divide-y divide-white/10">
                <SummaryRow label="Gold sold" value={formatGrams(resultGrams)} />
                <SummaryRow label="Payout" value={formatCurrency(resultPayout)} />
                <SummaryRow label="Rate" value={`${formatCurrency(orderResult?.lockPrice || goldPrice)}/g`} />
                <SummaryRow label="Bank" value={`****${String(orderResult?.bankAccount || selectedBank?.accountNumber || "").slice(-4)}`} />
                <SummaryRow label="Status" value={orderResult?.status || "Completed"} />
              </div>
              {orderResult?.transactionId ? (
                <button onClick={handleOpenInvoice} disabled={isLoadingInvoice} className="mt-5 rounded-xl border border-yellow-500/30 px-5 py-3 text-sm font-semibold text-yellow-300">
                  {isLoadingInvoice ? "Generating invoice..." : "Download invoice"}
                </button>
              ) : null}
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card>
        <StepTitle eyebrow="Step 1 of 4" title="Enter sell amount" />
        <div className="mt-6 grid gap-5 md:grid-cols-[1fr_0.9fr]">
          <div className="rounded-2xl border border-yellow-500/20 bg-[linear-gradient(135deg,rgba(15,54,53,0.8),rgba(93,66,13,0.78))] p-5">
            <p className="text-sm text-white/60">Live sell rate</p>
            <p className="mt-2 text-3xl font-bold text-yellow-300">{formatCurrency(goldPrice || 0)}/g</p>
            <p className="mt-1 text-sm text-emerald-400">{isRateLoading ? "Refreshing live rate..." : "Ready to sell"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-white/45">You sell</p>
            <label className="mt-4 flex h-14 items-center rounded-xl border border-white/15 bg-black/25 px-4 text-2xl font-bold text-yellow-300">
              <input
                type="text"
                inputMode="decimal"
                value={grams}
                onChange={(event) => handleGramChange(event.target.value)}
                className="w-full bg-transparent outline-none"
              />
              <span className="ml-3 text-base text-white/45">g</span>
            </label>
            <p className="mt-3 text-sm text-white/45">Available: {formatGrams(goldOwned)}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {[0.5, 1, 2, 5].map((quickGram) => (
            <button key={quickGram} onClick={() => handleGramChange(String(quickGram))} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/75 hover:border-yellow-400/40 hover:text-white">
              {quickGram}g
            </button>
          ))}
        </div>
        {parsedGrams > goldOwned ? <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">Exceeds your available gold balance.</div> : null}
        {rateError ? <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{rateError}</div> : null}
        <PrimaryButton disabled={!hasLiveRate || parsedGrams <= 0 || parsedGrams > goldOwned} onClick={() => setScreen("review")}>
          Review sell order
        </PrimaryButton>
      </Card>
    );
  }
}

function Stepper({ currentStep }) {
  return (
    <div className="w-full max-w-xl">
      <div className="grid grid-cols-4 gap-2">
        {stepItems.map(([, label], index) => (
          <div key={label}>
            <div className={`h-1.5 rounded-full ${index <= currentStep ? "bg-yellow-400" : "bg-white/15"}`} />
            <p className={`mt-2 text-center text-[11px] ${index <= currentStep ? "text-yellow-300" : "text-white/35"}`}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-white/10 bg-[#10110d] p-6 ${className}`}>{children}</div>;
}

function StepTitle({ eyebrow, title }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-yellow-300/75">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold">{title}</h2>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function SellSummary({ goldOwned, grams, goldPrice, payout, selectedBank, isRateLoading, rateError }) {
  return (
    <aside className="rounded-2xl border border-yellow-500/20 bg-[#17140f] p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-yellow-400 text-black">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold">Sell summary</p>
          <p className="text-xs text-white/45">{isRateLoading ? "Fetching live rate" : rateError ? "Rate needs refresh" : "Live rate ready"}</p>
        </div>
      </div>
      <div className="mt-6 divide-y divide-white/10">
        <SummaryRow label="Available gold" value={formatGrams(goldOwned)} />
        <SummaryRow label="Gold to sell" value={formatGrams(grams)} />
        <SummaryRow label="Sell rate" value={`${formatCurrency(goldPrice)}/g`} />
        <SummaryRow label="Estimated payout" value={formatCurrency(payout)} strong />
        <SummaryRow label="Payout bank" value={selectedBank ? `****${String(selectedBank.accountNumber || "").slice(-4)}` : "Not selected"} />
      </div>
      <div className="mt-6 flex items-start gap-3 rounded-xl bg-emerald-500/10 p-4 text-sm text-white/55">
        <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        Payout is sent to your selected verified bank account.
      </div>
    </aside>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className={`flex justify-between gap-4 py-3 ${strong ? "text-lg font-bold text-yellow-300" : "text-sm"}`}>
      <span className={strong ? "text-white" : "text-white/45"}>{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="karatly-gold-button mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}
