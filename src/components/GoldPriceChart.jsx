import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import {
  fetchAugmontRateHistory,
  fetchAugmontBuyOrders,
  fetchAugmontSellOrders,
  fetchAugmontUserBanks,
} from "../api/augmontApi";
import { getUserProfile } from "../api/authApi";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);
const formatGrams = (value) => `${Number(value || 0).toFixed(4)} g`;
const formatReturn = (value) => {
  if (value === null || value === undefined || value === "") return "NA";
  return `${value}%`;
};

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch { return value; }
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

// ─── Transaction History ──────────────────────────────────────────────────────

function TransactionHistory() {
  const [buyOrders, setBuyOrders] = useState([]);
  const [sellOrders, setSellOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("buy");
  const [bankCount, setBankCount] = useState(0);

  const userProfile = getUserProfile();
  const uniqueId = userProfile?.uniqueId || localStorage.getItem("augmontUniqueId") || "";

  const load = useCallback(async () => {
    if (!uniqueId) { setError("Augmont user not found."); setIsLoading(false); return; }
    setIsLoading(true); setError("");
    const [buyRes, sellRes, bankRes] = await Promise.all([
      fetchAugmontBuyOrders({ uniqueId }),
      fetchAugmontSellOrders({ uniqueId }),
      fetchAugmontUserBanks(uniqueId),
    ]);
    setBuyOrders(buyRes?.orders || []);
    setSellOrders(sellRes?.orders || []);
    setBankCount(bankRes?.banks?.length || 0);
    setIsLoading(false);
  }, [uniqueId]);

  useEffect(() => { load(); }, [load]);

  const orders = activeTab === "buy" ? buyOrders : sellOrders;

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0f0f0f]">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-white">Transaction History</h4>
          <p className="mt-1 text-sm text-white/50">Your buy and sell orders from Augmont</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* TC51 — bank count */}
          <div className={`rounded-full px-3 py-1 text-xs ${bankCount >= 3 ? "bg-red-500/20 text-red-300" : "bg-white/10 text-white/50"}`}>
            {bankCount}/3 banks{bankCount >= 3 ? " — limit reached" : ""}
          </div>
          <div className="flex rounded-full border border-white/10 bg-black/20 p-1">
            {["buy", "sell"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-1.5 text-sm transition ${activeTab === tab ? "bg-yellow-500 text-black font-semibold" : "text-white/65 hover:text-white"}`}>
                {tab === "buy" ? "Buy Orders" : "Sell Orders"}
              </button>
            ))}
          </div>
          <button onClick={load} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 transition hover:border-yellow-500/30 hover:text-white">
            Refresh
          </button>
        </div>
      </div>

      {/* TC48/49 — KYC notice */}
      {userProfile?.augmontKycStatus && userProfile.augmontKycStatus !== "Approved" && (
        <div className="mx-6 mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
          ⚠ KYC status: {userProfile.augmontKycStatus} — Transactions above ₹50,000 require completed KYC.
        </div>
      )}

      {/* TC63 — 48hr sell restriction */}
      {activeTab === "sell" && buyOrders.length > 0 && (() => {
        const lastBuy = buyOrders[0];
        const lastBuyDate = new Date(lastBuy?.date || 0);
        const hoursSinceBuy = (Date.now() - lastBuyDate.getTime()) / (1000 * 60 * 60);
        const hoursRemaining = Math.max(0, 48 - hoursSinceBuy);
        if (hoursRemaining > 0) {
          return (
            <div className="mx-6 mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-200">
              🔒 Sell restricted — {hoursRemaining.toFixed(1)} hours remaining
              (48hr cooldown after last buy on {formatDateTime(lastBuy?.date)})
            </div>
          );
        }
        return null;
      })()}

      {/* Table */}
      {isLoading ? (
        <div className="p-6 text-sm text-white/50">Loading transactions…</div>
      ) : error ? (
        <div className="p-6 text-sm text-red-300">{error}</div>
      ) : orders.length === 0 ? (
        <div className="p-6 text-sm text-white/50">No {activeTab} orders found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="px-4 py-3">Date & Time</th>     {/* TC24, TC60 */}
                <th className="px-4 py-3">Transaction ID</th>  {/* TC23, TC59 */}
                <th className="px-4 py-3">Metal</th>           {/* TC17 */}
                <th className="px-4 py-3">Quantity</th>        {/* TC18, TC56 */}
                <th className="px-4 py-3">Rate (excl. GST)</th>{/* TC19, TC57 */}
                <th className="px-4 py-3">Tax</th>             {/* TC20, TC21 */}
                <th className="px-4 py-3">Amount (incl. GST)</th>{/* TC22, TC58 */}
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, i) => (
                <tr key={order.id || i} className="border-t border-white/10 hover:bg-white/[0.02]">
                  {/* TC24, TC60 — Date & Time */}
                  <td className="px-4 py-3 text-white/70 whitespace-nowrap">
                    {formatDateTime(order.date)}
                  </td>
                  {/* TC23, TC59 — Transaction ID */}
                  <td className="px-4 py-3 text-white/60 text-xs break-all max-w-[140px]">
                    <div>{order.transactionId || "—"}</div>
                    <div className="text-white/30 mt-1">{order.merchantTransactionId || ""}</div>
                  </td>
                  {/* TC17 — Metal */}
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${order.type === "BUY" ? "bg-yellow-500/20 text-yellow-300" : "bg-cyan-500/20 text-cyan-300"}`}>
                      {order.type} · GOLD
                    </span>
                  </td>
                  {/* TC18, TC56 — Quantity */}
                  <td className="px-4 py-3 text-white">{formatGrams(order.gold)}</td>
                  {/* TC19, TC57 — Rate excl GST */}
                  <td className="px-4 py-3 text-yellow-300/80">
                    {order.rate ? `${formatCurrency(order.rate)}/g` : "—"}
                  </td>
                  {/* TC20, TC21 — Tax amount and rate */}
                  <td className="px-4 py-3 text-white/50 text-xs">
                    {order.taxRate ? `${order.taxRate}%` : "—"}
                    {order.taxAmt ? <span className="block text-white/40">₹{order.taxAmt}</span> : null}
                  </td>
                  {/* TC22, TC58 — Amount incl GST */}
                  <td className="px-4 py-3 text-white font-medium">{formatCurrency(order.amount)}</td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${
                      order.status?.toLowerCase().includes("complet") || order.status?.toLowerCase().includes("success")
                        ? "bg-emerald-500/20 text-emerald-300"
                        : order.status?.toLowerCase().includes("cancel")
                          ? "bg-red-500/20 text-red-300"
                          : "bg-white/10 text-white/60"
                    }`}>
                      {order.status || "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TC50 — withdrawal restriction notice */}
      {activeTab === "sell" && (
        <div className="border-t border-white/10 px-6 py-3 text-xs text-white/40">
          Note: Withdrawal to the same bank account used for buying is restricted as per Augmont policy.
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function GoldPriceChart() {
  const defaultRange = getDateRange();
  const [metalType, setMetalType] = useState("gold");
  const [historyRows, setHistoryRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState(defaultRange.fromDate);
  const [toDate, setToDate] = useState(defaultRange.toDate);
  const [appliedRange, setAppliedRange] = useState(defaultRange);

  const loadHistory = useCallback(async () => {
    setIsLoading(true); setError("");
    const response = await fetchAugmontRateHistory({
      fromDate: appliedRange.fromDate,
      toDate: appliedRange.toDate,
      metalType
    });
    if (!response?.ok) {
      setHistoryRows([]);
      setError(response?.message || "Unable to fetch Augmont rate history");
      setIsLoading(false);
      return;
    }
    setHistoryRows(response.history || []);
    setIsLoading(false);
  }, [appliedRange.fromDate, appliedRange.toDate, metalType]);

  useEffect(() => {
    const id = window.setTimeout(() => { loadHistory(); }, 0);
    return () => window.clearTimeout(id);
  }, [loadHistory]);

  const handleApplyRange = () => {
    if (!fromDate || !toDate) { setError("Select both dates."); return; }
    if (fromDate > toDate) { setError("From date cannot be later than to date."); return; }
    setAppliedRange({ fromDate, toDate });
  };

  const handleResetRange = () => {
    const r = getDateRange();
    setFromDate(r.fromDate); setToDate(r.toDate); setAppliedRange(r);
  };

  const chartData = useMemo(() =>
    historyRows.map((row) => ({ label: row.date, buyRate: row.buyRate, sellRate: row.sellRate })),
    [historyRows]
  );

  const priceChange = useMemo(() => {
    if (historyRows.length < 2) return 0;
    const first = historyRows[0]?.buyRate || 0;
    const last = historyRows[historyRows.length - 1]?.buyRate || 0;
    if (!first) return 0;
    return ((last - first) / first) * 100;
  }, [historyRows]);

  const chartRange = useMemo(() => {
    if (!historyRows.length) return [0, 100];
    const prices = historyRows.flatMap((p) => [p.buyRate, p.sellRate]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = Math.max((max - min) * 0.2, 5);
    return [Math.max(0, min - padding), max + padding];
  }, [historyRows]);

  return (
    <div className="space-y-6">
      {/* Rate History Chart */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_38%),linear-gradient(180deg,_rgba(17,24,39,0.92),_rgba(8,8,8,0.98))] p-8">
        <div className="pointer-events-none absolute inset-x-6 top-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold">Rate History</h3>
            <p className="text-sm text-gray-400">Date-wise buy and sell rates</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-full border border-white/10 bg-black/20 p-1">
              {["gold", "silver"].map((metal) => (
                <button key={metal} onClick={() => setMetalType(metal)}
                  className={`rounded-full px-4 py-1.5 text-sm transition ${metalType === metal ? "bg-yellow-500 text-black" : "text-white/65 hover:text-white"}`}>
                  {metal}
                </button>
              ))}
            </div>
            <span className={`rounded-full px-4 py-1 text-sm ${priceChange >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
              {priceChange >= 0 ? "▲" : "▼"} {Math.abs(priceChange).toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="mb-6 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr_1fr_auto_auto]">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/45">From</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} max={toDate}
              className="w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-500/40" />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/45">To</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} min={fromDate}
              className="w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-500/40" />
          </label>
          <button onClick={handleApplyRange} className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-black transition hover:scale-105">Apply</button>
          <button onClick={handleResetRange} className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/75 transition hover:border-yellow-500/30 hover:text-white">Reset</button>
        </div>

        {isLoading ? (
          <div className="h-64 animate-pulse rounded-2xl border border-white/10 bg-black/20" />
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 px-6 text-center">
            <p className="text-sm text-red-300">{error}</p>
            <button onClick={loadHistory} className="mt-4 rounded-xl bg-yellow-500 px-5 py-2 text-sm font-semibold text-black">Retry</button>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-sm text-white/50">No historical rates found.</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 16, right: 8, left: -20, bottom: 4 }}>
                <defs>
                  <linearGradient id="buyBars" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#d97706" stopOpacity={0.75} />
                  </linearGradient>
                  <linearGradient id="sellBars" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.75} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} padding={{ left: 10, right: 10 }} />
                <YAxis domain={chartRange} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} width={88}
                  tickFormatter={(v) => currencyFormatter.format(Number(v) || 0).replace(".00", "")} />
                <Tooltip cursor={{ stroke: "rgba(255,255,255,0.2)", strokeDasharray: "4 4" }}
                  contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", color: "#fff" }}
                  labelStyle={{ color: "#cbd5e1", marginBottom: 6 }}
                  formatter={(value, name) => [`${formatCurrency(value)}/unit`, name === "buyRate" ? "Buy Rate" : "Sell Rate"]} />
                <Legend />
                <Bar dataKey="buyRate" fill="url(#buyBars)" radius={[8, 8, 2, 2]} maxBarSize={22} />
                <Bar dataKey="sellRate" fill="url(#sellBars)" radius={[8, 8, 2, 2]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Historical rate table */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0f0f0f]">
        <div className="border-b border-white/10 px-6 py-4">
          <h4 className="text-lg font-semibold text-white">Historical Rate Rows</h4>
          <p className="mt-1 text-sm text-white/50">Buy, sell, and return percentages</p>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-white/50">Loading history rows...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-300">{error}</div>
        ) : historyRows.length === 0 ? (
          <div className="p-6 text-sm text-white/50">No historical rows available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-white/60">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Buy</th>
                  <th className="px-4 py-3">Sell</th>
                  <th className="px-4 py-3">1D</th>
                  <th className="px-4 py-3">1W</th>
                  <th className="px-4 py-3">1M</th>
                  <th className="px-4 py-3">3M</th>
                  <th className="px-4 py-3">6M</th>
                  <th className="px-4 py-3">1Y</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((row) => (
                  <tr key={`${row.date}-${row.metalType}`} className="border-t border-white/10">
                    <td className="px-4 py-3 text-white">{row.date}</td>
                    <td className="px-4 py-3 text-white/70">{row.metalType}</td>
                    <td className="px-4 py-3 text-yellow-300">{formatCurrency(row.buyRate)}</td>
                    <td className="px-4 py-3 text-cyan-300">{formatCurrency(row.sellRate)}</td>
                    <td className="px-4 py-3 text-white/60">{formatReturn(row.returns.oneDay)}</td>
                    <td className="px-4 py-3 text-white/60">{formatReturn(row.returns.oneWeek)}</td>
                    <td className="px-4 py-3 text-white/60">{formatReturn(row.returns.oneMonth)}</td>
                    <td className="px-4 py-3 text-white/60">{formatReturn(row.returns.threeMonth)}</td>
                    <td className="px-4 py-3 text-white/60">{formatReturn(row.returns.sixMonth)}</td>
                    <td className="px-4 py-3 text-white/60">{formatReturn(row.returns.oneYear)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction History */}
      <TransactionHistory />
    </div>
  );
}

export default GoldPriceChart;
