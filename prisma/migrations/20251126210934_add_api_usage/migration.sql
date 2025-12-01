-- CreateTable
CREATE TABLE "ApiUsage" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiUsage_provider_year_month_key" ON "ApiUsage"("provider", "year", "month");
