"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import toast from "react-hot-toast";
import { getUserProfile } from "../api/authApi";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import {
  createAugmontBuyOrder,
  createAugmontSellOrder,
  fetchAugmontBuyInvoice,
  fetchAugmontSellInvoice,
  fetchAugmontRateHistory,
  fetchAugmontSipRates,
  fetchAugmontUserBanks,
  fetchLiveGoldRateSnapshot,
  getAugmontSession,
  getAugmontUser
} from "../api/augmontApi";
import { prepareAugmontOrderContext } from "../utils/augmontOrderContext";

import { buildBuyInvoicePdf, buildSellInvoicePdf } from "../utils/augmontInvoicePdf";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const cardAnimation = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.2, duration: 0.6 }
  })
};

const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);
const PRIMARY_BANK_ID_KEY = "primaryBankId";
const getStoredPrimaryBankId = () => String(localStorage.getItem(PRIMARY_BANK_ID_KEY) || "").trim();
const getStoredPrimaryBank = () => {
  try { return JSON.parse(localStorage.getItem("primaryBank") || "null"); } catch { return null; }
};

const getDateRange = () => {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 20);
  return {
    fromDate: fromDate.toISOString().slice(0, 10),
    toDate: toDate.toISOString().slice(0, 10)
  };
};

function GoldPriceWidget() {
  const [metalType, setMetalType] = useState("gold");
  const [chartData, setChartData] = useState([]);
  const [liveRates, setLiveRates] = useState({
    gold: { currentPrice: 0, buyPrice: 0, sellPrice: 0 },
    silver: { currentPrice: 0, buyPrice: 0, sellPrice: 0 },
    updatedAt: ""
  });
  // TC4 FIX: blockId stored separately — it lives at snapshot root, not inside metal sub-objects
  const [blockId, setBlockId] = useState("");

  const [sipRates, setSipRates] = useState({
    gold: { currentPrice: 0, buyPrice: 0 },
    silver: { currentPrice: 0, buyPrice: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [buyTradeMode, setBuyTradeMode] = useState("quantity");
  const [buyQuantity, setBuyQuantity] = useState("0.1000");
  const [buyAmount, setBuyAmount] = useState("");
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyMessage, setBuyMessage] = useState("");
  const [buyError, setBuyError] = useState("");
  const [buyResult, setBuyResult] = useState({});
  const [buyTransactionId, setBuyTransactionId] = useState("");
  const [buyInvoiceLoading, setBuyInvoiceLoading] = useState(false);
  const [buyInvoiceError, setBuyInvoiceError] = useState("");
  const [buyInvoiceResult, setBuyInvoiceResult] = useState({});
  const [sellQuantity, setSellQuantity] = useState("0.0500");
  const [sellAccountName, setSellAccountName] = useState(() => {
    try {
      const b = JSON.parse(localStorage.getItem("primaryBank") || "{}");
      return b.accountName || "";
    } catch { return ""; }
  });
  const [sellAccountNumber, setSellAccountNumber] = useState(() => {
    try {
      const b = JSON.parse(localStorage.getItem("primaryBank") || "{}");
      return b.accountNumber || "";
    } catch { return ""; }
  });
  const [sellIfscCode, setSellIfscCode] = useState(() => {
    try {
      const b = JSON.parse(localStorage.getItem("primaryBank") || "{}");
      return b.ifscCode || "";
    } catch { return ""; }
  });
  const [selectedBank, setSelectedBank] = useState(null);
  const [bankLoading, setBankLoading] = useState(true);
  const [bankError, setBankError] = useState("");
  const [sellLoading, setSellLoading] = useState(false);
  const [sellMessage, setSellMessage] = useState("");
  const [sellError, setSellError] = useState("");
  const [sellResult, setSellResult] = useState({});
  const [sellTransactionId, setSellTransactionId] = useState("");
  const [sellInvoiceLoading, setSellInvoiceLoading] = useState(false);
  const [sellInvoiceError, setSellInvoiceError] = useState("");
  const [sellInvoiceResult, setSellInvoiceResult] = useState({});
  const [activeLiveAction, setActiveLiveAction] = useState("");
  const [activeSipAction, setActiveSipAction] = useState("");
  const [activeInvoiceModal, setActiveInvoiceModal] = useState(null);

  const profileUniqueId = String(
    getAugmontUser()?.uniqueId || getUserProfile()?.uniqueId || ""
  ).trim();

  const loadRates = useCallback(async ({ forceRates = false } = {}) => {
    setIsLoading(true);
    setError("");

    const { fromDate, toDate } = getDateRange();
    const [liveResponse, historyResponse, sipResponse] = await Promise.all([
      fetchLiveGoldRateSnapshot({ force: forceRates }),
      fetchAugmontRateHistory({ fromDate, toDate, metalType, force: forceRates }),
      fetchAugmontSipRates(undefined, { force: forceRates })
    ]);

    if (!liveResponse?.ok && !historyResponse?.ok && !sipResponse?.ok) {
      setError(
        liveResponse?.message ||
          historyResponse?.message ||
          sipResponse?.message ||
          "Unable to load Augmont rates"
      );
      setChartData([]);
      setIsLoading(false);
      return;
    }

    if (liveResponse?.ok) {
      setLiveRates(liveResponse.snapshot);
      // TC4 FIX: extract blockId from snapshot root — it is NOT inside gold/silver sub-objects
      setBlockId(String(liveResponse.snapshot?.blockId || "").trim());
    }

    if (historyResponse?.ok) {
      setChartData(historyResponse.history || []);
    } else {
      setChartData([]);
    }

    if (sipResponse?.ok) {
      setSipRates(sipResponse.snapshot);
    }

    setIsLoading(false);
  }, [metalType]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { loadRates(); }, 0);
    // Auto-refresh every 30 seconds.
    const intervalId = window.setInterval(
      () => loadRates({ forceRates: true }),
      30000
    );
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [loadRates]);

  const selectedLiveRates = liveRates?.[metalType] || {};

  const priceChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = chartData[0]?.price || 0;
    const last = chartData[chartData.length - 1]?.price || 0;
    if (!first) return 0;
    return ((last - first) / first) * 100;
  }, [chartData]);

  const chartRange = useMemo(() => {
    if (!chartData.length) return [0, 100];
    const prices = chartData.map((point) => point.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = Math.max((max - min) * 0.25, 5);
    return [Math.max(0, min - padding), max + padding];
  }, [chartData]);

  const generateAugmontTxnId = (prefix) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const handleBuyOrder = async () => {
    setBuyLoading(true);
    setBuyError("");
    setBuyMessage("");
    setBuyResult({});
    setBuyInvoiceResult({});
    setBuyInvoiceError("");
    setBuyTransactionId("");
    setActiveInvoiceModal(null);

    try {
      const orderContext = await prepareAugmontOrderContext("buy");
      const lockPrice = Number(orderContext.rate || selectedLiveRates.buyPrice || 0);
      const quantityValue = Number.parseFloat(buyQuantity || "0");
      const amountValue = Number.parseFloat(buyAmount || "0");
      const useQuantity = buyTradeMode === "quantity";
      const quantity = useQuantity
        ? quantityValue
        : lockPrice > 0
        ? amountValue / lockPrice
        : 0;

      if (!(lockPrice > 0)) {
        throw new Error("Live buy rate is required.");
      }

      if (!(quantity > 0)) {
        throw new Error(useQuantity ? "Enter a valid quantity to buy." : "Enter a valid amount to buy.");
      }

      const merchantTransactionId = `KTL-BUY-${Date.now()}`;
      const response = await createAugmontBuyOrder({
        request: {
          merchantTransactionId,
          uniqueId: orderContext.uniqueId,
          lockPrice: lockPrice.toFixed(2),
          metalType: "gold",
          quantity: quantity.toFixed(4),
          modeOfPayment: "wallet",
          blockId: orderContext.blockId
        }
      });

      if (!response?.ok) {
        throw new Error(response?.message || "Unable to place buy order.");
      }

      setBuyResult(response.order || {});
      setBuyTransactionId(
        response.order?.transactionId || response.order?.merchantTransactionId || merchantTransactionId
      );
      setBuyMessage("Buy order placed successfully.");
    } catch (error) {
      setBuyError(error?.message || "Unable to place buy order.");
    } finally {
      setBuyLoading(false);
    }
  };

  const handleBuyInvoice = async () => {
    setBuyInvoiceLoading(true);
    setBuyInvoiceError("");

    const transactionId = String(
      buyTransactionId || buyResult?.transactionId || buyResult?.merchantTransactionId || ""
    ).trim();

    if (!transactionId) {
      setBuyInvoiceLoading(false);
      setBuyInvoiceError("Buy transaction id is not available for invoice.");
      return;
    }

    const response = await fetchAugmontBuyInvoice({ transactionId });
    setBuyInvoiceLoading(false);

    if (!response?.ok) {
      setBuyInvoiceError(response?.message || "Unable to fetch buy invoice.");
      return;
    }

    const invoice = response.invoice || {};
    const invoiceData =
      invoice?.payload?.result?.data ||
      invoice?.result?.data ||
      invoice?.data ||
      invoice;
    setBuyInvoiceResult(invoiceData);
    setActiveInvoiceModal({ type: "buy", data: invoiceData });
    if (invoiceData?.transactionId) {
      buildBuyInvoicePdf(invoiceData);
    }
  };

  const handleSellOrder = async () => {
    setSellLoading(true);
    setSellError("");
    setSellMessage("");
    setSellResult({});
    setSellInvoiceResult({});
    setSellInvoiceError("");
    setSellTransactionId("");
    setActiveInvoiceModal(null);

    const uniqueId = String(getAugmontUser()?.uniqueId || "").trim();
    const quantityValue = Number.parseFloat(sellQuantity || "0");
    const userBankId = String(
      selectedBank?.userBankId || selectedBank?.bankId || selectedBank?.id || ""
    ).trim();

    if (!uniqueId) {
      setSellLoading(false);
      setSellError("User profile not found. Please log in again.");
      return;
    }

    if (!(quantityValue > 0)) {
      setSellLoading(false);
      setSellError("Enter a valid quantity to sell.");
      return;
    }

    if (!selectedBank || !userBankId) {
      setSellLoading(false);
      setSellError("Please add bank details in Profile before selling.");
      return;
    }

    const request = {
      uniqueId,
      metalType: "gold",
      quantity: quantityValue.toFixed(4),
      userBankId
    };

    const response = await createAugmontSellOrder({
      merchantId: getAugmontSession()?.merchantId,
      request
    });
    setSellLoading(false);

    if (!response?.ok) {
      setSellError(response?.message || "Unable to create sell order.");
      return;
    }

    const order = response.order || {};
    const transactionId = String(
      order?.transactionId || order?.merchantTransactionId || ""
    ).trim();

    setSellMessage(response.message || "Sell order created successfully.");
    setSellResult(order);
    setSellTransactionId(transactionId);
  };

  useEffect(() => {
    const loadBanks = async () => {
      setBankLoading(true);
      setBankError("");

      if (!profileUniqueId) {
        setBankError("Please add bank details in Profile before selling.");
        setBankLoading(false);
        return;
      }

      const response = await fetchAugmontUserBanks(profileUniqueId);
      if (!response?.ok || !response.banks?.length) {
        setBankError("Please add bank details in Profile before selling.");
        setBankLoading(false);
        return;
      }

      const storedPrimaryBankId = getStoredPrimaryBankId();
      const storedPrimaryBank = getStoredPrimaryBank();

      const primaryBank =
        response.banks.find(
          (bank) =>
            storedPrimaryBankId &&
            String(bank?.userBankId || bank?.bankId || bank?.id || "") === storedPrimaryBankId
        ) ||
        response.banks.find(
          (bank) =>
            storedPrimaryBank &&
            String(bank.accountNumber || "").replace(/\s/g, "") ===
              String(storedPrimaryBank.accountNumber || "").replace(/\s/g, "")
        ) ||
        response.banks[0];

      setSelectedBank(primaryBank);
      setSellAccountName(String(primaryBank.accountName || "").trim());
      setSellAccountNumber(String(primaryBank.accountNumber || "").replace(/\s/g, ""));
      setSellIfscCode(String(primaryBank.ifscCode || "").trim().toUpperCase());
      setBankLoading(false);
    };

    loadBanks();
  }, [profileUniqueId]);

  const handleSellInvoice = async () => {
    setSellInvoiceLoading(true);
    setSellInvoiceError("");

    const transactionId = String(
      sellTransactionId || sellResult?.transactionId || sellResult?.merchantTransactionId || ""
    ).trim();

    if (!transactionId) {
      setSellInvoiceLoading(false);
      setSellInvoiceError("Sell transaction id is not available for invoice.");
      return;
    }

    const response = await fetchAugmontSellInvoice({ transactionId });
    setSellInvoiceLoading(false);

    if (!response?.ok) {
      setSellInvoiceError(response?.message || "Unable to fetch sell invoice.");
      return;
    }

    const invoice = response.invoice || {};
    const invoiceData =
      invoice?.payload?.result?.data ||
      invoice?.result?.data ||
      invoice?.data ||
      invoice;
    setSellInvoiceResult(invoiceData);
    setActiveInvoiceModal({ type: "sell", data: invoiceData });
    if (invoiceData?.transactionId) {
      buildSellInvoicePdf(invoiceData);
    }
  };

  const liveRateCards = [
    {
      title: `${metalType === "gold" ? "Gold" : "Silver"} Spot`,
      price: formatCurrency(selectedLiveRates.currentPrice || 0),
      sub: "/unit",
      extra: `${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(2)}%`,
      color: priceChange >= 0 ? "text-green-400" : "text-red-400"
    },
    {
      title: "Live Buy Rate",
      price: formatCurrency(selectedLiveRates.buyPrice || 0),
      sub: "/unit"
    },
    {
      title: "Live Sell Rate",
      // TC4 FIX: show explicit fallback text if sell rate is zero instead of ₹0.00
      price: selectedLiveRates.sellPrice > 0
        ? formatCurrency(selectedLiveRates.sellPrice)
        : "Refreshing…",
      sub: "/unit"
    }
  ];

  const sipRateCards = [
    {
      title: "Gold SIP",
      price: formatCurrency(sipRates.gold?.buyPrice || 0),
      sub: "/unit",
      extra: "Augmont SIP"
    },
    {
      title: "Silver SIP",
      price: formatCurrency(sipRates.silver?.buyPrice || 0),
      sub: "/unit",
      extra: "Augmont SIP"
    }
  ];

  const actionButtons = ["Buy", "Sell"];

  const renderInvoicePanel = (invoiceResult, invoiceType) => {
    if (!invoiceResult || Object.keys(invoiceResult).length === 0) return null;

    const invoiceFields = [
      ["Name", invoiceResult?.userInfo?.name],
      ["Address", invoiceResult?.userInfo?.address],
      ["City", invoiceResult?.userInfo?.city],
      ["State", invoiceResult?.userInfo?.state],
      ["Pincode", invoiceResult?.userInfo?.pincode],
      ["Email", invoiceResult?.userInfo?.email],
      ["Mobile Number", invoiceResult?.userInfo?.mobileNumber],
      ["Unique ID", invoiceResult?.userInfo?.uniqueId],
      ["Transaction ID", invoiceResult?.transactionId]
    ];

    const purchaseFields = [
      ["Quantity", invoiceResult?.quantity],
      ["Metal Type", invoiceResult?.metalType],
      ["HSN Code", invoiceResult?.hsnCode],
      ["Rate", invoiceResult?.rate],
      ["Unit Type", invoiceResult?.unitType],
      ["Gross Amount", invoiceResult?.grossAmount],
      ["Net Amount", invoiceResult?.netAmount]
    ];

    return (
      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-yellow-500/15 bg-[linear-gradient(180deg,rgba(26,22,12,0.98),rgba(9,9,9,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="border-b border-white/10 bg-[linear-gradient(90deg,rgba(250,204,21,0.12),rgba(255,255,255,0.02))] px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-yellow-300/90">
                {invoiceType === "sell" ? "Sell Invoice" : "Buy Invoice"}
              </p>
              <h4 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                {String(invoiceResult?.invoiceNumber || "Invoice fetched successfully")}
              </h4>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Date</p>
                <p className="mt-2 text-sm font-medium text-white/80">
                  {String(invoiceResult?.invoiceDate || "-")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveInvoiceModal(null)}
                className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-white/70 transition hover:border-yellow-500/30 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Customer</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {String(invoiceResult?.userInfo?.name || "-")}
              </p>
              <p className="mt-2 text-sm text-white/60">
                {String(invoiceResult?.userInfo?.mobileNumber || "-")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Transaction</p>
              {/* TC23 & TC59: break-words ensures full ID is always visible */}
              <p className="mt-3 break-words font-mono text-xs leading-5 font-medium text-white">
                {String(invoiceResult?.transactionId || "-")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Net Amount</p>
              <p className="mt-3 text-2xl font-semibold text-yellow-300">
                {String(invoiceResult?.netAmount || "-")}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-300/85">Customer Details</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {invoiceFields.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{label}</p>
                  <p className="mt-2 break-words font-mono text-xs leading-5 text-white">{String(value || "-")}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-300/85">Purchase Details</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {purchaseFields.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{label}</p>
                  <p className="mt-2 break-words text-sm font-medium text-white">{String(value || "-")}</p>
                </div>
              ))}
            </div>
          </div>

          {Array.isArray(invoiceResult?.taxes?.taxSplit) ? (
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-yellow-300/85">Taxes</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Total Tax Amount</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {String(invoiceResult?.taxes?.totalTaxAmount || "-")}
                  </p>
                </div>
                {invoiceResult.taxes.taxSplit.map((tax, index) => (
                  <div
                    key={`${tax?.type || "tax"}-${index}`}
                    className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-4"
                  >
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                      {String(tax?.type || `Tax ${index + 1}`)}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {String(tax?.taxAmount || "-")}
                    </p>
                    <p className="mt-1 text-xs text-white/45">{String(tax?.taxPerc || "-")}%</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end border-t border-white/10 pt-2">
            <button
              type="button"
              onClick={() => setActiveInvoiceModal(null)}
              className="rounded-full bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
            >
              Close Invoice
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="bg-black py-10 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <Motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <p className="font-semibold tracking-wider text-yellow-500">MARKET DATA</p>
          <h2 className="mt-2 text-4xl font-bold lg:text-5xl">
            Augmont <span className="text-yellow-400">Rates</span>
          </h2>
          <p className="mt-3 text-gray-400">
            Live rates, SIP rates, and trend history from the backend wrapper APIs
          </p>
        </Motion.div>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex rounded-full border border-white/10 bg-[#111] p-1">
            {["gold", "silver"].map((metal) => (
              <button
                key={metal}
                onClick={() => setMetalType(metal)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  metalType === metal
                    ? "bg-yellow-500 text-black"
                    : "text-white/65 hover:text-white"
                }`}
              >
                {metal}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-sm text-white/55">
            {/* TC4 FIX: show blockId status so QA can confirm it's loaded */}
            {blockId
              ? <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">Rate block active</span>
              : <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs text-yellow-400">Fetching block ID…</span>
            }
            {liveRates.updatedAt ? <span>Updated live from backend</span> : null}
            <button
              onClick={loadRates}
              className="rounded-full border border-white/10 px-4 py-2 text-white/75 transition hover:border-yellow-500/30 hover:text-white"
            >
              Refresh Rates
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-[28rem] animate-pulse rounded-3xl border border-white/10 bg-[#0f0f0f]" />
              <div className="h-[28rem] animate-pulse rounded-3xl border border-white/10 bg-[#0f0f0f]" />
            </div>
            <div className="h-[26rem] animate-pulse rounded-3xl border border-white/10 bg-[#0f0f0f]" />
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <p className="text-red-300">{error}</p>
            <button
              onClick={loadRates}
              className="mt-4 rounded-full bg-yellow-500 px-6 py-3 font-semibold text-black"
            >
              Retry Rates
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <Motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,15,15,0.98),rgba(8,8,8,0.96))] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-yellow-500/80">Live Rates</p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">
                      {metalType === "gold" ? "Gold" : "Silver"} buy and sell view
                    </h3>
                  </div>
                  <span className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/55">
                    Live
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {liveRateCards.map((card, i) => (
                    <Motion.div
                      key={card.title}
                      custom={i}
                      initial="hidden"
                      whileInView="visible"
                      variants={cardAnimation}
                      className="rounded-2xl border border-white/10 bg-black/25 p-5 transition-all hover:border-yellow-500/30"
                    >
                      <p className="mb-2 text-sm text-gray-400">{card.title}</p>
                      <div className="flex min-h-[108px] flex-col justify-between gap-3">
                        <h4 className="min-w-0 break-words text-[1.25rem] font-bold leading-tight lg:text-[1.4rem] xl:text-[1.55rem]">
                          {card.price}
                          <span className="mt-2 block text-sm font-medium text-gray-400 lg:text-[0.95rem]">
                            {card.sub}
                          </span>
                        </h4>
                        {card.extra ? (
                          <span className={`text-sm font-medium ${card.color || "text-gray-400"}`}>
                            {card.extra}
                          </span>
                        ) : null}
                      </div>
                    </Motion.div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {actionButtons.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setActiveLiveAction(label.toLowerCase())}
                      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                        activeLiveAction === label.toLowerCase()
                          ? "bg-yellow-500 text-black"
                          : "border border-yellow-500/35 text-yellow-200 hover:bg-yellow-500 hover:text-black"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {activeLiveAction === "buy" ? (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Buy mode</p>
                        <p className="mt-1 text-sm text-white/70">Choose quantity or amount, not both.</p>
                      </div>
                      <div className="flex rounded-full border border-white/10 bg-[#111] p-1">
                        {["quantity", "amount"].map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setBuyTradeMode(mode)}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                              buyTradeMode === mode
                                ? "bg-yellow-500 text-black"
                                : "text-white/65 hover:text-white"
                            }`}
                          >
                            {mode === "quantity" ? "Quantity" : "Amount"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                          {buyTradeMode === "quantity" ? "Quantity" : "Amount"}
                        </p>
                        <input
                          value={buyTradeMode === "quantity" ? buyQuantity : buyAmount}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (buyTradeMode === "quantity") setBuyQuantity(value);
                            else setBuyAmount(value);
                          }}
                          placeholder={buyTradeMode === "quantity" ? "0.1000" : "1000.00"}
                          className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b0b0b] px-4 py-3 text-white outline-none"
                        />
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Lock Price</p>
                        <p className="mt-3 text-2xl font-semibold text-white">
                          {formatCurrency(selectedLiveRates.buyPrice || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleBuyOrder}
                        disabled={buyLoading}
                        className="rounded-full border border-yellow-500/35 px-5 py-2.5 text-sm font-semibold text-yellow-200 transition hover:bg-yellow-500 hover:text-black disabled:opacity-50"
                      >
                        {buyLoading ? "Please wait…" : "Continue Buy"}
                      </button>
                    </div>
                  </div>
                ) : activeLiveAction === "sell" ? (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Sell quantity</p>
                        <p className="mt-1 text-sm text-white/70">
                          Sell uses the stored profile and bank context from the backend.
                        </p>
                      </div>
                      <div className="rounded-full border border-white/10 bg-[#111] px-4 py-2 text-sm text-white/65">
                        {selectedLiveRates.sellPrice > 0
                          ? `${formatCurrency(selectedLiveRates.sellPrice)} / unit`
                          : "Loading sell rate…"}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Quantity</p>
                        <input
                          value={sellQuantity}
                          onChange={(event) => setSellQuantity(event.target.value)}
                          placeholder="0.0500"
                          className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b0b0b] px-4 py-3 text-white outline-none"
                        />
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Lock Price</p>
                        <p className="mt-3 text-2xl font-semibold text-white">
                          {selectedLiveRates.sellPrice > 0
                            ? formatCurrency(selectedLiveRates.sellPrice)
                            : "Refreshing…"}
                        </p>
                      </div>
                    </div>

                    {bankError && (
                      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
                        {bankError}
                      </div>
                    )}
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Account Name</p>
                        <input
                          value={sellAccountName}
                          readOnly
                          placeholder={bankLoading ? "Loading saved bank…" : "Bank details loaded from Profile"}
                          className={`mt-3 w-full rounded-xl border px-4 py-3 text-white outline-none ${sellAccountName ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-[#0b0b0b]"}`}
                        />
                        {sellAccountName && <p className="mt-1 text-[10px] text-emerald-400/70">✓ Loaded from saved profile bank</p>}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Account Number</p>
                        <input
                          value={sellAccountNumber}
                          readOnly
                          placeholder={bankLoading ? "Loading saved bank…" : "Bank details loaded from Profile"}
                          className={`mt-3 w-full rounded-xl border px-4 py-3 text-white outline-none ${sellAccountNumber ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-[#0b0b0b]"}`}
                        />
                        {sellAccountNumber && <p className="mt-1 text-[10px] text-emerald-400/70">✓ Loaded from saved profile bank</p>}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">IFSC Code</p>
                        <input
                          value={sellIfscCode}
                          readOnly
                          placeholder={bankLoading ? "Loading saved bank…" : "Bank details loaded from Profile"}
                          className={`mt-3 w-full rounded-xl border px-4 py-3 text-white outline-none ${sellIfscCode ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-[#0b0b0b]"}`}
                        />
                        {sellIfscCode && <p className="mt-1 text-[10px] text-emerald-400/70">✓ Loaded from saved profile bank</p>}
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleSellOrder}
                        disabled={
                          sellLoading ||
                          bankLoading ||
                          !selectedBank ||
                          !blockId ||
                          !(selectedLiveRates.sellPrice > 0)
                        }
                        className="rounded-full border border-yellow-500/35 px-5 py-2.5 text-sm font-semibold text-yellow-200 transition hover:bg-yellow-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sellLoading
                          ? "Please wait…"
                          : bankLoading
                          ? "Loading bank details…"
                          : !selectedBank
                          ? "Add bank in Profile"
                          : !blockId
                          ? "Waiting for rate block…"
                          : "Continue Sell"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </Motion.div>

              <Motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,15,15,0.98),rgba(8,8,8,0.96))] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-yellow-500/80">SIP Rates</p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">Regular accumulation view</h3>
                  </div>
                  <span className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/55">
                    SIP
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {sipRateCards.map((card, i) => (
                    <Motion.div
                      key={card.title}
                      custom={i}
                      initial="hidden"
                      whileInView="visible"
                      variants={cardAnimation}
                      className="rounded-2xl border border-white/10 bg-black/25 p-5 transition-all hover:border-yellow-500/30"
                    >
                      <p className="mb-2 text-sm text-gray-400">{card.title}</p>
                      <div className="flex min-h-[108px] flex-col justify-between gap-3">
                        <h4 className="min-w-0 break-words text-[1.25rem] font-bold leading-tight lg:text-[1.4rem] xl:text-[1.55rem]">
                          {card.price}
                          <span className="mt-2 block text-sm font-medium text-gray-400 lg:text-[0.95rem]">
                            {card.sub}
                          </span>
                        </h4>
                        {card.extra ? (
                          <span className="text-sm font-medium text-gray-400">{card.extra}</span>
                        ) : null}
                      </div>
                    </Motion.div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {actionButtons.map((label) => (
                    <button
                      key={`${label}-sip`}
                      type="button"
                      onClick={() => setActiveSipAction(label.toLowerCase())}
                      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                        activeSipAction === label.toLowerCase()
                          ? "bg-yellow-500 text-black"
                          : "border border-yellow-500/35 text-yellow-200 hover:bg-yellow-500 hover:text-black"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {activeSipAction === "buy" ? (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Buy mode</p>
                        <p className="mt-1 text-sm text-white/70">Choose quantity or amount, not both.</p>
                      </div>
                      <div className="flex rounded-full border border-white/10 bg-[#111] p-1">
                        {["quantity", "amount"].map((mode) => (
                          <button
                            key={`sip-${mode}`}
                            type="button"
                            onClick={() => setBuyTradeMode(mode)}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                              buyTradeMode === mode
                                ? "bg-yellow-500 text-black"
                                : "text-white/65 hover:text-white"
                            }`}
                          >
                            {mode === "quantity" ? "Quantity" : "Amount"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                          {buyTradeMode === "quantity" ? "Quantity" : "Amount"}
                        </p>
                        <input
                          value={buyTradeMode === "quantity" ? buyQuantity : buyAmount}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (buyTradeMode === "quantity") setBuyQuantity(value);
                            else setBuyAmount(value);
                          }}
                          placeholder={buyTradeMode === "quantity" ? "0.1000" : "1000.00"}
                          className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b0b0b] px-4 py-3 text-white outline-none"
                        />
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Lock Price</p>
                        <p className="mt-3 text-2xl font-semibold text-white">
                          {formatCurrency(
                            metalType === "gold"
                              ? sipRates.gold?.buyPrice || 0
                              : sipRates.silver?.buyPrice || 0
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleBuyOrder}
                        className="rounded-full border border-yellow-500/35 px-5 py-2.5 text-sm font-semibold text-yellow-200 transition hover:bg-yellow-500 hover:text-black"
                      >
                        Continue Buy
                      </button>
                    </div>
                  </div>
                ) : activeSipAction === "sell" ? (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Sell quantity</p>
                        <p className="mt-1 text-sm text-white/70">
                          Sell uses the stored profile and bank context from the backend.
                        </p>
                      </div>
                      <div className="rounded-full border border-white/10 bg-[#111] px-4 py-2 text-sm text-white/65">
                        {selectedLiveRates.sellPrice > 0
                          ? `${formatCurrency(selectedLiveRates.sellPrice)} / unit`
                          : "Loading sell rate…"}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Quantity</p>
                        <input
                          value={sellQuantity}
                          onChange={(event) => setSellQuantity(event.target.value)}
                          placeholder="0.0500"
                          className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b0b0b] px-4 py-3 text-white outline-none"
                        />
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Lock Price</p>
                        <p className="mt-3 text-2xl font-semibold text-white">
                          {selectedLiveRates.sellPrice > 0
                            ? formatCurrency(selectedLiveRates.sellPrice)
                            : "Refreshing…"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleSellOrder}
                        className="rounded-full border border-yellow-500/35 px-5 py-2.5 text-sm font-semibold text-yellow-200 transition hover:bg-yellow-500 hover:text-black"
                      >
                        Continue Sell
                      </button>
                    </div>
                  </div>
                ) : null}
              </Motion.div>
            </div>

            {buyError || buyMessage || Object.keys(buyResult).length > 0 || Object.keys(buyInvoiceResult).length > 0 ? (
              <Motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
                className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,15,15,0.98),rgba(8,8,8,0.96))] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-yellow-500/80">Buy Result</p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">
                      {buyMessage || "Buy order response"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleBuyOrder}
                    disabled={buyLoading}
                    className="rounded-full border border-yellow-500/35 px-5 py-2.5 text-sm font-semibold text-yellow-200 transition hover:bg-yellow-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {buyLoading ? "Buying..." : "Buy Again"}
                  </button>
                </div>

                {buyError ? (
                  <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
                    {buyError}
                  </div>
                ) : null}

                {buyResult && Object.keys(buyResult).length > 0 ? (
                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                        {metalType === "gold" ? "Gold Balance" : "Silver Balance"}
                      </p>
                      <p className="mt-3 text-3xl font-bold text-white">
                        {metalType === "gold"
                          ? String(buyResult?.goldBalance || "0.0000")
                          : String(buyResult?.silverBalance || "0.0000")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                        {buyTradeMode === "quantity" ? "Quantity" : "Amount"}
                      </p>
                      <p className="mt-3 text-3xl font-bold text-white">
                        {buyTradeMode === "quantity"
                          ? String(buyResult?.quantity || buyQuantity || "0.0000")
                          : String(buyAmount || buyResult?.amount || "0.00")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/45">Total Amount</p>
                      <p className="mt-3 text-3xl font-bold text-white">
                        Rs. {String(buyResult?.totalAmount || "0.00")}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleBuyInvoice}
                    disabled={buyInvoiceLoading || !buyTransactionId}
                    className="rounded-full bg-yellow-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {buyInvoiceLoading ? "Fetching Invoice..." : "Invoice"}
                  </button>
                </div>

                {buyInvoiceError ? (
                  <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
                    {buyInvoiceError}
                  </div>
                ) : null}
              </Motion.div>
            ) : null}

            {(sellError || sellMessage || Object.keys(sellResult).length > 0 || Object.keys(sellInvoiceResult).length > 0) ? (
              <Motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.08 }}
                className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,15,15,0.98),rgba(8,8,8,0.96))] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-yellow-500/80">Sell Result</p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">
                      {sellMessage || "Sell order response"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleSellOrder}
                    disabled={sellLoading}
                    className="rounded-full border border-yellow-500/35 px-5 py-2.5 text-sm font-semibold text-yellow-200 transition hover:bg-yellow-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sellLoading ? "Selling..." : "Sell Again"}
                  </button>
                </div>

                {sellError ? (
                  <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
                    {sellError}
                  </div>
                ) : null}

                {sellResult && Object.keys(sellResult).length > 0 ? (
                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                        {metalType === "gold" ? "Gold Balance" : "Silver Balance"}
                      </p>
                      <p className="mt-3 text-3xl font-bold text-white">
                        {metalType === "gold"
                          ? String(sellResult?.goldBalance || "0.0000")
                          : String(sellResult?.silverBalance || "0.0000")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/45">Quantity</p>
                      <p className="mt-3 text-3xl font-bold text-white">
                        {String(sellResult?.quantity || sellQuantity || "0.0000")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/45">Total Amount</p>
                      <p className="mt-3 text-3xl font-bold text-white">
                        Rs. {String(sellResult?.totalAmount || "0.00")}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSellInvoice}
                    disabled={sellInvoiceLoading || !sellTransactionId}
                    className="rounded-full bg-yellow-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sellInvoiceLoading ? "Fetching Invoice..." : "Invoice"}
                  </button>
                </div>

                {sellInvoiceError ? (
                  <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
                    {sellInvoiceError}
                  </div>
                ) : null}
              </Motion.div>
            ) : null}

            <Motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_38%),linear-gradient(180deg,_rgba(17,24,39,0.92),_rgba(8,8,8,0.98))] p-8"
            >
              <div className="pointer-events-none absolute inset-x-6 top-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">History Trend</h3>
                  <p className="text-sm text-gray-400">Augmont history API for {metalType}</p>
                </div>
                <span
                  className={`rounded-full px-4 py-1 text-sm ${
                    priceChange >= 0
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {priceChange >= 0 ? "Up" : "Down"} {Math.abs(priceChange).toFixed(2)}%
                </span>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 16, right: 8, left: -20, bottom: 4 }}>
                    <defs>
                      <linearGradient id="goldBars" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#d97706" stopOpacity={0.75} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} padding={{ left: 10, right: 10 }} />
                    <YAxis domain={chartRange} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} width={88} tickFormatter={(value) => currencyFormatter.format(Number(value) || 0).replace(".00", "")} />
                    <Tooltip
                      cursor={{ stroke: "rgba(255,255,255,0.2)", strokeDasharray: "4 4" }}
                      contentStyle={{ background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", color: "#fff", boxShadow: "0 18px 50px rgba(0,0,0,0.35)" }}
                      labelStyle={{ color: "#cbd5e1", marginBottom: 6 }}
                      formatter={(value) => `${formatCurrency(value)}/unit`}
                    />
                    <Bar dataKey="price" fill="url(#goldBars)" radius={[8, 8, 2, 2]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Motion.div>
          </div>
        )}
      </div>

      {activeInvoiceModal?.data ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setActiveInvoiceModal(null)}
        >
          <div
            className="flex max-h-[90vh] w-full items-center justify-center overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto w-full max-w-5xl">
              {renderInvoicePanel(activeInvoiceModal.data, activeInvoiceModal.type)}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default GoldPriceWidget;
