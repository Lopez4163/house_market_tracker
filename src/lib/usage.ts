import { prisma } from "@/lib/prisma";

function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`;
}

export async function incrementRentCastUsage(limit = 50) {
  const period = monthKey();
  const row = await prisma.usage.upsert({
    where: { period },
    create: { period, count: 0 },
    update: {},
  });

  if (row.count >= limit) return { ok: false, count: row.count, period };

  const updated = await prisma.usage.update({
    where: { period },
    data: { count: { increment: 1 } },
  });

  return { ok: true, count: updated.count, period };
}
