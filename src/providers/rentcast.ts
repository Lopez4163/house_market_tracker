// src/providers/rentcast.ts
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
    date: string;
    medianPrice: number | null;
    medianRent: number | null;
  }[];
  sourceMeta?: any; // per-type breakdown, provider info, etc.
};

const RENTCAST_BASE_URL =
  process.env.RENTCAST_BASE_URL ?? "https://api.rentcast.io";
const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY;

if (!RENTCAST_API_KEY) {
  console.warn(
    "[RentCast] Missing RENTCAST_API_KEY – provider calls will fail until set."
  );
}

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

  return {};
}

async function rentcastFetch(
  path: string,
  searchParams: Record<string, string>
): Promise<any> {
  if (!RENTCAST_API_KEY) {
    throw new Error("RENTCAST_API_KEY not set");
  }

  const url = new URL(path, RENTCAST_BASE_URL);
  Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));

  console.log("[RentCast] Calling:", url.toString());

  const res = await fetch(url.toString(), {
    headers: { "X-Api-Key": RENTCAST_API_KEY },
    next: { revalidate: 60 * 60 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `[RentCast] ${res.status} ${res.statusText}: ${text || "No body"}`
    );
  }

  return res.json();
}


// ===== /v1/markets types + fetch =====

type MarketDataResponse = {
  id: string;
  zipCode?: string;
  saleData?: any;
  rentalData?: any;
};

async function fetchMarketData(
  marketId: string
): Promise<MarketDataResponse> {
  const location = parseMarketId(marketId);
  const params: Record<string, string> = {};

  if (location.zip) {
    params.zipCode = location.zip;
  } else if (location.city && location.state) {
    params.city = location.city;
    params.state = location.state;
  } else {
    throw new Error(
      `[RentCast] Unsupported marketId format for /v1/markets: ${marketId}`
    );
  }

  const raw = await rentcastFetch("/v1/markets", params);

  // Be defensive: if RentCast ever returns an array, grab the first item
  if (Array.isArray(raw)) {
    if (!raw[0]) {
      throw new Error(
        `[RentCast] /v1/markets returned an empty array for ${marketId}`
      );
    }
    return raw[0] as MarketDataResponse;
  }

  return raw as MarketDataResponse;
}

// ===== helpers =====

type SimpleKpis = {
  medianPrice: number | null;
  medianRent: number | null;
  ppsf: number | null;
  dom: number | null;
  confidence: number | null;
};

function computeConfidence(sampleSize: number): number {
  if (sampleSize >= 200) return 0.95;
  if (sampleSize >= 100) return 0.9;
  if (sampleSize >= 40) return 0.7;
  if (sampleSize > 0) return 0.5;
  return 0.2;
}

function mapPropertyTypeToBucket(
  propertyType: string | null | undefined
): "sfh" | "condo" | "2to4" | "other" {
  const raw = (propertyType ?? "").toLowerCase();

  if (raw.includes("single")) return "sfh";
  if (raw.includes("condo")) return "condo";
  if (raw.includes("multi")) return "2to4";

  return "other";
}

// overall KPIs from saleData/rentalData (latest window)
function computeKpisFromMarketData(
  saleData: any | undefined,
  rentalData: any | undefined
): SimpleKpis {
  const medianPrice: number | null = saleData?.medianPrice ?? null;
  const medianRent: number | null = rentalData?.medianRent ?? null;
  const ppsf: number | null =
    saleData?.medianPricePerSquareFoot ?? null;
  const dom: number | null =
    saleData?.medianDaysOnMarket ?? null;

  const saleCount = saleData?.totalListings ?? 0;
  const rentalCount = rentalData?.totalListings ?? 0;
  const sampleSize = saleCount + rentalCount;

  const confidence = computeConfidence(sampleSize);

  return { medianPrice, medianRent, ppsf, dom, confidence };
}

// overall series from saleData.history + rentalData.history
function buildOverallSeriesFromHistory(
  saleData?: any,
  rentalData?: any
): { date: string; medianPrice: number | null; medianRent: number | null }[] {
  type Bucket = {
    date: string;
    medianPrice: number | null;
    medianRent: number | null;
  };

  const buckets = new Map<string, Bucket>();

  // helper to normalize date -> YYYY-MM
  function monthKeyFromDate(dateStr: string | undefined): string | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 7); // "YYYY-MM"
  }

  // sales side
  if (saleData?.history) {
    Object.values(saleData.history as any).forEach((entry: any) => {
      const key = monthKeyFromDate(entry.date);
      if (!key) return;
      const existing =
        buckets.get(key) ??
        ({
          date: entry.date,
          medianPrice: null,
          medianRent: null,
        } as Bucket);

      if (typeof entry.medianPrice === "number") {
        existing.medianPrice = entry.medianPrice;
      }

      buckets.set(key, existing);
    });
  }

  // rentals side
  if (rentalData?.history) {
    Object.values(rentalData.history as any).forEach((entry: any) => {
      const key = monthKeyFromDate(entry.date);
      if (!key) return;
      const existing =
        buckets.get(key) ??
        ({
          date: entry.date,
          medianPrice: null,
          medianRent: null,
        } as Bucket);

      if (typeof entry.medianRent === "number") {
        existing.medianRent = entry.medianRent;
      }

      buckets.set(key, existing);
    });
  }

  return Array.from(buckets.values()).sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return da - db;
  });
}

