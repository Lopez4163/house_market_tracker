import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { fetchRentCastAggregate } from "@/providers/rentcast";

type PropertyType = "sfh" | "condo" | "2to4";

type PostBody = {
  city: string;
  state: string;
  propertyType?: PropertyType;
};

function isFresh(asOf: Date, ttlHours = 24) {
  return Date.now() - asOf.getTime() < ttlHours * 60 * 60 * 1000;
}

// POST /api/v1/markets
// Add a city → ensure fresh snapshot → return market + snapshot
export async function POST(req: Request) {
  const body = (await req.json()) as PostBody;
  const city = body.city?.trim();
  const state = body.state?.trim();
  const propertyType = body.propertyType ?? "sfh";

  if (!city || !state) {
    return NextResponse.json(
      { error: "city and state are required" },
      { status: 400 }
    );
  }

  const marketId = slugify(`${city}-${state}`); // e.g. "scranton-pa"

  // 1. Find or create Market
  let market = await prisma.market.findUnique({
    where: { id: marketId },
  });

  if (!market) {
    market = await prisma.market.create({
      data: {
        id: marketId,
        scope: "city",
        city,
        state,
      },
    });
  }

  // 2. Find latest snapshot
  let snapshot = await prisma.snapshot.findFirst({
    where: { marketId },
    orderBy: { asOf: "desc" },
  });

  // 3. If no snapshot or stale → call provider + create new snapshot
  if (!snapshot || !isFresh(snapshot.asOf)) {
    const dims = { propertyType };
    const aggregate = await fetchRentCastAggregate(marketId, dims);

    snapshot = await prisma.snapshot.create({
      data: {
        marketId,
        asOf: aggregate.asOf,
        dimensions: aggregate.dimensions as any,
        kpis: aggregate.kpis as any,
        series: aggregate.series as any,
        sourceMeta: aggregate.sourceMeta as any,
      },
    });
  }

  return NextResponse.json({ market, snapshot });
}

// GET /api/v1/markets
// List all markets with their latest snapshot (for cards)
export async function GET() {
  const markets = await prisma.market.findMany({
    where: { scope: "city" },
    include: {
      snapshots: {
        orderBy: { asOf: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const items = markets.map((m) => {
    const snap = m.snapshots[0];

    let summary = null as null | {
      asOf: string;
      medianPrice?: number;
      medianRent?: number;
      dom?: number;
    };

    if (snap) {
      const kpis = snap.kpis as any;
      summary = {
        asOf: snap.asOf.toISOString(),
        medianPrice: kpis?.medianPrice,
        medianRent: kpis?.medianRent,
        dom: kpis?.dom,
      };
    }

    return {
      id: m.id,
      city: m.city,
      state: m.state,
      summary,
    };
  });

  return NextResponse.json(items);
}
