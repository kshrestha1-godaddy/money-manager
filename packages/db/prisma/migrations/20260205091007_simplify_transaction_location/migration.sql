/*
  Warnings:

  - You are about to drop the column `address` on the `TransactionLocation` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `TransactionLocation` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `TransactionLocation` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `TransactionLocation` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `TransactionLocation` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `TransactionLocation` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `TransactionLocation` table. All the data in the column will be lost.
  - You are about to drop the column `postalCode` on the `TransactionLocation` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `TransactionLocation` table. All the data in the column will be lost.
  - Made the column `latitude` on table `TransactionLocation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `longitude` on table `TransactionLocation` required. This step will fail if there are existing NULL values in that column.

*/

-- Delete existing TransactionLocation records with NULL coordinates
DELETE FROM "TransactionLocation" WHERE "latitude" IS NULL OR "longitude" IS NULL;

-- DropIndex
DROP INDEX "TransactionLocation_userId_category_idx";

-- DropIndex
DROP INDEX "TransactionLocation_userId_city_idx";

-- DropIndex
DROP INDEX "TransactionLocation_userId_isActive_idx";

-- DropIndex
DROP INDEX "TransactionLocation_userId_name_idx";

-- AlterTable
ALTER TABLE "TransactionLocation" DROP COLUMN "address",
DROP COLUMN "category",
DROP COLUMN "city",
DROP COLUMN "country",
DROP COLUMN "description",
DROP COLUMN "isActive",
DROP COLUMN "name",
DROP COLUMN "postalCode",
DROP COLUMN "state",
ALTER COLUMN "latitude" SET NOT NULL,
ALTER COLUMN "longitude" SET NOT NULL;

-- CreateIndex
CREATE INDEX "TransactionLocation_userId_idx" ON "TransactionLocation"("userId");
