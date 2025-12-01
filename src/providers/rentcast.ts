// src/providers/rentcast.ts
import { withRentCastBudget } from "@/lib/apiUsage";

export type Dimensions = { propertyType?: "sfh" | "condo" | "2to4" };

export type ProviderSnapshot = {
  asOf: Date;
  dimensions: Dimensions;
  kpis: {
    medianPrice: number | null;
    medianRent: number | null;
    ppsf: number | null;
    dom: number | null;
    confidence: number | null;
  };
  series: {
    date: string; // YYYY-MM-DD
    medianPrice: number | null;
    medianRent: number | null;
  }[];
};

const RENTCAST_BASE_URL =
  process.env.RENTCAST_BASE_URL ?? "https://api.rentcast.io";
const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY;

if (!RENTCAST_API_KEY) {
  console.warn(
    "[RentCast] Missing RENTCAST_API_KEY – provider calls will fail until set."
  );
}

/**
 * Parse your `marketId` into city/state or zip.
 *
 * Supports:
 * - "city:PA:Scranton"
 * - "zip:18508"
 *
 * Adjust this if your Market.id format is different.
 */
function parseMarketId(marketId: string): {
  city?: string;
  state?: string;
  zip?: string;
} {
  const [kind, ...rest] = marketId.split(":");

  if (kind === "city" && rest.length >= 2) {
    const [state, ...cityParts] = rest;
    const city = decodeURIComponent(cityParts.join(":"));
    return { state, city };
  }

  if (kind === "zip" && rest.length === 1) {
    return { zip: rest[0] };
  }

  // Fallback: you can decide how to handle weird ids
  return {};
}

/**
 * Low-level helper to call a RentCast endpoint.
 * Every call goes through `withRentCastBudget`, so it increments your ApiUsage.
 */
async function rentcastFetch(
  path: string,
  searchParams: Record<string, string>
): Promise<any> {
  if (!RENTCAST_API_KEY) {
    throw new Error("RENTCAST_API_KEY not set");
  }

  return withRentCastBudget(async () => {
    const url = new URL(path, RENTCAST_BASE_URL);

    Object.entries(searchParams).forEach(([k, v]) =>
      url.searchParams.set(k, v)
    );

    const res = await fetch(url.toString(), {
      headers: {
        "X-Api-Key": RENTCAST_API_KEY,
      },
      // optional: let Next.js cache at edge if you want
      next: { revalidate: 60 * 60 }, // 1 hour
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `[RentCast] ${res.status} ${res.statusText}: ${text || "No body"}`
      );
    }

    return res.json();
  });
}

/**
 * Simple median helper.
 */
function median(nums: number[]): number | null {
  const arr = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!arr.length) return null;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 === 0
    ? (arr[mid - 1] + arr[mid]) / 2
    : arr[mid];
}

/**
 * Build a basic monthly time series from raw sales + rental data.
 * Buckets by YYYY-MM-01 and computes medianPrice/medianRent per month.
 */
function buildSeries(sales: any[], rentals: any[]) {
  type Bucket = { prices: number[]; rents: number[] };
  const buckets = new Map<string, Bucket>();

  function addToBucket(dateStr: string | undefined, price?: number, rent?: number) {
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-01`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { prices: [], rents: [] };
      buckets.set(key, bucket);
    }

    if (typeof price === "number") bucket.prices.push(price);
    if (typeof rent === "number") bucket.rents.push(rent);
  }

  sales.forEach((s) =>
    addToBucket(
      s.closeDate ?? s.lastSaleDate,
      s.price ?? s.lastSalePrice,
      undefined
    )
  );
  rentals.forEach((r) =>
    addToBucket(
      r.listDate ?? r.lastSeenDate,
      undefined,
      r.rent ?? r.listPrice ?? r.monthly_rent
    )
  );

  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, bucket]) => ({
      date,
      medianPrice: median(bucket.prices),
      medianRent: median(bucket.rents),
    }));
}

/**
 * High-level aggregate: calls RentCast, aggregates metrics, returns normalized data.
 *
 * NOTE: This example uses two endpoints (`/v1/sales` and `/v1/rentals`).
 * That means **2 real RentCast calls per market refresh**, and both are tracked
 * via `withRentCastBudget` inside `rentcastFetch`.
 *
 * You can tweak endpoints/fields to match your RentCast plan & docs.
 */
export async function fetchRentCastAggregate(
  marketId: string,
  dims: Dimensions
): Promise<ProviderSnapshot> {
  const location = parseMarketId(marketId);

  // ---- 1) Fetch recent sales data (for medianPrice, ppsf, dom) ----
  const salesParams: Record<string, string> = {
    limit: "50",
    status: "Closed",
  };

  if (location.zip) {
    salesParams.zip = location.zip;
  } else if (location.city && location.state) {
    salesParams.city = location.city;
    salesParams.state = location.state;
  }

  // TODO: adjust endpoint path to match RentCast docs if needed
  const sales = (await rentcastFetch("/v1/sales", salesParams)) ?? [];

  const salePrices: number[] = sales
    .map((s: any) => s.price ?? s.lastSalePrice)
    .filter((v: any) => typeof v === "number");

  const salePpsf: number[] = sales
    .map((s: any) => s.pricePerSquareFoot ?? s.price_per_sqft)
    .filter((v: any) => typeof v === "number");

  const domValues: number[] = sales
    .map((s: any) => s.daysOnMarket ?? s.days_on_market)
    .filter((v: any) => typeof v === "number");

  const medianPrice = median(salePrices);
  const ppsf = median(salePpsf);
  const dom = median(domValues);

  // ---- 2) Fetch recent rentals data (for medianRent) ----
  const rentalsParams: Record<string, string> = {
    limit: "50",
    status: "Active",
  };

  if (location.zip) {
    rentalsParams.zip = location.zip;
  } else if (location.city && location.state) {
    rentalsParams.city = location.city;
    rentalsParams.state = location.state;
  }

  // TODO: adjust endpoint path to match RentCast docs if needed
  const rentals = (await rentcastFetch("/v1/rentals", rentalsParams)) ?? [];

  const rentalRents: number[] = rentals
    .map((r: any) => r.rent ?? r.listPrice ?? r.monthly_rent)
    .filter((v: any) => typeof v === "number");

  const medianRent = median(rentalRents);

  // ---- 3) Very simple "confidence" metric based on sample size ----
  const sampleSize = salePrices.length + rentalRents.length;
  const confidence =
    sampleSize >= 50 ? 0.9 : sampleSize >= 20 ? 0.7 : sampleSize > 0 ? 0.5 : 0.2;

  // ---- 4) Build monthly series ----
  const series = buildSeries(sales, rentals);

  return {
    asOf: new Date(),
    dimensions: dims,
    kpis: {
      medianPrice,
      medianRent,
      ppsf,
      dom,
      confidence,
    },
    series,
  };
}
