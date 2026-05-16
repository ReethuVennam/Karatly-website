import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Download, RefreshCw, Loader2, FileText, Copy, Check } from "lucide-react";
import {
  fetchAugmontBuyOrders,
  fetchAugmontSellOrders,
  fetchAugmontBuyInvoice,
  fetchAugmontSellInvoice,
} from "../api/augmontApi";
import { buildBuyInvoicePdf, buildSellInvoicePdf } from "../utils/augmontInvoicePdf";

const fmtINR = (n) =>
  `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtQ = (n) => Number(n).toFixed(4);

// TC20/TC21 — date WITH time
function fmtDateTime(raw) {
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
    const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();
    return `${date}  ${time}`;
  } catch {
    return String(raw);
  }
}

const TYPE_STYLES = {
  buy:  "bg-green-500/15 text-green-400 border-green-500/20",
  sell: "bg-red-500/15   text-red-400   border-red-500/20",
};

function TypeBadge({ type }) {
  const t = (type || "").toLowerCase();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${TYPE_STYLES[t] || "bg-gray-500/15 text-gray-400 border-gray-500/20"}`}>
      {t}
    </span>
  );
}

// TC23 & TC59: Full transaction ID with copy button
function TxnId({ value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Transaction ID copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-1">
      <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">TXN ID</p>
      <div className="flex items-start gap-1">
        {/* Full ID — break-all ensures it never truncates */}
        <p className="text-xs font-mono text-gray-300 break-all leading-4 flex-1">{value}</p>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-shrink-0 mt-0.5 text-gray-600 hover:text-yellow-400 transition-colors"
          title="Copy Transaction ID"
        >
          {copied
            ? <Check size={11} className="text-green-400" />
            : <Copy size={11} />
          }
        </button>
      </div>
    </div>
  );
}

// FIX: separate invoice download for buy and sell
async function downloadBuyInvoice(transactionId) {
  try {
    const res = await fetchAugmontBuyInvoice({ transactionId });
    if (!res?.ok) { toast.error("Invoice not available."); return; }

    const d =
      res?.raw?.payload?.result?.data ||
      res?.invoice?.payload?.result?.data ||
      res?.invoice?.result?.data ||
      res?.invoice?.data ||
      res?.data;

    if (d?.transactionId) {
      buildBuyInvoicePdf(d);
    } else {
      toast.error("Invoice data unavailable.");
    }
  } catch {
    toast.error("Invoice download failed.");
  }
}

async function downloadSellInvoice(transactionId) {
  try {
    const res = await fetchAugmontSellInvoice({ transactionId });
    if (!res?.ok) { toast.error("Invoice not available."); return; }

    const d =
      res?.raw?.payload?.result?.data ||
      res?.invoice?.payload?.result?.data ||
      res?.invoice?.result?.data ||
      res?.invoice?.data ||
      res?.data;

    if (d?.transactionId) {
      buildSellInvoicePdf(d);
    } else {
      toast.error("Invoice data unavailable.");
    }
  } catch {
    toast.error("Invoice download failed.");
  }
}

export default function TransactionHistory({ uniqueId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [invoiceLoadingId, setInvoiceLoadingId] = useState("");

  const load = async () => {
    if (!uniqueId) return;
    setLoading(true);
    try {
      const [buyRes, sellRes] = await Promise.all([
        fetchAugmontBuyOrders({ uniqueId }),
        fetchAugmontSellOrders({ uniqueId }),
      ]);

      const buys  = (buyRes?.orders  || []).map(o => ({ ...o, type: "buy"  }));
      const sells = (sellRes?.orders || []).map(o => ({ ...o, type: "sell" }));

      const all = [...buys, ...sells].sort(
        (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
      );
      setEntries(all);
    } catch {
      toast.error("Could not load transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [uniqueId]);

  const filtered =
    filter === "all"
      ? entries
      : entries.filter(e => (e.type || "").toLowerCase() === filter);

  const handleInvoice = async (tx) => {
    const txId = tx.transactionId || tx.merchantTransactionId;
    if (!txId) { toast.error("No transaction ID available."); return; }
    const key = txId;
    setInvoiceLoadingId(key);
    if ((tx.type || "").toLowerCase() === "sell") {
      await downloadSellInvoice(txId);
    } else {
      await downloadBuyInvoice(txId);
    }
    setInvoiceLoadingId("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-[#1C2028] rounded-xl p-1">
          {["all", "buy", "sell"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all
                ${filter === f ? "bg-[#F0B90B] text-black" : "text-gray-500 hover:text-gray-300"}`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-yellow-400 transition">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-yellow-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-600 text-sm">No transactions found.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx, i) => {
            const type   = (tx.type || "").toLowerCase();
            const metal  = tx.raw?.metalType || "gold";
            const qty    = fmtQ(tx.gold || 0);
            const rate   = tx.rate || 0;
            const amount = tx.amount || 0;
            const taxAmt = tx.taxAmt ?? null;
            const txId   = tx.transactionId || tx.merchantTransactionId || "";
            const isBuy  = type === "buy";
            const isInvoiceLoading = invoiceLoadingId === txId;

            return (
              <div key={tx.id || i}
                className="bg-[#1C2028] rounded-2xl p-4 border border-[#2B2F36] hover:border-[#363A45] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <TypeBadge type={type} />
                      <span className="text-xs text-gray-500">
                        {metal === "gold" ? "24K Gold" : "999 Silver"}
                      </span>
                    </div>

                    {/* TC20/TC21 — date AND time */}
                    <p className="text-[11px] text-gray-600 mb-2 font-mono">
                      {fmtDateTime(tx.date)}
                    </p>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <Stat label="Quantity" value={`${qty}g`} accent />
                      <Stat label="Rate"     value={`₹${Number(rate).toLocaleString("en-IN")}/g`} />
                      <Stat label="Amount"   value={fmtINR(amount)} />
                      {taxAmt !== null && taxAmt > 0 && (
                        <Stat label="Exclusive Tax Amount (GST 3%)" value={fmtINR(taxAmt)} />
                      )}
                    </div>

                    {/* TC23 & TC59: Full TXN ID always visible */}
                    {txId && <TxnId value={txId} />}
                  </div>

                  {/* Invoice button — buy AND sell */}
                  {txId ? (
                    <button
                      onClick={() => handleInvoice(tx)}
                      disabled={isInvoiceLoading}
                      className="flex-shrink-0 flex flex-col items-center gap-1 p-2.5 rounded-xl bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={`Download ${isBuy ? "buy" : "sell"} invoice`}
                    >
                      {isInvoiceLoading
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Download size={14} />
                      }
                      <span className="text-[9px] font-bold">PDF</span>
                    </button>
                  ) : (
                    <div className="flex-shrink-0 flex flex-col items-center gap-1 p-2.5 rounded-xl bg-[#2B2F36] opacity-30">
                      <FileText size={14} className="text-gray-600" />
                      <span className="text-[9px] text-gray-600">N/A</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <p className="text-[9px] text-gray-600 uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-semibold font-mono ${accent ? "text-yellow-400" : "text-gray-300"}`}>
        {value}
      </p>
    </div>
  );
}
