-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "zipGroup" JSONB,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "dimensions" JSONB NOT NULL,
    "kpis" JSONB NOT NULL,
    "series" JSONB NOT NULL,
    "sourceMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Snapshot_marketId_asOf_idx" ON "Snapshot"("marketId", "asOf");

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
