// src/app/api/v1/markets/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchRentCastAggregate } from "@/providers/rentcast";
import { resolveZip } from "@/lib/geo";
import { withRentCastBudget } from "@/lib/apiUsage";

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
  try {
    const body = (await req.json()) as PostBody;
    const zip = (body.zip ?? "").toString().trim();
    const propertyType = body.propertyType ?? "sfh";

    if (!/^\d{5}$/.test(zip)) {
      return NextResponse.json(
        { error: "zip (5 digits) is required", code: "INVALID_ZIP" },
        { status: 400 }
      );
    }

    const marketId = `zip:${zip}`;

    // 1) Find latest snapshot first
    let snapshot = await prisma.snapshot.findFirst({
      where: { marketId },
      orderBy: { asOf: "desc" },
    });

    // 2) If stale/missing -> call RentCast (budget-guarded)
    // BUT do NOT create snapshot until Market exists (FK)
    let aggregate: any = null;

    if (!snapshot || !isFresh(snapshot.asOf)) {
      const dims = { propertyType };

      aggregate = await withRentCastBudget(() =>
        fetchRentCastAggregate(marketId, dims)
      );
    }

    // 3) Upsert Market (only after we know RentCast didn't fail)
    const loc = await resolveZip(zip);
    const city = loc?.city ?? null;
    const state = loc?.stateCode ?? null;

    const market = await prisma.market.upsert({
      where: { id: marketId },
      update: {
        city: city ?? undefined,
        state: state ?? undefined,
        scope: "city",
        hidden: false,
      },
      create: {
        id: marketId,
        city,
        state,
        scope: "city",
        hidden: false,
      },
    });

    // 4) If we fetched new data, now create snapshot (FK is satisfied)
    if (aggregate) {
      snapshot = await prisma.snapshot.create({
        data: {
          marketId: market.id, // same as marketId, but explicit
          asOf: aggregate.asOf,
          kpis: aggregate.kpis as any,
          series: aggregate.series as any,
          sourceMeta: aggregate.sourceMeta as any,
        },
      });
    }

    return NextResponse.json({ market, snapshot }, { status: 200 });
  } catch (e: any) {
    console.error(e);

    return NextResponse.json(
      { error: e?.message ?? "Server error", code: e?.code ?? "SERVER_ERROR" },
      { status: e?.status ?? 500 }
    );
  }
}


// GET /api/v1/markets
// List all markets with their latest snapshot (for cards)
export async function GET() {
  const markets = await prisma.market.findMany({
    where: { hidden: false },
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

  return NextResponse.json(items, { status: 200 });
}
