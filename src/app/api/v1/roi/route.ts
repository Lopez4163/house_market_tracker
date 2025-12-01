// src/app/api/v1/roi/route.ts
import { NextResponse } from "next/server";
import { monthlyPI } from "@/domain/finance";

export async function POST(req: Request) {
  const body = await req.json();
  const {
    price = 200000, downPct = 5, rate = 6.75, termYears = 30,
    taxesYr = 3600, insuranceYr = 1200, hoaMo = 0,
    units = 1, rentPerUnit = 1400, vacancyPct = 5, repairsPct = 5, pmPct = 8,
    closingCosts = 0, yearsOut = 5, appreciationPct = 2
  } = body || {};

  const down = price * (downPct/100);
  const principal = price - down;
  const PAndI = monthlyPI(principal, rate, termYears);
  const piti = PAndI + taxesYr/12 + insuranceYr/12 + hoaMo;

  const gross = units * rentPerUnit;
  const opex = gross * ((vacancyPct + repairsPct + pmPct)/100);
  const noi = gross - opex - taxesYr/12 - insuranceYr/12 - hoaMo;
  const cashFlowMo = noi - PAndI;

  const capRate = (noi * 12) / price;
  const coc = (cashFlowMo * 12) / (down + closingCosts);

  return NextResponse.json({
    inputs: body,
    outputs: { piti, noi, cashFlowMo, capRate, coc, principal }
  });
}
