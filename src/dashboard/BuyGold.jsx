import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Landmark,
  Lock,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  createAugmontBuyOrder,
  fetchAugmontBuyInvoice,
  fetchLiveGoldRateSnapshot,
} from "../api/augmontApi";
import { buildBuyInvoicePdf } from "../utils/augmontInvoicePdf";
import { getUserProfile } from "../api/authApi";
import { prepareAugmontOrderContext } from "../utils/augmontOrderContext";
import {
  checkPurchaseAllowed,
  GST_RATE as GST,
  MIN_BUY_PRETAX
} from "../utils/kycGuards";

const MAX_BUY = 5000000;

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const stepItems = [
  ["amount", "Amount"],
  ["review", "Review"],
  ["payment", "Payment"],
  ["processing", "Processing"],
  ["success", "Done"],
];

export default function BuyGold({ embedded = false, onClose } = {}) {
  const navigate = useNavigate();
  const user = getUserProfile() || {};
  const uniqueId = user?.augmontUniqueId || user?.uniqueId || "";

  const [amount, setAmount] = useState("1000");
  const [rate, setRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [isRateLoading, setIsRateLoading] = useState(true);
  const [rateError, setRateError] = useState("");
  const [buyFlowError, setBuyFlowError] = useState("");
  const [screen, setScreen] = useState("amount");
  const [paymentMethod, setPaymentMethod] = useState("UPI");

  const loadRate = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsRateLoading(true);
    const response = await fetchLiveGoldRateSnapshot({ allowNetwork: true, force: !silent });
    if (!response?.snapshot || response.snapshot.buyPrice <= 0) {
      setRateError("Live buy rate unavailable. Please retry.");
      setIsRateLoading(false);
      return;
    }
    setRate(Number(response.snapshot.buyPrice));
    setRateError("");
    setIsRateLoading(false);
  }, []);

  useEffect(() => {
    loadRate();
    const handleRatesUpdated = (event) => {
      if (event?.detail?.name === "live") loadRate({ silent: true });
    };
    window.addEventListener("augmontRatesUpdated", handleRatesUpdated);
    return () => window.removeEventListener("augmontRatesUpdated", handleRatesUpdated);
  }, [loadRate]);

  const paidAmount = Number(amount || 0);
  const displayAmount = paidAmount || 1000;
  const displayRate = rate;
  const preTax = displayAmount / (1 + GST);
  const gstAmount = displayAmount - preTax;
  const grams = displayRate ? preTax / displayRate : 0;

  const currentStep = Math.max(0, stepItems.findIndex(([key]) => key === screen));

  const goBack = () => {
    if (screen === "amount") {
      if (embedded) {
        if (typeof onClose === "function") onClose();
        else window.dispatchEvent(new CustomEvent("closeTradeModal"));
        return;
      }
      window.history.back();
      return;
    }
    const previous = stepItems[Math.max(0, currentStep - 1)]?.[0] || "amount";
    setScreen(previous === "processing" ? "payment" : previous);
  };

  const handleBuy = async () => {
    if (!paidAmount) return toast.error("Enter amount");
    if (paidAmount > MAX_BUY) return toast.error(`Maximum buy amount is ${formatCurrency(MAX_BUY)}.`);

    const guard = await checkPurchaseAllowed({ uniqueId, amount: paidAmount, profile: user });
    if (!guard.ok) {
      toast.error(guard.message);
      if (guard.action) navigate(guard.action);
      return;
    }

    setLoading(true);
    setBuyFlowError("");
    setScreen("processing");

    try {
      const orderContext = await prepareAugmontOrderContext("buy");
      const liveRate = Number(orderContext.rate || 0);
      const livePreTax = paidAmount / (1 + GST);
      const liveGrams = liveRate ? livePreTax / liveRate : 0;
      const merchantTransactionId = `KTL-BUY-${Date.now()}`;

      setRate(liveRate);
      setRateError("");

      const response = await createAugmontBuyOrder({
        request: {
          merchantTransactionId,
          uniqueId: orderContext.uniqueId,
          lockPrice: liveRate.toFixed(2),
          metalType: "gold",
          amount: paidAmount.toFixed(2),
          modeOfPayment: "wallet",
          blockId: orderContext.blockId,
        },
      });

      if (!response?.ok) {
        const message = response?.message || "Buy failed";
        setBuyFlowError(message);
        setScreen("payment");
        toast.error(message);
        return;
      }

      const data =
        response?.raw?.payload?.result?.data ||
        response?.data?.payload?.result?.data ||
        response?.data?.result?.data ||
        response?.data?.data ||
        response?.data ||
        response;

      if (!data?.transactionId) {
        setScreen("payment");
        toast.error("Invalid transaction response");
        return;
      }

      if (data?.goldBalance) {
        localStorage.setItem("goldBalance", data.goldBalance);
        window.dispatchEvent(new Event("goldBalanceUpdated"));
      }

      setOrderResult({
        transactionId: data.transactionId,
        merchantTransactionId,
        amount: paidAmount,
        grams: liveGrams,
        rate: liveRate,
      });
      setScreen("success");
      try {
        window.dispatchEvent(new CustomEvent("tradeCompleted", { detail: { type: "buy", transactionId: data.transactionId, amount: paidAmount } }));
      } catch (err) {}
      toast.success("Gold purchased");
    } catch (error) {
      const message = error?.message || "Network error. Please try again.";
      setBuyFlowError(message);
      setScreen("payment");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvoice = async () => {
    const txId = orderResult?.transactionId;
    if (!txId) return toast.error("Missing transaction ID");

    setInvoiceLoading(true);
    try {
      const response = await fetchAugmontBuyInvoice({ transactionId: txId });
      const data =
        response?.raw?.payload?.result?.data ||
        response?.invoice?.payload?.result?.data ||
        response?.invoice?.result?.data ||
        response?.invoice?.data ||
        response?.data?.payload?.result?.data ||
        response?.data?.result?.data ||
        response?.data;

      if (!data?.transactionId) return toast.error("Invoice not ready. Try again in a moment.");
      buildBuyInvoicePdf(data);
    } catch {
      toast.error("Invoice failed");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const resetBuy = () => {
    setAmount("1000");
    setOrderResult(null);
    setBuyFlowError("");
    setPaymentMethod("UPI");
    setScreen("amount");
  };

  const outerClass = embedded
    ? "w-full text-white"
    : "min-h-screen bg-[radial-gradient(circle_at_0%_0%,rgba(119,78,11,0.42),transparent_28rem),linear-gradient(135deg,#0a0906,#020202_48%,#201403)] px-5 py-8 text-white";

  return (
    <div className={outerClass}>
      <div className={`mx-auto ${embedded ? 'max-w-3xl' : 'max-w-6xl'}`}>
        <div className="mb-6 flex items-center justify-between">
          <button type="button" onClick={goBack} className="inline-flex items-center gap-2 text-sm text-white/65 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/25 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-200">
            <ShieldCheck className="h-4 w-4" />
            BIS secured checkout
          </div>
        </div>

        <section className="rounded-2xl border border-yellow-500/25 bg-black/45 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-yellow-300/70">Buy Gold</p>
              <h1 className="mt-2 text-3xl font-bold">Complete your gold purchase</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/50">
                Choose an amount, review the gold quantity, select payment, and secure it in your vault.
              </p>
            </div>
            <Stepper currentStep={currentStep} />
          </div>

          <div className={`${embedded ? 'mt-6 grid gap-4 grid-cols-1' : 'mt-8 grid gap-6 lg:grid-cols-[1fr_320px]'}`}>
                <main>{renderStep()}</main>
                {screen !== "processing" && screen !== "success" ? (
                  <OrderSummary
                    embedded={embedded}
                    amount={displayAmount}
                    rate={displayRate}
                    grams={grams}
                    preTax={preTax}
                    gstAmount={gstAmount}
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
        <Card embedded={embedded}>
          <StepTitle embedded={embedded} eyebrow="Step 2 of 5" title="Review order" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <InfoTile embedded={embedded} label="Gold quantity" value={`${grams.toFixed(4)} g`} />
            <InfoTile embedded={embedded} label="Gold rate" value={`${formatCurrency(displayRate)}/g`} />
            <InfoTile embedded={embedded} label="Subtotal" value={formatCurrency(preTax)} />
            <InfoTile embedded={embedded} label="GST (3%)" value={formatCurrency(gstAmount)} />
          </div>
          <div className="mt-6 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-yellow-300" />
              <div>
                <p className="font-semibold">Stored in BIS-certified vault</p>
                <p className="mt-1 text-sm text-white/50">Your gold is insured and redeemable according to platform rules.</p>
              </div>
            </div>
          </div>
          <PrimaryButton embedded={embedded} onClick={() => setScreen("payment")}>Proceed to payment</PrimaryButton>
        </Card>
      );
    }

    if (screen === "payment") {
      const methods = [
        ["UPI", "Pay via any UPI app", Smartphone],
        ["Credit / Debit Card", "Visa, Mastercard, Rupay", CreditCard],
        ["Netbanking", "All major banks", Landmark],
        ["Karatly Wallet", "Balance ₹2,480.00", Wallet],
      ];
      return (
        <Card embedded={embedded}>
          <StepTitle embedded={embedded} eyebrow="Step 3 of 5" title="Choose payment method" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {methods.map(([label, description, Icon]) => (
              <button
                key={label}
                type="button"
                onClick={() => setPaymentMethod(label)}
                className={`rounded-xl border p-4 text-left transition ${
                  paymentMethod === label
                    ? "border-yellow-400 bg-yellow-500/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className={`grid h-10 w-10 place-items-center rounded-full ${paymentMethod === label ? "bg-yellow-400 text-black" : "bg-white/10 text-white/50"}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-semibold">{label}</span>
                      <span className="text-xs text-white/45">{description}</span>
                    </span>
                  </span>
                  {paymentMethod === label ? <CheckCircle2 className="h-5 w-5 text-yellow-300" /> : null}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-white/60">
            <Lock className="h-5 w-5 text-emerald-400" />
            Encrypted checkout. Payment confirmation will place the Augmont buy order.
          </div>
          {buyFlowError ? <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{buyFlowError}</div> : null}
          <PrimaryButton embedded={embedded} disabled={!rate || loading || isRateLoading} onClick={handleBuy}>
            {loading ? "Processing..." : `Pay ${formatCurrency(displayAmount)}`}
          </PrimaryButton>
        </Card>
      );
    }

    if (screen === "processing") {
      return (
        <Card embedded={embedded} className={`${embedded ? '' : 'lg:col-span-2'}`}>
          <StepTitle embedded={embedded} eyebrow="Step 4 of 5" title="Processing payment" />
          <div className={`mt-10 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 ${embedded ? 'py-8' : 'py-16'} text-center`}>
            <div className="grid h-20 w-20 place-items-center rounded-full border border-white/20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
            </div>
            <h2 className={`mt-8 ${embedded ? 'text-xl' : 'text-2xl'} font-bold`}>Securing your gold</h2>
            <p className={`mt-2 max-w-md ${embedded ? 'text-sm' : 'text-sm'} text-white/45`}>Please wait while we confirm the payment and add gold to your vault.</p>
          </div>
        </Card>
      );
    }

    if (screen === "success") {
      const resultAmount = orderResult?.amount || displayAmount;
      const resultGrams = orderResult?.grams || grams;
      return (
        <Card embedded={embedded} className={`${embedded ? '' : 'lg:col-span-2'}`}>
          <StepTitle embedded={embedded} eyebrow="Step 5 of 5" title="Purchase complete" />
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div className={`rounded-2xl border border-yellow-500/20 bg-yellow-500/10 ${embedded ? 'p-5' : 'p-8'} text-center`}>
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-yellow-400 text-black">
                <Check className="h-12 w-12" />
              </div>
              <h2 className={`mt-6 ${embedded ? 'text-xl' : 'text-2xl'} font-bold`}>Payment Successful</h2>
              <p className={`mt-2 ${embedded ? 'text-sm' : 'text-sm'} text-white/55`}>{resultGrams.toFixed(4)} g of 24K gold added to your vault.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button onClick={() => window.location.href = "/dashboard"} className="rounded-xl border border-white/15 px-5 py-3 font-semibold">
                  Go Home
                </button>
                <button onClick={resetBuy} className="karatly-gold-button rounded-xl px-5 py-3 font-semibold">
                  Buy more
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-yellow-300">Order details</p>
              <div className="mt-4 divide-y divide-white/10">
                <SummaryRow label="Amount paid" value={formatCurrency(resultAmount)} />
                <SummaryRow label="Gold purchased" value={`${resultGrams.toFixed(4)} g`} />
                <SummaryRow label="Rate" value={`${formatCurrency(orderResult?.rate || displayRate)}/g`} />
                <SummaryRow label="Order ID" value={orderResult?.transactionId ? `#${String(orderResult.transactionId).slice(-9)}` : "#AUR-8421906"} />
                <SummaryRow label="Status" value="Completed" />
              </div>
              {orderResult?.transactionId ? (
                <button onClick={handleInvoice} disabled={invoiceLoading} className="mt-5 rounded-xl border border-yellow-500/30 px-5 py-3 text-sm font-semibold text-yellow-300">
                  {invoiceLoading ? "Generating invoice..." : "Download invoice"}
                </button>
              ) : null}
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card embedded={embedded}>
        <StepTitle embedded={embedded} eyebrow="Step 1 of 5" title="Enter purchase amount" />
        <div className="mt-6 grid gap-5 md:grid-cols-[1fr_0.9fr]">
          <div className="rounded-2xl border border-yellow-500/20 bg-[linear-gradient(135deg,rgba(15,54,53,0.8),rgba(93,66,13,0.78))] p-5">
            <p className="text-sm text-white/60">24K - 999.9 Pure Gold</p>
            <p className="mt-2 text-3xl sm:text-4xl font-bold leading-tight text-yellow-300 truncate">{formatCurrency(displayRate)}/g</p>
            <p className="mt-1 text-sm text-emerald-400">{isRateLoading ? "Refreshing live rate..." : "Live rate refreshed"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-white/45">You pay</p>
            <label className={`mt-4 flex ${embedded ? 'h-12 sm:h-14 text-2xl' : 'h-16 sm:h-20 text-3xl sm:text-4xl'} items-center rounded-xl border border-white/15 bg-black/25 px-4 font-bold text-yellow-300`}>
              <span className="mr-3">₹</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value.replace(/[^\d.]/g, ""));
                  setOrderResult(null);
                  setBuyFlowError("");
                }}
                className="w-full bg-transparent outline-none"
              />
            </label>
            <p className={`mt-3 ${embedded ? 'text-xs' : 'text-sm'} text-white/45`}>Estimated gold: {grams.toFixed(4)} g</p>
          </div>
        </div>
        <div className={`mt-5 flex flex-wrap gap-3 ${embedded ? 'text-sm' : ''}`}>
          {[500, 1000, 5000, 10000].map((quickAmount) => (
            <button key={quickAmount} onClick={() => setAmount(String(quickAmount))} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/75 hover:border-yellow-400/40 hover:text-white">
              ₹{quickAmount.toLocaleString("en-IN")}
            </button>
          ))}
        </div>
        {rateError ? <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{rateError}</div> : null}
        <PrimaryButton embedded={embedded}
          disabled={!rate || isRateLoading}
          onClick={async () => {
            if (!paidAmount) return toast.error("Enter amount");
            const guard = await checkPurchaseAllowed({ uniqueId, amount: paidAmount, profile: user });
            if (!guard.ok) {
              toast.error(guard.message);
              if (guard.action) navigate(guard.action);
              return;
            }
            setScreen("review");
          }}
        >
          Review purchase
        </PrimaryButton>
      </Card>
    );
  }
}

function Stepper({ currentStep }) {
  return (
    <div className="w-full max-w-xl">
      <div className="grid grid-cols-5 gap-2">
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

function Card({ children, className = "", embedded: cardEmbedded = false }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-[#10110d] ${cardEmbedded ? 'p-3' : 'p-6'} ${className}`}>
      {children}
    </div>
  );
}

function StepTitle({ eyebrow, title, embedded: stEmbedded = false }) {
  return (
    <div>
      <p className={`text-xs uppercase tracking-[0.16em] text-yellow-300/75 ${stEmbedded ? 'text-[11px]' : ''}`}>{eyebrow}</p>
      <h2 className={`mt-2 ${stEmbedded ? 'text-xl' : 'text-2xl'} font-bold`}>{title}</h2>
    </div>
  );
}

function InfoTile({ label, value, embedded: itEmbedded = false }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.03] ${itEmbedded ? 'p-3' : 'p-4'}`}>
      <p className={`text-xs text-white/40 ${itEmbedded ? 'text-[11px]' : ''}`}>{label}</p>
      <p className={`mt-1 ${itEmbedded ? 'text-base' : 'text-lg'} font-semibold`}>{value}</p>
    </div>
  );
}

function OrderSummary({ amount, rate, grams, preTax, gstAmount, isRateLoading, rateError, embedded: osEmbedded = false }) {
  return (
    <aside className={`rounded-2xl border border-yellow-500/20 bg-[#17140f] ${osEmbedded ? 'p-4' : 'p-6'}`}>
      <div className="flex items-center gap-3">
        <div className={`grid ${osEmbedded ? 'h-9 w-9' : 'h-11 w-11'} place-items-center rounded-full bg-yellow-400 text-black`}>
          <Sparkles className={`${osEmbedded ? 'h-4 w-4' : 'h-5 w-5'}`} />
        </div>
        <div>
          <p className={`font-semibold ${osEmbedded ? 'text-base' : ''}`}>Order summary</p>
          <p className={`text-xs text-white/45 ${osEmbedded ? 'text-[11px]' : ''}`}>{isRateLoading ? "Fetching live rate" : rateError ? "Rate needs refresh" : "Live rate ready"}</p>
        </div>
      </div>
      <div className="mt-4 divide-y divide-white/10">
        <SummaryRow embedded={osEmbedded} label="Amount" value={formatCurrency(amount)} />
        <SummaryRow embedded={osEmbedded} label="Gold rate" value={`${formatCurrency(rate)}/g`} />
        <SummaryRow embedded={osEmbedded} label="Gold quantity" value={`${grams.toFixed(4)} g`} />
        <SummaryRow embedded={osEmbedded} label="Subtotal" value={formatCurrency(preTax)} />
        <SummaryRow embedded={osEmbedded} label="GST (3%)" value={formatCurrency(gstAmount)} />
        <SummaryRow embedded={osEmbedded} label="Payable" value={formatCurrency(amount)} strong />
      </div>
      <div className={`mt-4 flex items-start gap-3 rounded-xl bg-emerald-500/10 ${osEmbedded ? 'p-3 text-xs' : 'p-4 text-sm text-white/55'}`}>
        <ShieldCheck className={`mt-0.5 ${osEmbedded ? 'h-4 w-4' : 'h-5 w-5'} shrink-0 text-emerald-400`} />
        Gold is stored in an insured vault after payment success.
      </div>
    </aside>
  );
}

function SummaryRow({ label, value, strong = false, embedded: srEmbedded = false }) {
  return (
    <div className={`flex justify-between items-baseline gap-4 py-2 ${strong ? "text-lg font-bold text-yellow-300" : "text-sm text-white/45"}`}>
      <span className={strong ? "text-white" : "text-white/45"}>{label}</span>
      <span className={`text-right font-semibold whitespace-nowrap ${strong ? (srEmbedded ? 'text-xl text-yellow-300' : 'text-2xl sm:text-3xl lg:text-4xl text-yellow-300') : (srEmbedded ? 'text-sm text-white' : 'text-sm sm:text-base text-white')}`}>{value}</span>
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled = false, embedded: pbEmbedded = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`karatly-gold-button mt-6 inline-flex ${pbEmbedded ? 'h-10 px-4 text-sm' : 'h-12 px-6 text-sm'} w-full items-center justify-center gap-2 rounded-xl font-bold disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}
