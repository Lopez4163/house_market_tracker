// src/components/MarketDetailClient.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import PriceHistoryChart from "@/components/PriceHistoryChart";

type PropertyType = "sfh" | "condo" | "2to4";
type Timeframe = "1Y" | "3Y" | "5Y" | "MAX";

const TYPES: { id: PropertyType; label: string }[] = [
  { id: "sfh", label: "Single Family" },
  { id: "condo", label: "Condo" },
  { id: "2to4", label: "2–4 Units" },
];

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: "1Y", label: "1Y" },
  { id: "3Y", label: "3Y" },
  { id: "5Y", label: "5Y" },
  { id: "MAX", label: "Max" },
];

type SnapshotResponse = {
  market: { id: string; city: string; state: string };
  asOf: string;
  dimensions: { propertyType?: PropertyType };
  kpis: {
    medianPrice: number;
    medianRent: number;
    ppsf: number;
    dom: number;
    confidence: number;
  };
  series: { date: string; medianPrice: number; medianRent: number }[];
  meta: any;
};

type Props = {
  marketId: string; // e.g. "city:PA:Scranton"
};

export default function MarketDetailClient({ marketId }: Props) {
  const [type, setType] = useState<PropertyType>("sfh");
  const [timeframe, setTimeframe] = useState<Timeframe>("1Y");
  const [data, setData] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          marketId,
          type,
        });

        const res = await fetch(`/api/v1/summary?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Failed to fetch snapshot");
        const json = (await res.json()) as SnapshotResponse;
        setData(json);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => controller.abort();
  }, [marketId, type]);

  const kpis = data?.kpis ?? ({} as any);
  const series = data?.series ?? [];

  // --- Timeframe filtering logic ---
  const filteredSeries = useMemo(() => {
    if (!data || timeframe === "MAX") return series;

    // Use asOf as the "current" reference point
    const asOf = new Date(data.asOf);
    if (Number.isNaN(asOf.getTime())) return series;

    const yearsBack =
      timeframe === "1Y" ? 1 : timeframe === "3Y" ? 3 : 5; // 5Y fallback

    const cutoff = new Date(
      asOf.getFullYear() - yearsBack,
      asOf.getMonth(),
      asOf.getDate()
    );

    return series.filter((point) => {
      const d = new Date(point.date);
      if (Number.isNaN(d.getTime())) return false;
      return d >= cutoff;
    });
  }, [data, series, timeframe]);

  return (
    <div className="space-y-6">
      {/* Top controls: type + timeframe + last updated */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Property type toggle */}
        <div className="inline-flex rounded-full border border-slate-800 bg-slate-900/80 p-1">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`px-4 py-1.5 text-xs sm:text-sm rounded-full transition ${
                type === t.id
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Right side: timeframe toggle + last updated */}
        <div className="flex items-center gap-4 justify-between sm:justify-end">
          <div className="inline-flex rounded-full border border-slate-800 bg-slate-900/80 p-1 text-[11px] sm:text-xs">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-3 py-1 rounded-full transition ${
                  timeframe === tf.id
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {data && (
            <p className="text-[11px] text-slate-400 whitespace-nowrap">
              Last updated {new Date(data.asOf).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {loading && !data && (
        <p className="text-xs text-slate-400">
          Loading {type.toUpperCase()} data…
        </p>
      )}

      {data && (
        <>
          {/* KPI Cards (same as before) */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">
                Avg Home Price
              </p>
              <p className="mt-2 text-xl font-semibold">
                {kpis.medianPrice
                  ? `$${Math.round(kpis.medianPrice).toLocaleString()}`
                  : "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">
                Est. Monthly Rent
              </p>
              <p className="mt-2 text-xl font-semibold">
                {kpis.medianRent
                  ? `$${Math.round(kpis.medianRent).toLocaleString()}`
                  : "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">
                Price / Sq Ft
              </p>
              <p className="mt-2 text-xl font-semibold">
                {kpis.ppsf ? `$${kpis.ppsf.toFixed(0)}` : "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">
                Days on Market
              </p>
              <p className="mt-2 text-xl font-semibold">
                {kpis.dom ?? "—"}
              </p>
            </div>
          </section>

          {/* Price Series with timeframe label */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-slate-400">
                  Price trend (median sale price over time)
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Type:{" "}
                  <span className="font-medium uppercase">
                    {type === "sfh"
                      ? "SFH"
                      : type === "condo"
                      ? "Condo"
                      : "2–4 Units"}
                  </span>{" "}
                  · Range:{" "}
                  <span className="font-medium">
                    {timeframe === "MAX" ? "Full history" : timeframe}
                  </span>
                </p>
              </div>
            </div>
            <PriceHistoryChart data={filteredSeries as any[]} />
          </section>
        </>
      )}
    </div>
  );
}
