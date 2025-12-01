import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import MarketDetailClient from "@/components/MarketDetailClient";


type Params = {
  params: { id: string };
};

// GET /api/v1/markets/:id/summary
export async function GET(_req: Request, { params }: Params) {
  const { id } = params;

  const market = await prisma.market.findUnique({
    where: { id },
  });

  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
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
      dimensions: snapshot.dimensions,
      kpis: snapshot.kpis,
      series: snapshot.series,
      sourceMeta: snapshot.sourceMeta,
    },
  });
}
