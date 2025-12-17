"use client";

import Link from "next/link";
import { EmbedMap } from "@/components/ui/embedmap";
import type { MarketItem } from "@/app/page";

type MarketCardProps = {
  market: MarketItem;
  onHide: () => void;
};

export function MarketCard({ market, onHide }: MarketCardProps) {
  const zipCode = market.id.startsWith("zip:")
    ? market.id.slice(4)
    : market.id;

  const title =
    market.city && market.state
      ? `${market.city}, ${market.state} ${zipCode}`
      : `ZIP ${zipCode}`;

  return (
    <div
      className="
        relative group
        border border-white/15
        bg-white/5
        p-4
        transition
        hover:-translate-y-[1px]
        hover:border-white/30
      "
    >
      {onHide && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onHide();
          }}
          aria-label="Hide card"
          className="
            absolute top-2 right-2 z-10
            flex h-6 w-6 items-center justify-center
            border border-white/20
            bg-[#0B0B0F]
            text-white/50
            opacity-0 group-hover:opacity-100
            transition
            hover:text-red-600 hover:border-red-600/50
            hover:cursor-pointer
            focus-visible:opacity-100
          "
        >
          <span className="text-sm leading-none -mt-[1px]">×</span>
        </button>
      )}

      <Link href={`/markets/${encodeURIComponent(market.id)}`} className="block">
        {/* Map */}
        <div className="relative overflow-hidden border border-white/15 bg-[#0B0B0F]">
          <EmbedMap zipCode={zipCode} iframeClassName="pointer-events-none" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0B0B0F] to-transparent" />
        </div>

        {/* Title */}
        <div className="mt-3">
          <h3 className="text-sm font-medium text-white">
            {title}
          </h3>
          {market.summary?.asOf && (
            <p className="mt-0.5 text-[11px] text-white/55">
              Updated {new Date(market.summary.asOf).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* KPIs */}
        {market.summary ? (
          <div className="mt-3 space-y-1 text-xs">
            {market.summary.medianPrice && (
              <p className="text-white/70">
                Median price{" "}
                <span className="font-medium text-white">
                  ${Math.round(market.summary.medianPrice).toLocaleString()}
                </span>
              </p>
            )}

            {market.summary.medianRent && (
              <p className="text-white/65">
                Est. rent{" "}
                <span className="text-white/85">
                  ${Math.round(market.summary.medianRent).toLocaleString()}
                </span>
              </p>
            )}

            {market.summary.dom && (
              <p className="text-white/65">
                Days on market{" "}
                <span className="text-white/85">
                  {market.summary.dom}
                </span>
              </p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs text-white/50">
            No snapshot yet.
          </p>
        )}
      </Link>
    </div>
  );
}
