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
  id: string; // e.g. "zip:11368"
  city: string | null; // e.g. "Corona"
  state: string | null; // e.g. "NY"
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
        // optional: setError("Failed to load markets.");
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
        body: JSON.stringify({
          zip: trimmed,
          propertyType: "sfh",
        }),
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
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">House Market Watch</h1>
            <p className="text-sm text-slate-400">
              Add ZIP codes to your watchlist. Each card is one local market.
            </p>
          </div>
        </header>

        {/* Add ZIP form */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <form
            onSubmit={handleAdd}
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="ZIP (e.g. 11368)"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            />

            <button
              type="submit"
              disabled={loadingAdd}
              className="rounded-xl border border-sky-500 bg-sky-500/10 px-4 py-2 text-sm font-medium hover:bg-sky-500/20 disabled:opacity-60"
            >
              {loadingAdd ? "Adding..." : "Add"}
            </button>
          </form>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </section>

        {/* Cards */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            Watchlist
          </h2>

          {/* Spinner (fades out) */}
          <div
            className={`transition-opacity duration-300 ${
              showSpinner ? "opacity-100" : "opacity-0 pointer-events-none h-0"
            }`}
          >
            {showSpinner && (
              <div className="flex min-h-[50vh] items-center justify-center">
                <div className="relative h-14 w-14">
                  <div className="absolute inset-0 rounded-full bg-sky-400/20 blur-lg" />
                  <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-slate-700 border-t-sky-400 border-r-sky-300" />
                </div>
              </div>
            )}
          </div>

          {/* Empty state (fades in) */}
          <div
            className={`transition-all duration-500 ease-out ${
              showEmpty ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none h-0 overflow-hidden"
            }`}
          >
            {showEmpty && (
              <p className="text-sm text-slate-500">
                No markets added yet. Start by adding something like{" "}
                <span className="font-mono">18504</span> or{" "}
                <span className="font-mono">11368</span>.
              </p>
            )}
          </div>

          {/* Grid (fades in) */}
          <div
            className={`transition-all duration-500 ease-out ${
              showGrid ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none h-0 overflow-hidden"
            }`}
          >
            {showGrid && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        </section>
      </div>
    </div>
  );
}
