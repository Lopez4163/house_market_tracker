// src/app/api/v1/admin/rentcast/refresh-core/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CORE_MARKET_IDS } from "@/config/markets";
import { fetchRentCastAggregate } from "@/providers/rentcast";

export async function POST() {
  const results: { marketId: string; ok: boolean; error?: string }[] = [];

  for (const marketId of CORE_MARKET_IDS) {
    try {
      // Pull fresh data from RentCast using /v1/market/data
      const snapshot = await fetchRentCastAggregate(marketId, {});

      // Store snapshot as "all" property types for this market
      await prisma.snapshot.create({
        data: {
          marketId,
          propertyType: "all",
          asOf: snapshot.asOf,
          kpis: snapshot.kpis,
          series: snapshot.series,
          sourceMeta: snapshot.sourceMeta ?? null,
        } as any,
      });

      results.push({ marketId, ok: true });
    } catch (err: any) {
      results.push({
        marketId,
        ok: false,
        error: err?.message ?? "Unknown error",
      });

      // If we hit call limit, no point continuing
      if (String(err?.message ?? "").includes("monthly call limit")) {
        break;
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}
