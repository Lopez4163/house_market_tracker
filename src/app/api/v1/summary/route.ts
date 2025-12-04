// src/app/api/v1/summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchRentCastAggregate } from "@/providers/rentcast";

function isFresh(asOf: Date, ttlHours = 24) {
  return Date.now() - asOf.getTime() < ttlHours * 60 * 60 * 1000;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const marketId = searchParams.get("marketId");

  if (!marketId) {
    return NextResponse.json(
      { error: "marketId is required" },
      { status: 400 }
    );
  }

  let stale = false;
  let error: string | undefined;

  // latest snapshot for this market, propertyType = 'all'
  let snapshot = await prisma.snapshot.findFirst({
    where: { marketId, propertyType: "all" },
    orderBy: { asOf: "desc" },
  });

  const needsRefresh =
    !snapshot || !isFresh(snapshot.asOf, 24);

  if (needsRefresh) {
    try {
      const providerSnapshot = await fetchRentCastAggregate(marketId, {});

      snapshot = await prisma.snapshot.create({
        data: {
          marketId,
          propertyType: "all",
          asOf: providerSnapshot.asOf,
          kpis: providerSnapshot.kpis,
          series: providerSnapshot.series,
          sourceMeta: providerSnapshot.sourceMeta ?? null,
        } as any,
      });

      stale = false;
    } catch (e: any) {
      // if we had an old snapshot, mark stale and keep using it
      if (snapshot) {
        stale = true;
        error =
          e?.message ??
          "Failed to refresh RentCast data; using last snapshot.";
      } else {
        return NextResponse.json(
          {
            error:
              e?.message ??
              "Failed to load RentCast data and no snapshot available.",
          },
          { status: 500 }
        );
      }
    }
  }

  if (!snapshot) {
    return NextResponse.json(
      { error: "No snapshot found for this market" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    snapshot,
    stale,
    error,
  });
}
