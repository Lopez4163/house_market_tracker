// // src/app/api/v1/summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchRentCastAggregate, type Dimensions } from "@/providers/rentcast";

function isFresh(asOf: Date, ttlDays = 7) {
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  return Date.now() - asOf.getTime() < ttlMs;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const marketId = searchParams.get("marketId");
  const propertyType = searchParams.get("propertyType") as
    | "sfh"
    | "condo"
    | "2to4"
    | null;

  if (!marketId) {
    return NextResponse.json(
      { error: "marketId is required" },
      { status: 400 }
    );
  }

  const dims: Dimensions = {};
  if (propertyType) dims.propertyType = propertyType;

  // 1) Try latest snapshot from DB
  const existing = await prisma.snapshot.findFirst({
    where: {
      marketId,
      propertyType: dims.propertyType ?? "all",
    },
    orderBy: { asOf: "desc" },
  });

  // If snapshot exists and is fresh (within 7 days), just return it
  if (existing && isFresh(existing.asOf, 7)) {
    return NextResponse.json(existing);
  }

  // 2) If not fresh, OPTIONAL: try to refresh from RentCast
  //    This is a backup, your weekly cron already keeps things updated.
  try {
    const providerSnapshot = await fetchRentCastAggregate(marketId, dims);

    const saved = await prisma.snapshot.create({
      data: {
        marketId,
        propertyType: dims.propertyType ?? "all",
        asOf: providerSnapshot.asOf,
        kpis: providerSnapshot.kpis,
        series: providerSnapshot.series,
      },
    });

    return NextResponse.json(saved);
  } catch (err: any) {
    // If we can't call RentCast (e.g. limit reached), but we have an old snapshot,
    // return the old one as a fallback rather than erroring.
    if (existing) {
      return NextResponse.json({
        ...existing,
        stale: true,
        error:
          err?.message ??
          "Failed to refresh from RentCast; returning last known snapshot.",
      });
    }

    // No snapshot and RentCast failed -> hard error
    return NextResponse.json(
      {
        error:
          err?.message ??
          "Failed to fetch data from RentCast and no local snapshot available.",
      },
      { status: 500 }
    );
  }
}








// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { fetchRentCastAggregate } from "@/providers/rentcast";
// import { incrementRentCastUsage } from "@/lib/usage";

// type PropertyType = "sfh" | "condo" | "2to4";
// type Dimensions = { propertyType?: PropertyType };

// const TTL_HOURS = 24 * 30; // ~monthly freshness

// function isFresh(asOf: Date, ttlHours = TTL_HOURS) {
//   return Date.now() - asOf.getTime() < ttlHours * 60 * 60 * 1000;
// }

// // JSON-equals utility for Prisma where on JSON field
// function dimsWhere(dim: Dimensions) {
//   return { equals: dim as any };
// }

// export async function GET(req: Request) {
//   const { searchParams } = new URL(req.url);
//   const cityParam = searchParams.get("city") || "Scranton, PA";
//   const typeParam = (searchParams.get("type") || "sfh") as PropertyType;

//   // TODO: real city -> marketId mapping; hard-pinned for now:
//   const marketId = "city:PA:Scranton";
//   const dimensions: Dimensions = { propertyType: typeParam };

//   // 1) ensure Market exists
//   const market = await prisma.market.findUnique({ where: { id: marketId } });
//   if (!market) {
//     return NextResponse.json(
//       { error: `Unknown market ${marketId}` },
//       { status: 404 }
//     );
//   }

//   // 2) cache-first by (marketId + dimensions)
//   const latest = await prisma.snapshot.findFirst({
//     where: { marketId, dimensions: dimsWhere(dimensions) },
//     orderBy: { asOf: "desc" },
//   });

//   if (latest && isFresh(latest.asOf)) {
//     return NextResponse.json({
//       market: { id: market.id, city: market.city, state: market.state },
//       asOf: latest.asOf,
//       dimensions: latest.dimensions,
//       kpis: latest.kpis,
//       series: latest.series,
//       meta: { source: "db-cache", cached: true },
//     });
//   }

//   // 3) need refresh → check monthly quota before calling provider
//   const quota = await incrementRentCastUsage(50);
//   if (!quota.ok) {
//     // Quota exhausted → serve last cached if available
//     if (latest) {
//       return NextResponse.json({
//         market: { id: market.id, city: market.city, state: market.state },
//         asOf: latest.asOf,
//         dimensions: latest.dimensions,
//         kpis: latest.kpis,
//         series: latest.series,
//         meta: {
//           source: "db-cache",
//           cached: true,
//           notice: `RentCast monthly limit reached for ${quota.period}; serving cached data.`,
//         },
//       });
//     }
//     // No cache to fall back to
//     return NextResponse.json(
//       {
//         error: `RentCast monthly limit reached for ${quota.period} and no cached snapshot exists.`,
//       },
//       { status: 429 }
//     );
//   }

//   try {
//     // ⬇️ pass marketId (string) + dimensions object
//     const fresh = await fetchRentCastAggregate(marketId, dimensions);

//     const up = await prisma.snapshot.create({
//       data: {
//         marketId: market.id,
//         asOf: new Date(),
//         dimensions: dimensions as any,
//         kpis: fresh.kpis as any,
//         series: fresh.series as any,
//         // ⬇️ provider returns `sourceMeta`, not `meta`
//         sourceMeta: fresh.sourceMeta as any,
//       },
//     });

//     return NextResponse.json({
//       market: { id: market.id, city: market.city, state: market.state },
//       asOf: up.asOf,
//       dimensions: up.dimensions,
//       kpis: up.kpis,
//       series: up.series,
//       meta: {
//         source: "provider->db",
//         cached: false,
//         callsUsed: quota.count,
//       },
//     });
//   } catch (e: any) {
//     // Provider failed → fall back to last cached if possible
//     if (latest) {
//       return NextResponse.json({
//         market: { id: market.id, city: market.city, state: market.state },
//         asOf: latest.asOf,
//         dimensions: latest.dimensions,
//         kpis: latest.kpis,
//         series: latest.series,
//         meta: {
//           source: "db-cache",
//           cached: true,
//           error: String(e?.message ?? e),
//         },
//       });
//     }
//     return NextResponse.json(
//       { error: "Failed to fetch provider data." },
//       { status: 502 }
//     );
//   }
// }
