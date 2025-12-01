// src/app/api/v1/markets/search/route.ts
import { NextResponse } from "next/server";
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase();
  // stub: return Scranton for anything
  const results = q ? [{ id: "city:PA:Scranton", label: "Scranton, PA" }] : [];
  return NextResponse.json(results);
}
