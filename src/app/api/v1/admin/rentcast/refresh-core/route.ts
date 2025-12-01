// src/app/api/admin/rentcast/refresh-core/route.ts
import { NextResponse } from "next/server";
import { CORE_MARKET_IDS } from "@/config/markets";
import { fetchRentCastAggregateSafe } from "@/providers/rentcast";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const results: { marketId: string; ok: boolean; error?: string }[] = [];

  for (const marketId of CORE_MARKET_IDS) {
    try {
      const snapshot = await fetchRentCastAggregateSafe(marketId, {});

      await prisma.snapshot.create({
        data: {
          marketId,
          propertyType: "all",
          asOf: snapshot.asOf,
          kpis: snapshot.kpis,
          series: snapshot.series,
        },
      });

      results.push({ marketId, ok: true });
    } catch (err: any) {
      results.push({
        marketId,
        ok: false,
        error: err?.message ?? "Unknown error",
      });

      // If we hit the monthly limit error, stop looping
      if (String(err?.message ?? "").includes("monthly call limit")) {
        break;
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}
