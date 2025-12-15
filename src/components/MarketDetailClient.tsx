// src/components/MarketDetailClient.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import MortgageCalculator from "@/components/MortgageCalculator";

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

type KpisShape = {
  medianPrice: number | null;
  medianRent: number | null;
  ppsf: number | null;
  dom: number | null;
  confidence: number | null;
};

type SeriesPoint = {
  date: string;
  medianPrice: number | null;
  medianRent: number | null;
};

type PerTypePayload = {
  kpis: KpisShape;
  series: SeriesPoint[];
};

type SnapshotRow = {
  id: number;
  marketId: string;
  asOf: string; // Prisma Date -> JSON string
  dimensions: Record<string, any> | null;
  kpis: KpisShape;
  series: SeriesPoint[];
  sourceMeta?: {
    perType?: {
      sfh?: PerTypePayload;
      condo?: PerTypePayload;
      "2to4"?: PerTypePayload;
    };
  } | null;
};

type SummaryApiResponse = {
  snapshot: SnapshotRow;
  stale?: boolean;
  error?: string;
};

type SnapshotResponse = SnapshotRow & {
  stale?: boolean;
  error?: string;
};

type Props = {
  marketId: string;
};

export default function MarketDetailClient({ marketId }: Props) {
  const [type, setType] = useState<PropertyType>("sfh");
  const [timeframe, setTimeframe] = useState<Timeframe>("1Y");
  const [data, setData] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ marketId });

        const res = await fetch(`/api/v1/summary?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Failed to fetch snapshot");

        const json = (await res.json()) as SummaryApiResponse;

        setData({
          ...json.snapshot,
          stale: json.stale,
          error: json.error,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [marketId]);

  const baseKpis = data?.kpis ?? ({} as KpisShape);
  const baseSeries = data?.series ?? [];

  const perType = data?.sourceMeta?.perType;
  const typePayload = perType ? perType[type] : undefined;

  const activeKpis: KpisShape = (typePayload?.kpis ?? baseKpis) as KpisShape;
  const activeSeries: SeriesPoint[] = (typePayload?.series ??
    baseSeries) as SeriesPoint[];

  const filteredSeries = useMemo(() => {
    if (!data || timeframe === "MAX") return activeSeries;

    const asOf = new Date(data.asOf);
    if (Number.isNaN(asOf.getTime())) return activeSeries;

    const yearsBack = timeframe === "1Y" ? 1 : timeframe === "3Y" ? 3 : 5;

    const cutoff = new Date(
      asOf.getFullYear() - yearsBack,
      asOf.getMonth(),
      asOf.getDate()
    );

    return activeSeries.filter((point) => {
      const d = new Date(point.date);
      if (Number.isNaN(d.getTime())) return false;
      return d >= cutoff;
    });
  }, [data, activeSeries, timeframe]);

  const medianPrice = activeKpis.medianPrice ?? null;
  const medianRent = activeKpis.medianRent ?? null;

  const showInitialOverlay = loading && !data;

  return (
    <div className="relative min-h-[40vh] space-y-6">
      {/* Overlay (same logic/structure, dashboard look) */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 ${
          showInitialOverlay ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={!showInitialOverlay}
      >
        <div className="absolute inset-0 bg-[#0B0B0F]/85" />
        <div className="absolute inset-0 bg-white/5" />

        <div className="relative flex items-center gap-3 border border-white/15 bg-white/5 px-4 py-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
          <div className="leading-tight">
            <p className="text-sm font-medium text-white">Loading snapshot</p>
            <p className="text-[11px] text-white/55">
              Pulling last cached market data
            </p>
          </div>
        </div>
      </div>

      {/* Top controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* TYPES */}
        <div className="inline-flex items-center gap-1 border border-white/15 bg-white/5 p-1">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`px-3.5 py-1.5 text-[11px] sm:text-xs font-medium transition ${
                type === t.id
                  ? "bg-white text-black"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 justify-between sm:justify-end">
          {/* TIMEFRAMES */}
          <div className="inline-flex items-center gap-1 border border-white/15 bg-white/5 p-1 text-[11px] sm:text-xs">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-3 py-1.5 font-medium transition ${
                  timeframe === tf.id
                    ? "bg-white text-black"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {data && (
            <p className="text-[11px] text-white/55 whitespace-nowrap">
              Last updated {new Date(data.asOf).toLocaleString()}
              {data.stale && (
                <span className="text-white/45"> · using last known data</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Content (fades in) */}
      <div
        className={`transition-all duration-500 ease-out ${
          data && !showInitialOverlay
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2"
        }`}
      >
        {data && (
          <>
            {/* KPI panels */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="border border-white/15 bg-white/5 p-4 transition hover:border-white/30">
                <p className="text-[11px] text-white/60 uppercase tracking-[0.3em]">
                  Avg Home Price
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {activeKpis.medianPrice != null
                    ? `$${Math.round(activeKpis.medianPrice).toLocaleString()}`
                    : "—"}
                </p>
              </div>

              <div className="border border-white/15 bg-white/5 p-4 transition hover:border-white/30">
                <p className="text-[11px] text-white/60 uppercase tracking-[0.3em]">
                  Est. Monthly Rent
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {activeKpis.medianRent != null
                    ? `$${Math.round(activeKpis.medianRent).toLocaleString()}`
                    : "—"}
                </p>
              </div>

              <div className="border border-white/15 bg-white/5 p-4 transition hover:border-white/30">
                <p className="text-[11px] text-white/60 uppercase tracking-[0.3em]">
                  Price / Sq Ft
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {activeKpis.ppsf != null ? `$${activeKpis.ppsf.toFixed(0)}` : "—"}
                </p>
              </div>

              <div className="border border-white/15 bg-white/5 p-4 transition hover:border-white/30">
                <p className="text-[11px] text-white/60 uppercase tracking-[0.3em]">
                  Days on Market
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {activeKpis.dom != null ? activeKpis.dom : "—"}
                </p>
              </div>
            </section>

            {/* Chart + calculator block */}
            <section className="border border-white/15 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-white/75">
                    Price trend (median sale price over time)
                  </p>
                  <p className="text-[11px] text-white/55 mt-0.5">
                    Type:{" "}
                    <span className="font-medium uppercase text-white/80">
                      {type === "sfh" ? "SFH" : type === "condo" ? "Condo" : "2–4 Units"}
                    </span>{" "}
                    · Range:{" "}
                    <span className="font-medium text-white/80">
                      {timeframe === "MAX" ? "Full history" : timeframe}
                    </span>
                  </p>
                </div>
              </div>

              <div className="border border-white/15 bg-[#0B0B0F]/40 p-3">
                <PriceHistoryChart data={filteredSeries as any[]} />
              </div>

              <div className="mt-4 border border-white/15 bg-[#0B0B0F]/40 p-3">
                <MortgageCalculator defaultPrice={medianPrice} estimatedRent={medianRent} />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
