import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import LiveMetalChart from "./LiveMetalChart";
import { loadUserDashboardData } from "../utils/userDashboard";

const formatInr = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function RateCard({ label, buy, sell, change, accent, onTrade }) {
  const positive = Number(change) >= 0;
  return (
    <div className="karatly-subpage-panel rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-white/45">{label}</p>
          <p className="mt-2 text-2xl font-bold" style={{ color: accent }}>
            {formatInr(buy)}
            <span className="text-sm font-normal text-white/45"> /g buy</span>
          </p>
          <p className="mt-1 text-sm text-white/55">Sell {formatInr(sell)}/g</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            positive ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
          }`}
        >
          {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {positive ? "+" : ""}
          {Number(change || 0).toFixed(2)}%
        </span>
      </div>
      <button
        type="button"
        onClick={onTrade}
        className="karatly-gold-button mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold"
      >
        Trade {label}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function MarketRatesPanel() {
  const navigate = useNavigate();
  const [metal, setMetal] = useState("gold");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const dashboard = await loadUserDashboardData({ forceRates: true });
      setData(dashboard);
    } catch (err) {
      setError(err?.message || "Could not load market data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(() => load({ silent: true }), 30000);
    const onRates = () => load({ silent: true });
    window.addEventListener("augmontRatesUpdated", onRates);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("augmontRatesUpdated", onRates);
    };
  }, [load]);

  const goldChange =
    data?.history?.gold?.length > 1
      ? ((data.history.gold.at(-1).buyRate - data.history.gold[0].buyRate) /
          data.history.gold[0].buyRate) *
        100
      : 0;
  const silverChange =
    data?.history?.silver?.length > 1
      ? ((data.history.silver.at(-1).buyRate - data.history.silver[0].buyRate) /
          data.history.silver[0].buyRate) *
        100
      : 0;

  const chartHistory = metal === "gold" ? data?.history?.gold : data?.history?.silver;

  return (
    <section className="mb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-yellow-300/80">Live market</p>
          <h2 className="mt-1 text-2xl font-bold">Gold & Silver rates</h2>
          <p className="mt-1 text-sm text-white/45">Prices refresh from Karatly backend every 30 seconds</p>
        </div>
        <button
          type="button"
          onClick={() => load({ silent: true })}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <RateCard
          label="Gold 24K"
          buy={data?.rates?.goldBuy}
          sell={data?.rates?.goldSell}
          change={goldChange}
          accent="#f5c842"
          onTrade={() => window.dispatchEvent(new CustomEvent('openTradeModal', { detail: { type: 'buy' } }))}
        />
        <RateCard
          label="Silver"
          buy={data?.rates?.silverBuy}
          sell={data?.rates?.silverSell}
          change={silverChange}
          accent="#94a3b8"
          onTrade={() => window.dispatchEvent(new CustomEvent('openTradeModal', { detail: { type: 'buy' } }))}
        />
      </div>

      <div className="karatly-panel mt-6 rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {["gold", "silver"].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMetal(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${
                metal === key ? "bg-yellow-400 text-black" : "bg-white/10 text-white/55"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
        <LiveMetalChart
          data={chartHistory}
          loading={loading}
          error={!loading && !chartHistory?.length ? "Historical rates unavailable" : ""}
          metalLabel={metal === "gold" ? "Gold" : "Silver"}
          accent={metal === "gold" ? "#f5c842" : "#94a3b8"}
        />
      </div>
    </section>
  );
}
