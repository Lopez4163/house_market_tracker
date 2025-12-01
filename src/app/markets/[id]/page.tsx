// src/app/markets/[id]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MarketDetailClient from "@/components/MarketDetailClient";

// Params can be an object or a Promise depending on Next/Turbopack behavior
type Params = { id: string };
type ParamsInput = Params | Promise<Params>;

export default async function MarketDetailPage({
  params,
}: {
  params: ParamsInput;
}) {
  // Normalize both Promise and plain object:
  const resolved = await Promise.resolve(params); // { id: "city%3APA%3AScranton" }

  const encodedId = resolved?.id;
  if (!encodedId) notFound();

  const id = decodeURIComponent(encodedId); // "city:PA:Scranton"

  // Fetch Market
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
          <p className="text-xs text-slate-500">
            Market ID: <code>{market.id}</code>
          </p>
          <p className="text-xs text-slate-400">
            Toggle between different property types to see prices and rents.
          </p>
        </header>

        {/* All KPI + chart logic moves into the client component */}
        <MarketDetailClient marketId={market.id} />
      </div>
    </div>
  );
}
