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

// 👇 This is the shape of the snapshot row in the DB
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

// 👇 What the API returns from /api/v1/summary
type SummaryApiResponse = {
  snapshot: SnapshotRow;
  stale?: boolean;
  error?: string;
};

// 👇 What we actually keep in state (snapshot + flags)
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

        // Merge stale/error flags into the snapshot row
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

  // Active KPIs/series depend on selected type if per-type data exists
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
      {/* Premium overlay (fades out) */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 ${
          showInitialOverlay ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={!showInitialOverlay}
      >
        {/* soft glass/shimmer backdrop */}
        <div className="absolute inset-0 bg-slate-950/55" />
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-800/30 via-slate-900/20 to-slate-800/30" />

        {/* premium spinner */}
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full bg-sky-400/20 blur-lg" />
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-slate-700 border-t-sky-400 border-r-sky-300" />
        </div>
      </div>

      {/* Top controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              {data.stale && " · using last known data"}
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
            {/* KPI Cards */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">
                  Avg Home Price
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {activeKpis.medianPrice != null
                    ? `$${Math.round(activeKpis.medianPrice).toLocaleString()}`
                    : "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">
                  Est. Monthly Rent
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {activeKpis.medianRent != null
                    ? `$${Math.round(activeKpis.medianRent).toLocaleString()}`
                    : "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">
                  Price / Sq Ft
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {activeKpis.ppsf != null
                    ? `$${activeKpis.ppsf.toFixed(0)}`
                    : "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">
                  Days on Market
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {activeKpis.dom != null ? activeKpis.dom : "—"}
                </p>
              </div>
            </section>

            {/* Price Series */}
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

              <MortgageCalculator
                defaultPrice={medianPrice}
                estimatedRent={medianRent}
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
