// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.market.upsert({
    where: { id: "city:PA:Scranton" },
    update: {},
    create: {
      id: "city:PA:Scranton",
      scope: "city",
      city: "Scranton",
      state: "PA",
    },
  });

  await prisma.market.upsert({
    where: { id: "city:NY:Queens" },
    update: {},
    create: {
      id: "city:NY:Queens",
      scope: "city",
      city: "Queens",
      state: "NY",
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
