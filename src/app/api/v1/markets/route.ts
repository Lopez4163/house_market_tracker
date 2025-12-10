// src/app/api/v1/markets/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchRentCastAggregate } from "@/providers/rentcast";
import { resolveZip } from "@/lib/geo";

type PropertyType = "sfh" | "condo" | "2to4";

type PostBody = {
  zip: string;
  propertyType?: PropertyType;
};

function isFresh(asOf: Date, ttlHours = 24) {
  return Date.now() - asOf.getTime() < ttlHours * 60 * 60 * 1000;
}

// POST /api/v1/markets
// Add a ZIP → ensure fresh snapshot → return market + snapshot
export async function POST(req: Request) {
  const body = (await req.json()) as PostBody;
  const rawZip = body.zip ?? "";
  const zip = rawZip.toString().trim();
  const propertyType = body.propertyType ?? "sfh";

  if (!/^\d{5}$/.test(zip)) {
    return NextResponse.json(
      { error: "zip (5 digits) is required" },
      { status: 400 }
    );
  }

  const marketId = `zip:${zip}`;

  // 1. Resolve ZIP → city/state
  const loc = await resolveZip(zip);
  const city = loc?.city ?? null;
  const state = loc?.stateCode ?? null;

  // 2. Upsert Market
  const market = await prisma.market.upsert({
    where: { id: marketId },
    update: {
      city: city ?? undefined,
      state: state ?? undefined,
      scope: "city",
    },
    create: {
      id: marketId,
      city,
      state,
      scope: "city",
    },
  });

  // 3. Find latest snapshot
  let snapshot = await prisma.snapshot.findFirst({
    where: { marketId },
    orderBy: { asOf: "desc" },
  });

  // 4. If no snapshot or stale → call RentCast + create new snapshot
  if (!snapshot || !isFresh(snapshot.asOf)) {
    const dims = { propertyType };
    const aggregate = await fetchRentCastAggregate(marketId, dims);

    snapshot = await prisma.snapshot.create({
      data: {
        marketId,
        asOf: aggregate.asOf,
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
      hidden: m.hidden,
      summary,
    };
  });

  return NextResponse.json(items);
}
