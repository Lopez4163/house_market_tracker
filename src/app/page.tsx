"use client";

import { useEffect, useState } from "react";
import { MarketCard } from "@/components/ui/MarketCard";

type MarketCardSummary = {
  asOf: string;
  medianPrice?: number;
  medianRent?: number;
  dom?: number;
};

export type MarketItem = {
  id: string;
  city: string | null;
  state: string | null;
  summary: MarketCardSummary | null;
};

export default function DashboardPage() {
  const [zip, setZip] = useState("");
  const [markets, setMarkets] = useState<MarketItem[]>([]);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/v1/markets", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch markets");
        const data = await res.json();
        setMarkets(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = zip.trim();
    if (!/^\d{5}$/.test(trimmed)) {
      setError("Enter a valid 5-digit ZIP code.");
      return;
    }

    setLoadingAdd(true);
    try {
      const res = await fetch("/api/v1/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip: trimmed, propertyType: "sfh" }),
      });

      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        setError(msg?.error ?? "Failed to add market.");
        return;
      }

      const { market, snapshot } = await res.json();
      const kpis = snapshot.kpis as any;

      const summary: MarketCardSummary = {
        asOf: snapshot.asOf,
        medianPrice: kpis?.medianPrice,
        medianRent: kpis?.medianRent,
        dom: kpis?.dom,
      };

      setMarkets((prev) => {
        const existingIndex = prev.findIndex((m) => m.id === market.id);
        const newItem: MarketItem = {
          id: market.id,
          city: market.city,
          state: market.state,
          summary,
        };

        if (existingIndex >= 0) {
          const copy = [...prev];
          copy[existingIndex] = newItem;
          return copy;
        }

        return [newItem, ...prev];
      });

      setZip("");
    } catch (err) {
      console.error(err);
      setError("Unexpected error adding market.");
    } finally {
      setLoadingAdd(false);
    }
  }

  async function handleHide(id: string) {
    try {
      const res = await fetch("/api/v1/markets/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) return;
      setMarkets((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  const showSpinner = loading;
  const showEmpty = !loading && markets.length === 0;
  const showGrid = !loading && markets.length > 0;

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white">
      {/* Top rule */}
      <div className="border-b border-white/15">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="text-xs tracking-[0.35em] uppercase text-white/70">
            HOUSE MARKET WATCH
          </div>
          <div className="text-xs text-white/60">
            {markets.length} tracked
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        {/* Hero grid */}
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h1 className="text-[42px] leading-[0.95] sm:text-[72px] font-semibold tracking-tight">
              Track markets.
              <br />
              Not noise.
            </h1>

            <p className="mt-5 max-w-xl text-sm sm:text-base text-white/70 leading-relaxed">
              Add ZIP codes. Get snapshot data for median price, rent, and days on
              market. Fast, quota-friendly, and built for quick decisions.
            </p>

            {/* Feature list */}
            <div className="mt-7 grid grid-cols-2 gap-3 max-w-xl">
              {[
                ["Snapshot caching", "No repeated calls."],
                ["ZIP watchlist", "One card per market."],
                ["2–4 ready", "Built for multi-family."],
                ["Clean KPIs", "Price · Rent · DOM."],
              ].map(([title, sub]) => (
                <div
                  key={title}
                  className="border border-white/15 bg-white/5 p-3"
                >
                  <div className="text-xs font-medium">{title}</div>
                  <div className="mt-1 text-[11px] text-white/60">{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Add ZIP block */}
          <div className="lg:col-span-5">
            <div className="border border-white/15 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs tracking-[0.3em] uppercase text-white/60">
                  Add a market
                </div>
                <div className="text-[11px] text-white/55">
                  Try: <span className="font-mono">18504</span> ·{" "}
                  <span className="font-mono">11368</span>
                </div>
              </div>

              <form onSubmit={handleAdd} className="mt-4 space-y-3">
                <input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="ZIP (5 digits)"
                  inputMode="numeric"
                  className="
                    w-full bg-transparent
                    border border-white/15
                    px-4 py-3
                    text-sm
                    outline-none
                    placeholder:text-white/35
                    focus:border-white/40
                  "
                />

                <button
                  type="submit"
                  disabled={loadingAdd}
                  className="
                    w-full
                    bg-white text-black
                    px-4 py-3
                    text-sm font-medium
                    hover:bg-white/90
                    active:translate-y-[1px]
                    disabled:opacity-60 disabled:cursor-not-allowed
                    transition
                  "
                >
                  {loadingAdd ? "Adding…" : "Add to watchlist"}
                </button>

                {error && (
                  <div className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {error}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Watchlist */}
        <div className="mt-12">
          <div className="flex items-end justify-between border-b border-white/15 pb-3">
            <div>
              <div className="text-xs tracking-[0.3em] uppercase text-white/60">
                Watchlist
              </div>
              <div className="mt-1 text-sm text-white/75">
                Your tracked ZIP markets
              </div>
            </div>
          </div>

          {/* Loading */}
          {showSpinner && (
            <div className="py-16 text-center text-sm text-white/60">
              Loading…
            </div>
          )}

          {/* Empty */}
          {!showSpinner && showEmpty && (
            <div className="mt-6 border border-white/15 bg-white/5 p-8">
              <div className="text-sm text-white/80">No markets yet.</div>
              <div className="mt-1 text-xs text-white/60">
                Add a ZIP above to start tracking.
              </div>
            </div>
          )}

          {/* Grid */}
          {!showSpinner && showGrid && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {markets.map((m) => (
                <MarketCard
                  key={m.id}
                  market={m}
                  onHide={() => handleHide(m.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-14 text-center text-[11px] text-white/45">
          Snapshot-driven · ZIP markets · Built for speed
        </div>
      </div>
    </div>
  );
}
