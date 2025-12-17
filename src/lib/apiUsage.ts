// src/lib/apiUsage.ts
import { prisma } from "@/lib/prisma";

const RENTCAST_MONTHLY_LIMIT = 50;

function getYearMonth(d = new Date()) {
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export async function withRentCastBudget<T>(fn: () => Promise<T>): Promise<T> {
  const { year, month } = getYearMonth();

  // 1) Ensure row exists (no long tx)
  await prisma.apiUsage.upsert({
    where: {
      provider_year_month: { provider: "rentcast", year, month },
    },
    create: { provider: "rentcast", year, month, calls: 0 },
    update: {},
  });

  // 2) Atomically reserve one call (this is the important part)
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
    const err: any = new Error("RentCast monthly call limit reached");
    err.status = 429;
    throw err;
  }

  // 3) Do the external call OUTSIDE any transaction
  try {
    return await fn();
  } catch (e) {
    // Optional: refund if the external call failed
    // (Only do this if you define "calls" as successful calls, not attempts.)
    await prisma.apiUsage.update({
      where: {
        provider_year_month: { provider: "rentcast", year, month },
      },
      data: { calls: { decrement: 1 } },
    });

    throw e;
  }
}
