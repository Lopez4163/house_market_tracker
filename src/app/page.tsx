"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MarketCard } from "@/components/ui/MarketCard";

type MarketCardSummary = {
  asOf: string;
  medianPrice?: number;
  medianRent?: number;
  dom?: number;
};

export type MarketItem = {
  id: string;             // e.g. "zip:11368"
  city: string | null;    // e.g. "Corona"
  state: string | null;   // e.g. "NY"
  hidden?: boolean;
  summary: MarketCardSummary | null;
};

export default function DashboardPage() {
  const [zip, setZip] = useState("");
  const [markets, setMarkets] = useState<MarketItem[]>([]);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // initial fetch of existing markets
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/v1/markets", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      console.log("Fetched markets:", data);
      setMarkets(data);
    })();
  }, []);

  console.log("Markets:", markets);

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
        // avoid duplicates: replace if exists
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
  
      // Remove from UI immediately
      setMarkets((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  }
  

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
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
          {error && (
            <p className="text-xs text-red-400">
              {error}
            </p>
          )}
        </section>

        {/* Cards */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            Watchlist
          </h2>
          {markets.length === 0 ? (
            <p className="text-sm text-slate-500">
              No markets added yet. Start by adding something like{" "}
              <span className="font-mono">18504</span> or{" "}
              <span className="font-mono">11368</span>.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {markets.map((m) => {
                return (

                  
    
                  <MarketCard key={m.id} market={m} onHide={() => (handleHide(m.id))} />
                  // <Link
                  //   key={m.id}
                  //   href={`/markets/${encodeURIComponent(m.id)}`}
                  // >

                  //   <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-sky-500/80 hover:bg-slate-900 transition cursor-pointer">
                  //     <EmbedMap zipFromId={zipFromId} />
                  //     <div className="flex justify-between gap-2">
                  //       <div>
                  //         <h3 className="font-semibold text-sm">
                  //           {title}
                  //         </h3>
                  //         {m.summary?.asOf && (
                  //           <p className="text-[10px] text-slate-500">
                  //             Updated{" "}
                  //             {new Date(
                  //               m.summary.asOf
                  //             ).toLocaleDateString()}
                  //           </p>
                  //         )}
                  //       </div>
                  //     </div>

                  //     {m.summary ? (
                  //       <div className="mt-3 space-y-1 text-xs">
                  //         {m.summary.medianPrice && (
                  //           <p>
                  //             Avg home price{" "}
                  //             <span className="font-semibold text-sky-300">
                  //               $
                  //               {Math.round(
                  //                 m.summary.medianPrice
                  //               ).toLocaleString()}
                  //             </span>
                  //           </p>
                  //         )}
                  //         {m.summary.medianRent && (
                  //           <p className="text-slate-400">
                  //             Est. rent $
                  //             {Math.round(
                  //               m.summary.medianRent
                  //             ).toLocaleString()}
                  //           </p>
                  //         )}
                  //         {m.summary.dom && (
                  //           <p className="text-slate-400">
                  //             Days on market {m.summary.dom}
                  //           </p>
                  //         )}
                  //       </div>
                  //     ) : (
                  //       <p className="mt-3 text-xs text-slate-500">
                  //         No snapshot yet.
                  //       </p>
                  //     )}
                  //   </div>
                  // </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
