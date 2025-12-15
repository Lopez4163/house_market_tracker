"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Point = {
  date: string;
  medianPrice?: number;
};

export default function PriceHistoryChart({ data }: { data: Point[] }) {
  if (!data || data.length === 0) {
    return (
      <p className="text-xs text-white/55">
        No price history available for this market yet.
      </p>
    );
  }

  // Extract numeric prices
  const prices = data
    .map((p) => p.medianPrice)
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

  if (prices.length === 0) {
    return (
      <p className="text-xs text-white/55">
        No valid price data available for this market yet.
      </p>
    );
  }

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const span = maxPrice - minPrice;
  //test
  // Compute dynamic padding
  let yMin: number;
  let yMax: number;

  if (span === 0) {
    // All points the same price → pad around that value
    const pad = minPrice * 0.1 || 10_000; // 10% or fallback
    yMin = Math.max(0, minPrice - pad);
    yMax = minPrice + pad;
  } else {
    const pad = span * 0.1; // 10% padding above/below
    // Round to nearest 5k for nicer ticks
    const roughMin = Math.max(0, minPrice - pad);
    const roughMax = maxPrice + pad;
    yMin = Math.floor(roughMin / 5_000) * 5_000;
    yMax = Math.ceil(roughMax / 5_000) * 5_000;
  }

  // Format dates for X axis
  const formatted = data.map((p) => ({
    ...p,
    label: new Date(p.date).toLocaleDateString(undefined, {
      month: "short",
      year: "2-digit",
    }),
  }));

  const formatMoneyTick = (v: number) => {
    if (v >= 1_000_000) {
      return `$${(v / 1_000_000).toFixed(1)}M`;
    }
    return `$${Math.round(v / 1_000)}k`;
  };

  return (
    <div className="h-56 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.12} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }}
            tickMargin={8}
            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
            tickLine={{ stroke: "rgba(255,255,255,0.12)" }}
          />

          <YAxis
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }}
            tickFormatter={formatMoneyTick}
            domain={[yMin, yMax]}
            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
            tickLine={{ stroke: "rgba(255,255,255,0.12)" }}
          />

          <Tooltip
            formatter={(value: any) => `$${Number(value).toLocaleString()}`}
            labelFormatter={(label) => label}
            contentStyle={{
              backgroundColor: "#0B0B0F",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 0,
              fontSize: 12,
              color: "rgba(255,255,255,0.85)",
            }}
            itemStyle={{ color: "rgba(255,255,255,0.85)" }}
            labelStyle={{ color: "rgba(255,255,255,0.55)" }}
            cursor={{ stroke: "rgba(255,255,255,0.12)" }}
          />

          <Line
            type="monotone"
            dataKey="medianPrice"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
