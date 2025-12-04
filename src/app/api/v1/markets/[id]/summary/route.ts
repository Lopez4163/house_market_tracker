// src/app/api/v1/markets/[id]/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/v1/markets/:id/summary
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Next 16: params may be a Promise, so normalize it
  const { id } = await context.params;

  const market = await prisma.market.findUnique({
    where: { id },
  });

  if (!market) {
    return NextResponse.json(
      { error: "Market not found" },
      { status: 404 }
    );
  }

  const snapshot = await prisma.snapshot.findFirst({
    where: { marketId: id },
    orderBy: { asOf: "desc" },
  });

  if (!snapshot) {
    return NextResponse.json(
      { error: "No snapshot for this market yet" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    market,
    snapshot: {
      id: snapshot.id,
      asOf: snapshot.asOf,
      // dimensions removed because the column no longer exists in your schema
      kpis: snapshot.kpis,
      series: snapshot.series,
      sourceMeta: snapshot.sourceMeta,
    },
  });
}
