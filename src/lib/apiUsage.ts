// src/lib/apiUsage.ts
import { prisma } from "@/lib/prisma";

const RENTCAST_MONTHLY_LIMIT = 50;

export async function withRentCastBudget<T>(
  fn: () => Promise<T>
): Promise<T> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1..12

  return prisma.$transaction(async (tx) => {
    // Ensure row exists for this provider/year/month
    console.log("Checking API usage for RentCast", year, month);
    const row = await tx.apiUsage.upsert({
      where: {
        // This relies on @@unique([provider, year, month]) in schema.prisma
        provider_year_month: {
          provider: "rentcast",
          year,
          month,
        },
      },
      create: {
        provider: "rentcast",
        year,
        month,
        calls: 0,
      },
      update: {},
    });

    if (row.calls >= RENTCAST_MONTHLY_LIMIT) {
      throw new Error("RentCast monthly call limit reached");
    }

    await tx.apiUsage.update({
      where: {
        provider_year_month: {
          provider: "rentcast",
          year,
          month,
        },
      },
      data: {
        calls: { increment: 1 },
      },
    });

    // Perform the external API call the caller passed in
    const result = await fn();
    return result;
  });
}
