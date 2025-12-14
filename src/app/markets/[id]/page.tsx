// src/app/markets/[id]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MarketDetailClient from "@/components/MarketDetailClient";
import { EmbedMap } from "@/components/ui/embedmap";

// Params can be an object or a Promise depending on Next/Turbopack behavior
type Params = { id: string };
type ParamsInput = Params | Promise<Params>;

// Simple alias map: old city IDs -> canonical zip IDs
const MARKET_ALIAS: Record<string, string> = {
  "city:PA:Scranton": "zip:18504",
  "city:NY:Queens": "zip:11368",
};

export default async function MarketDetailPage({
  params,
}: {
  params: ParamsInput;
}) {
  // Normalize both Promise and plain object:
  const resolved = await Promise.resolve(params); // e.g. { id: "city%3APA%3AScranton" } or { id: "zip%3A18504" }

  const encodedId = resolved?.id;
  if (!encodedId) notFound();

  const rawId = decodeURIComponent(encodedId); // "city:PA:Scranton" or "zip:18504"

  // If it's an old city-style ID, map it to the new zip-based ID.
  const id = MARKET_ALIAS[rawId] ?? rawId; // -> "zip:18504"

  // Fetch Market by canonical ID
  const market = await prisma.market.findUnique({
    where: { id },
  });

  if (!market) notFound();

  const cityLabel = `${market.city ?? "Unknown"}, ${market.state ?? "??"}`;


  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">{cityLabel}</h1>
          <p className="text-xs text-slate-50">
            Market ID: <code>{market.id}</code>
          </p>
            <EmbedMap zipCode={id}/>
        </header>

        {/* KPI + chart logic lives in client component */}
        <MarketDetailClient marketId={market.id} />
      </div>
    </div>
  );
}
