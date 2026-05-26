import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const formatInr = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function formatAxisDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(5, 10);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function LiveMetalChart({
  data = [],
  loading = false,
  error = "",
  metalLabel = "Gold",
  accent = "#f5c842"
}) {
  const chartData = useMemo(
    () =>
      (data || [])
        .map((point) => ({
          date: point.date || point.label,
          buy: Number(point.buyRate || point.price || 0),
          sell: Number(point.sellRate || 0)
        }))
        .filter((point) => point.buy > 0 || point.sell > 0),
    [data]
  );

  if (loading) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-sm text-white/45">
        Loading {metalLabel.toLowerCase()} chart…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 px-4 text-center text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-sm text-white/45">
        No {metalLabel.toLowerCase()} history available yet.
      </div>
    );
  }

  return (
    <div className="h-56 w-full rounded-xl border border-white/10 bg-black/25 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${metalLabel}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity={0.55} />
              <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatAxisDate}
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip
            contentStyle={{
              background: "#101514",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              fontSize: 12
            }}
            formatter={(value, name) => [formatInr(value), name === "buy" ? "Buy" : "Sell"]}
            labelFormatter={formatAxisDate}
          />
          <Area
            type="monotone"
            dataKey="buy"
            stroke={accent}
            strokeWidth={2}
            fill={`url(#fill-${metalLabel})`}
            name="buy"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
