import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import { getUserProfile } from "../api/authApi";
import {
  fetchAugmontBuyInvoice,
  fetchAugmontBuyOrderDetail,
  fetchAugmontBuyOrders,
  fetchAugmontSellInvoice,
  fetchAugmontSellOrderDetail,
  fetchAugmontSellOrders,
  getAugmontOrderReferences,
  getAugmontSession,
  getAugmontUser
} from "../api/augmontApi";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));
const formatGrams = (value) => `${Number(value || 0).toFixed(4)} g`;

const formatDate = (value) => {
  if (!value) return "NA";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const getOrderKey = (order) =>
  order?.merchantTransactionId || order?.transactionId || order?.id;

const prettyJson = (value) => JSON.stringify(value || {}, null, 2);

const getEmptyStateMessage = (filter) => {
  if (filter === "SELL") return "No sell orders found.";
  if (filter === "BUY") return "No buy orders found.";
  if (filter === "SIP") return "No SIP orders found.";
  return "No Augmont orders found.";
};

// TC23 & TC59: Copyable transaction ID chip
function TxnIdCell({ value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-white/30">—</span>;

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Transaction ID copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-start gap-1.5">
      {/* Full ID always visible, wraps naturally */}
      <span className="break-all font-mono text-xs leading-5 text-white">
        {value}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-0.5 flex-shrink-0 text-white/40 transition hover:text-yellow-400"
        title="Copy Transaction ID"
      >
        {copied
          ? <Check className="h-3.5 w-3.5 text-green-400" />
          : <Copy className="h-3.5 w-3.5" />
        }
      </button>
    </div>
  );
}

export default function OrdersPage() {
  const [filter, setFilter] = useState("ALL");
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailLoadingId, setDetailLoadingId] = useState("");
  const [invoiceLoadingId, setInvoiceLoadingId] = useState("");

  const profile = getUserProfile();
  const augmontUser = getAugmontUser();
  const session = getAugmontSession();
  const storedReferences = getAugmontOrderReferences();
  const uniqueId =
    profile?.uniqueId || augmontUser?.uniqueId || storedReferences[0]?.uniqueId || "";
  const merchantId = session?.merchantId || storedReferences[0]?.merchantId || "11692";

  const loadOrders = useCallback(async () => {
    if (!uniqueId) {
      setOrders([]);
      setError("Missing Augmont uniqueId. Sign in with an Augmont-linked account to load order history.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    const [buyResponse, sellResponse] = await Promise.all([
      fetchAugmontBuyOrders({ merchantId, uniqueId }),
      fetchAugmontSellOrders({ merchantId, uniqueId })
    ]);

    if (!buyResponse.ok && !sellResponse.ok) {
      setError(
        buyResponse.message ||
          sellResponse.message ||
          "Unable to fetch Augmont order history"
      );
      setOrders([]);
      setIsLoading(false);
      return;
    }

    const combinedOrders = [
      ...(buyResponse.orders || []),
      ...(sellResponse.orders || [])
    ].sort((a, b) => {
      const first = new Date(b?.date || 0).getTime();
      const second = new Date(a?.date || 0).getTime();
      return first - second;
    });

    setOrders(combinedOrders);
    setIsLoading(false);
  }, [merchantId, uniqueId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadOrders();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadOrders]);

  const filteredOrders = useMemo(
    () =>
      filter === "ALL"
        ? orders
        : orders.filter((order) => String(order.type || "").toUpperCase() === filter),
    [filter, orders]
  );

  const fetchOrderDetail = async (order) => {
    const orderKey = getOrderKey(order);
    if (!orderKey) return;

    setDetailLoadingId(orderKey);
    setSelectedOrderId(orderKey);
    setSelectedInvoice(null);

    const response =
      order.type === "BUY"
        ? await fetchAugmontBuyOrderDetail({
            merchantId,
            merchantTransactionId: order.merchantTransactionId,
            uniqueId: order.uniqueId || uniqueId
          })
        : await fetchAugmontSellOrderDetail({
            merchantId,
            merchantTransactionId: order.merchantTransactionId,
            uniqueId: order.uniqueId || uniqueId
          });

    setDetailLoadingId("");

    if (!response.ok) {
      setSelectedOrderDetail({ error: response.message || "Unable to fetch order detail" });
      return;
    }

    setSelectedOrderDetail(response.order || {});
  };

  const fetchInvoice = async (order) => {
    const orderKey = getOrderKey(order);
    if (!orderKey || !order.transactionId) return;

    setInvoiceLoadingId(orderKey);
    setSelectedOrderId(orderKey);

    const response =
      order.type === "BUY"
        ? await fetchAugmontBuyInvoice({ merchantId, transactionId: order.transactionId })
        : await fetchAugmontSellInvoice({ merchantId, transactionId: order.transactionId });

    setInvoiceLoadingId("");

    if (!response.ok) {
      setSelectedInvoice({ error: response.message || "Unable to fetch invoice" });
      return;
    }

    setSelectedInvoice(response.invoice || {});
  };

  return (
    <div className="karatly-shell min-h-screen text-white">
      <Navbar />

      <div className="mx-auto max-w-6xl px-5 pb-12 pt-24">
        <div className="karatly-panel mb-7 rounded-lg p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-white/55">This Month</p>
          <h1 className="mt-2 text-3xl font-bold text-yellow-300">&#8377;61,444</h1>
          <p className="mt-2 text-sm text-white/65">Total invested - {orders.length || 6} orders</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["24", "BUY"],
              ["16", "SELL"],
              ["3", "SIP"]
            ].map(([count, label]) => (
              <div key={label} className="rounded-md border border-yellow-500/25 bg-[#17120d] p-4 text-center">
                <p className="text-3xl font-bold text-yellow-400">{count}</p>
                <p className="mt-2 text-xs uppercase">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-4 overflow-hidden rounded-xl border border-white/15 bg-[#17140f] text-sm">
          {["ALL", "BUY", "SELL", "SIP"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`py-3 transition ${
                filter === item
                  ? "bg-gradient-to-r from-yellow-300 to-amber-500 text-black"
                  : "text-white/55 hover:text-white"
              }`}
            >
              {item === "ALL" ? "All" : item.charAt(0) + item.slice(1).toLowerCase()}
            </button>
          ))}
          <button
            onClick={loadOrders}
            className="hidden"
          >
            Refresh Orders
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-[#111] p-8 text-center text-gray-400">
            Loading Augmont orders...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-red-300">{error}</p>
            <button
              onClick={loadOrders}
              className="mt-4 rounded-xl bg-yellow-500 px-6 py-2 text-black"
            >
              Retry
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#111] p-8 text-center text-gray-400">
            {getEmptyStateMessage(filter)}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-white/10 bg-transparent">
            {/* TC23 & TC59: Added Transaction ID column header, widened grid */}
            <div className="hidden grid-cols-[1fr_0.5fr_0.7fr_0.7fr_1fr_0.8fr_1.2fr_1.1fr] gap-3 bg-white/10 px-4 py-4 text-left text-xs font-semibold uppercase tracking-widest text-white/50 md:grid">
              <div>Merchant Txn ID</div>
              <div>Type</div>
              <div>Amount</div>
              <div>Gold</div>
              <div>Date</div>
              <div>Status</div>
              {/* TC23 & TC59: Augmont Transaction ID — full, copyable */}
              <div>Transaction ID</div>
              <div>Actions</div>
            </div>

            <div className="divide-y divide-white/10">
              {filteredOrders.map((order) => {
                const orderKey = getOrderKey(order);
                const isActive = selectedOrderId === orderKey;

                return (
                  <div key={orderKey} className="karatly-card mb-3 rounded-lg px-4 py-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_0.45fr_0.7fr_0.7fr_1fr_0.8fr_1.1fr_1fr] md:items-start">

                      {/* Merchant Transaction ID */}
                      <div>
                        <p className="mb-1 text-xs text-white/45 md:hidden">Merchant Txn ID</p>
                        <span className="break-all font-mono text-xs text-white/70">
                          {order.merchantTransactionId || "—"}
                        </span>
                      </div>

                      {/* Type */}
                      <div>
                        <p className="mb-1 text-xs text-white/45 md:hidden">Type</p>
                        <p className={order.type === "BUY" ? "font-semibold text-yellow-300" : "font-semibold text-cyan-300"}>
                          {order.type}
                        </p>
                      </div>

                      {/* Amount */}
                      <div>
                        <p className="mb-1 text-xs text-white/45 md:hidden">Amount</p>
                        <p className="text-sm">{formatCurrency(order.amount)}</p>
                      </div>

                      {/* Gold */}
                      <div>
                        <p className="mb-1 text-xs text-white/45 md:hidden">Gold</p>
                        <p className="text-sm">{formatGrams(order.gold)}</p>
                      </div>

                      {/* Date */}
                      <div>
                        <p className="mb-1 text-xs text-white/45 md:hidden">Date</p>
                        <p className="text-sm text-white/70">{formatDate(order.date)}</p>
                      </div>

                      {/* Status */}
                      <div>
                        <p className="mb-1 text-xs text-white/45 md:hidden">Status</p>
                        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">
                          {order.status}
                        </span>
                      </div>

                      {/* TC23 & TC59: Full Augmont Transaction ID — always fully visible + copyable */}
                      <div>
                        <p className="mb-1 text-xs text-white/45 md:hidden">Transaction ID</p>
                        <TxnIdCell value={order.transactionId} />
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => fetchOrderDetail(order)}
                          disabled={detailLoadingId === orderKey}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/80 transition hover:border-yellow-500/30 hover:text-yellow-300 disabled:opacity-60"
                        >
                          {detailLoadingId === orderKey ? "Loading..." : "Detail"}
                        </button>
                        <button
                          onClick={() => fetchInvoice(order)}
                          disabled={invoiceLoadingId === orderKey || !order.transactionId}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/80 transition hover:border-cyan-500/30 hover:text-cyan-300 disabled:opacity-60"
                        >
                          {invoiceLoadingId === orderKey ? "Loading..." : "Invoice"}
                        </button>
                      </div>
                    </div>

                    {isActive && (selectedOrderDetail || selectedInvoice) ? (
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                          <p className="text-sm font-semibold text-white">Order Detail</p>
                          {selectedOrderDetail?.error ? (
                            <p className="mt-3 text-sm text-red-300">{selectedOrderDetail.error}</p>
                          ) : (
                            <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs text-white/70">
                              {prettyJson(selectedOrderDetail)}
                            </pre>
                          )}
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                          <p className="text-sm font-semibold text-white">Invoice</p>
                          {selectedInvoice?.error ? (
                            <p className="mt-3 text-sm text-red-300">{selectedInvoice.error}</p>
                          ) : selectedInvoice ? (
                            <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs text-white/70">
                              {prettyJson(selectedInvoice)}
                            </pre>
                          ) : (
                            <p className="mt-3 text-sm text-white/45">
                              Fetch invoice to view invoice response.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={loadOrders}
        className="fixed bottom-5 right-5 grid h-11 w-11 place-items-center rounded-full bg-yellow-400 text-black shadow-lg"
        title="Refresh orders"
      >
        <RefreshCw className="h-5 w-5" />
      </button>
    </div>
  );
}
