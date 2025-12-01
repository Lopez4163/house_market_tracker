/*
  Warnings:

  - The primary key for the `Snapshot` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `Snapshot` table. All the data in the column will be lost.
  - You are about to drop the column `dimensions` on the `Snapshot` table. All the data in the column will be lost.
  - You are about to drop the column `sourceMeta` on the `Snapshot` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Snapshot` table. All the data in the column will be lost.
  - The `id` column on the `Snapshot` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropIndex
DROP INDEX "Snapshot_marketId_asOf_idx";

-- AlterTable
ALTER TABLE "Snapshot" DROP CONSTRAINT "Snapshot_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "dimensions",
DROP COLUMN "sourceMeta",
DROP COLUMN "updatedAt",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "Snapshot_marketId_propertyType_idx" ON "Snapshot"("marketId", "propertyType");
