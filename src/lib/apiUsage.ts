// src/lib/apiUsage.ts
import { prisma } from "@/lib/prisma";

const RENTCAST_MONTHLY_LIMIT = 50;

function getYearMonth(d = new Date()) {
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// Helper to attach HTTP status + code to errors
function makeHttpError(message: string, status: number, code?: string) {
  const err: any = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

// Parse: "[RentCast] 429 Too Many Requests: ..."
function parseRentcastStatus(message: string): number | null {
  const m = message.match(/^\[RentCast\]\s+(\d{3})\b/);
  return m ? Number(m[1]) : null;
}

export async function withRentCastBudget<T>(fn: () => Promise<T>): Promise<T> {
  const { year, month } = getYearMonth();

  // 1) Ensure row exists
  await prisma.apiUsage.upsert({
    where: { provider_year_month: { provider: "rentcast", year, month } },
    create: { provider: "rentcast", year, month, calls: 0 },
    update: {},
  });

  // 2) Atomic reserve (prevents races)
  const reserved = await prisma.apiUsage.updateMany({
    where: {
      provider: "rentcast",
      year,
      month,
      calls: { lt: RENTCAST_MONTHLY_LIMIT },
    },
    data: { calls: { increment: 1 } },
  });

  if (reserved.count === 0) {
    throw makeHttpError(
      "API quota exhausted. Cannot make new RentCast calls right now.",
      429,
      "RENTCAST_QUOTA_EXHAUSTED"
    );
  }

  // 3) Call provider outside transaction
  try {
    return await fn();
  } catch (e: any) {
    // 🔥 IMPORTANT: log & preserve the real cause
    console.error("[withRentCastBudget] raw provider error:", e);

    const msg = String(e?.message ?? "");
    const status = parseRentcastStatus(msg);

    // Refund policy (same as your intent)
    const shouldRefund = status == null ? true : status === 429 || status >= 500;

    if (shouldRefund) {
      await prisma.apiUsage.update({
        where: { provider_year_month: { provider: "rentcast", year, month } },
        data: { calls: { decrement: 1 } },
      });
    }

    // If helper itself was used elsewhere and threw its own quota error
    if (msg === "RentCast monthly call limit reached") {
      throw makeHttpError(
        "API quota exhausted. Cannot make new RentCast calls right now.",
        429,
        "RENTCAST_QUOTA_EXHAUSTED"
      );
    }

    // If it's a RentCast HTTP error string, forward a meaningful status
    if (msg.startsWith("[RentCast]")) {
      const s = status ?? 502;
    
      // ✅ Special-case: no data for ZIP (RentCast 404 resource/not-found)
      if (s === 404) {
        // refund so this doesn't burn budget
        await prisma.apiUsage.update({
          where: { provider_year_month: { provider: "rentcast", year, month } },
          data: { calls: { decrement: 1 } },
        });
    
        throw makeHttpError(
          "No RentCast data available for that ZIP code. Try a nearby ZIP or a different market.",
          422,
          "RENTCAST_NO_DATA"
        );
      }
    
      if (s === 429) {
        throw makeHttpError(
          "RentCast rate limit/quota hit. Try again later.",
          429,
          "RENTCAST_RATE_LIMIT"
        );
      }
    
      // Other 4xx/5xx → upstream issue
      throw makeHttpError(
        `RentCast request failed (${s}). Try again later.`,
        502,
        "RENTCAST_PROVIDER_ERROR"
      );
    }
    

    // Unknown error: include original message (critical for debugging)
    throw makeHttpError(
      msg ? `Upstream request failed: ${msg}` : "Upstream request failed. Try again later.",
      502,
      "UPSTREAM_ERROR"
    );
  }
}