// per-type series for one bucket (sfh/condo/2to4)
function buildTypeSeries(
  bucketName: "sfh" | "condo" | "2to4",
  saleData?: any,
  rentalData?: any
): { date: string; medianPrice: number | null; medianRent: number | null }[] {
  type Bucket = {
    date: string;
    medianPrice: number | null;
    medianRent: number | null;
  };

  const buckets = new Map<string, Bucket>();

  function monthKeyFromDate(dateStr: string | undefined): string | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 7);
  }

  // sales history per type
  if (saleData?.history) {
    Object.values(saleData.history as any).forEach((entry: any) => {
      const key = monthKeyFromDate(entry.date);
      if (!key) return;

      const typeRow = (entry.dataByPropertyType ?? []).find(
        (row: any) =>
          mapPropertyTypeToBucket(row.propertyType) === bucketName
      );
      if (!typeRow) return;

      const existing =
        buckets.get(key) ??
        ({
          date: entry.date,
          medianPrice: null,
          medianRent: null,
        } as Bucket);

      if (typeof typeRow.medianPrice === "number") {
        existing.medianPrice = typeRow.medianPrice;
      }

      buckets.set(key, existing);
    });
  }

  // rental history per type
  if (rentalData?.history) {
    Object.values(rentalData.history as any).forEach((entry: any) => {
      const key = monthKeyFromDate(entry.date);
      if (!key) return;

      const typeRow = (entry.dataByPropertyType ?? []).find(
        (row: any) =>
          mapPropertyTypeToBucket(row.propertyType) === bucketName
      );
      if (!typeRow) return;

      const existing =
        buckets.get(key) ??
        ({
          date: entry.date,
          medianPrice: null,
          medianRent: null,
        } as Bucket);

      if (typeof typeRow.medianRent === "number") {
        existing.medianRent = typeRow.medianRent;
      }

      buckets.set(key, existing);
    });
  }

  return Array.from(buckets.values()).sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return da - db;
  });
}

// per-type KPIs + series
function computePerTypeFromMarketData(
  saleData?: any,
  rentalData?: any
): {
  sfh?: {
    kpis: SimpleKpis;
    series: { date: string; medianPrice: number | null; medianRent: number | null }[];
  };
  condo?: {
    kpis: SimpleKpis;
    series: { date: string; medianPrice: number | null; medianRent: number | null }[];
  };
  "2to4"?: {
    kpis: SimpleKpis;
    series: { date: string; medianPrice: number | null; medianRent: number | null }[];
  };
} {
  const result: any = {};

  const saleTypes = saleData?.dataByPropertyType ?? [];
  const rentalTypes = rentalData?.dataByPropertyType ?? [];

  function findTypeRow(arr: any[], bucket: "sfh" | "condo" | "2to4") {
    return arr.find(
      (row: any) => mapPropertyTypeToBucket(row.propertyType) === bucket
    );
  }

  (["sfh", "condo", "2to4"] as const).forEach((bucket) => {
    const saleRow = findTypeRow(saleTypes, bucket);
    const rentRow = findTypeRow(rentalTypes, bucket);

    if (!saleRow && !rentRow) {
      return; // no data for this type
    }

    const medianPrice: number | null = saleRow?.medianPrice ?? null;
    const medianRent: number | null = rentRow?.medianRent ?? null;
    const ppsf: number | null =
      saleRow?.medianPricePerSquareFoot ?? null;
    const dom: number | null =
      saleRow?.medianDaysOnMarket ?? null;

    const saleCount = saleRow?.totalListings ?? 0;
    const rentalCount = rentRow?.totalListings ?? 0;
    const sampleSize = saleCount + rentalCount;
    const confidence = computeConfidence(sampleSize);

    const kpis: SimpleKpis = {
      medianPrice,
      medianRent,
      ppsf,
      dom,
      confidence,
    };

    const series = buildTypeSeries(bucket, saleData, rentalData);

    result[bucket] = { kpis, series };
  });

  return result;
}

/**
 * High-level aggregate using /v1/markets:
 *  - overall KPIs + series from saleData/rentalData + history
 *  - per-type KPIs + series in sourceMeta.perType for sfh / condo / 2–4 units
 */
export async function fetchRentCastAggregate(
  marketId: string,
  dims: Dimensions
): Promise<ProviderSnapshot> {
  const marketData = await fetchMarketData(marketId);

  const saleData = marketData.saleData;
  const rentalData = marketData.rentalData;

  const overallKpis = computeKpisFromMarketData(saleData, rentalData);
  const overallSeries = buildOverallSeriesFromHistory(
    saleData,
    rentalData
  );

  const perType = computePerTypeFromMarketData(saleData, rentalData);

  const asOf =
    saleData?.lastUpdatedDate ??
    rentalData?.lastUpdatedDate ??
    new Date().toISOString();

  return {
    asOf: new Date(asOf),
    dimensions: dims,
    kpis: overallKpis,
    series: overallSeries,
    sourceMeta: {
      provider: "rentcast_market_data",
      rawMarketId: marketData.id,
      zipCode: marketData.zipCode ?? null,
      perType,
    },
  };
}
