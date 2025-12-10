import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  console.log("Hide market request received");
  const { id } = await req.json();
  console.log("Market ID to hide:", id);
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = await prisma.market.update({
    where: { id },
    data: { hidden: true },
  });

  return NextResponse.json({ ok: true });
}
