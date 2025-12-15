# House Market Watch

A **snapshot-driven real-estate market analysis web app** focused on low API usage, fast insights, and investor-oriented decision making. Built with **Next.js**, **Prisma**, and **Postgres (Neon)**, the app aggregates housing market data by ZIP code and property type (SFH / Condo / 2–4 Unit) and presents it through a clean, dark, data-dense UI.

---

## 🚀 What This Project Does

House Market Watch helps users:

- Track housing markets **by ZIP code** (not just city averages)
- Compare **prices, rents, and trends** across property types
- Avoid excessive API calls using a **snapshot-based architecture**
- Quickly evaluate markets from an **investor’s perspective**

The system is designed to scale efficiently while staying within strict third-party API limits.

---

## 🧠 Core Concepts

### Snapshot-Driven Architecture

Instead of hitting the RentCast API on every request:

- Market data is fetched **once** and stored as a `Snapshot`
- The UI reads directly from snapshots
- Property-type toggles (SFH / Condo / 2–4) use **pre-aggregated snapshot data**
- API usage is capped and enforced at the database level

This keeps the app fast, cheap, and production-safe.

---

### ZIP-First Market IDs

Markets use canonical ZIP-based IDs such as:
-11332


Legacy city IDs are automatically mapped using an alias layer so older links remain valid.

---

## 🛠️ Tech Stack

### Frontend
- **Next.js (App Router)**
- **React + TypeScript**
- **Tailwind CSS** (custom dark slate theme)
- Client / server component separation

### Backend
- **Next.js Route Handlers**
- **Prisma ORM**
- **Postgres (Neon)**

### Data & APIs
- **RentCast API** (rate-limited)
- Internal API usage limiter (50 calls / month)

### Deployment
- **Vercel** (frontend + API)
- **Neon** (serverless Postgres)

---

## 🗂️ Data Model (Simplified)

- **Market**
  - `id` (ZIP-based)
  - `city`, `state`

- **Snapshot**
  - `marketId`
  - `asOf`
  - `kpis` (median price, rent, DOM, etc.)
  - `series` (historical price data)
  - `sourceMeta` (per-property-type aggregates)

- **ApiUsage**
  - Tracks monthly RentCast calls
  - Hard-stops requests once the limit is reached

---

## 📊 Key Features

- 📍 ZIP-based market tracking
- 🏠 Property type toggle (SFH / Condo / 2–4 Units)
- 📈 Price history charts
- 🧮 Mortgage calculator (rent-aware)
- 🗺️ Embedded maps per market
- 🌙 Consistent dark UI theme
- ⚡ Snapshot-based performance

---

## 🧑‍💻 Getting Started (Local Development)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Lopez4163/house-market-watch.git
cd house-market-watch
```

### Install Dependencies

```bash
npm install
```

### Create .env

```bash
cp .env.example .env
```

### Add Following Code

```bash
DATABASE_URL=your_neon_postgres_connection_string
RENTCAST_API_KEY=your_rentcast_api_key
```

### Setup Prisma 

```bash
npx prisma generate
npx prisma migrate deploy
```

### Run Dev Server

```bash
npm run dev
```


