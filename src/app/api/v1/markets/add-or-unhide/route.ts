// src/app/api/v1/markets/add-or-unhide/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { zip } = await req.json();

    if (!zip || typeof zip !== "string") {
      return NextResponse.json({ error: "ZIP is required" }, { status: 400 });
    }

    const trimmedZip = zip.trim();
    if (!/^\d{5}$/.test(trimmedZip)) {
      return NextResponse.json({ error: "Invalid ZIP format" }, { status: 400 });
    }

    const id = `zip:${trimmedZip}`;

    // 1. Check if market exists
    const existing = await prisma.market.findUnique({
      where: { id },
    });

    // 2. Case C – does NOT exist → create new market
    if (!existing) {
      // TODO: Replace this with your real RentCast + Snapshot logic
      // For now we just create a bare market row.
      const market = await prisma.market.create({
        data: {
          id,
          zip: trimmedZip,
          hidden: false,
          // city, state, etc. if you can infer/fetch them
        },
      });

      // Optionally, create an initial snapshot here based on RentCast aggregates.

      return NextResponse.json({
        status: "created",
        market,
      });
    }

    // 3. Case A – exists AND hidden === true → unhide
    if (existing.hidden) {
      const updated = await prisma.market.update({
        where: { id },
        data: { hidden: false },
      });

      return NextResponse.json({
        status: "unhidden",
        market: updated,
      });
    }

    // 4. Case B – exists AND hidden === false → already visible
    return NextResponse.json({
      status: "already-visible",
      market: existing,
    });
  } catch (err) {
    console.error("add-or-unhide error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
