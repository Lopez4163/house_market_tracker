// scripts/seed-markets.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const markets = [
    {
      id: "zip:18504",
      city: "Scranton",
      state: "PA",
      scope: "core",          // 👈 IMPORTANT: matches your Prisma model
    },
    {
      id: "zip:11368",
      city: "Queens",
      state: "NY",
      scope: "core",
    },
  ];

  for (const m of markets) {
    await prisma.market.upsert({
      where: { id: m.id },
      update: {
        city: m.city,
        state: m.state,
        scope: m.scope,
      },
      create: {
        id: m.id,
        city: m.city,
        state: m.state,
        scope: m.scope,
      },
    });
  }

  console.log("Seeded core markets ✅");
}

main()
  .catch((e) => {
    console.error("Seed error ❌", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
