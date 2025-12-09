"use client";

import Link from "next/link";
import { EmbedMap } from "@/components/ui/embedmap";
import type { MarketItem } from "@/app/page"; // or move types to a shared /types file

type MarketCardProps = {
  market: MarketItem;
};

export function MarketCard({ market }: MarketCardProps) {
  const zipCode = market.id.startsWith("zip:")
    ? market.id.slice(4)
    : market.id;

  const title =
    market.city && market.state
      ? `${market.city}, ${market.state} ${zipCode}`
      : `ZIP ${zipCode}`;

  return (
    <Link href={`/markets/${encodeURIComponent(market.id)}`}>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-sky-500/80 hover:bg-slate-900 transition cursor-pointer">
        <EmbedMap zipCode={zipCode} iframeClassName={"pointer-events-none"} />

        <div className="flex justify-between gap-2 mt-3">
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            {market.summary?.asOf && (
              <p className="text-[10px] text-slate-500">
                Updated{" "}
                {new Date(market.summary.asOf).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {market.summary ? (
          <div className="mt-3 space-y-1 text-xs">
            {market.summary.medianPrice && (
              <p>
                Avg home price{" "}
                <span className="font-semibold text-sky-300">
                  ${Math.round(market.summary.medianPrice).toLocaleString()}
                </span>
              </p>
            )}

            {market.summary.medianRent && (
              <p className="text-slate-400">
                Est. rent $
                {Math.round(market.summary.medianRent).toLocaleString()}
              </p>
            )}

            {market.summary.dom && (
              <p className="text-slate-400">
                Days on market {market.summary.dom}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">No snapshot yet.</p>
        )}
      </div>
    </Link>
  );
}
