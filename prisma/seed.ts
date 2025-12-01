// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const markets = [
    {
      id: "city:PA:Scranton",
      scope: "city",
      city: "Scranton",
      state: "PA",
      zipGroup: ["18503", "18504", "18505"],
      lat: 41.4089,
      lng: -75.6624,
    },
    {
      id: "city:PA:Lancaster",
      scope: "city",
      city: "Lancaster",
      state: "PA",
      zipGroup: ["17601", "17602", "17603"],
      lat: 40.0379,
      lng: -76.3055,
    },
    {
      id: "city:PA:Allentown",
      scope: "city",
      city: "Allentown",
      state: "PA",
      zipGroup: ["18101", "18102", "18103"],
      lat: 40.6023,
      lng: -75.4714,
    },
    {
      id: "city:PA:Bethlehem",
      scope: "city",
      city: "Bethlehem",
      state: "PA",
      zipGroup: ["18015", "18018"],
      lat: 40.6259,
      lng: -75.3705,
    },
    {
      id: "city:PA:Reading",
      scope: "city",
      city: "Reading",
      state: "PA",
      zipGroup: ["19601", "19602", "19604"],
      lat: 40.3356,
      lng: -75.9269,
    },
    {
      id: "city:PA:Philadelphia",
      scope: "city",
      city: "Philadelphia",
      state: "PA",
      zipGroup: ["19104", "19111", "19124"],
      lat: 39.9526,
      lng: -75.1652,
    },
  ];

  for (const m of markets) {
    await prisma.market.upsert({
      where: { id: m.id },
      // if it exists, make sure fields stay up-to-date
      update: {
        scope: m.scope,
        city: m.city,
        state: m.state,
        zipGroup: m.zipGroup,
        lat: m.lat,
        lng: m.lng,
      },
      create: m,
    });
  }

  console.log(
    "Seeded markets:",
    markets.map((m) => m.id).join(", ")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
