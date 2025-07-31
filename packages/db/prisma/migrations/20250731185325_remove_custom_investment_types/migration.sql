/*
  Warnings:

  - You are about to drop the column `customTypeId` on the `Investment` table. All the data in the column will be lost.
  - You are about to drop the `InvestmentTypeCustom` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `type` on table `Investment` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Investment" DROP CONSTRAINT "Investment_customTypeId_fkey";

-- DropForeignKey
ALTER TABLE "InvestmentTypeCustom" DROP CONSTRAINT "InvestmentTypeCustom_userId_fkey";

-- AlterTable
ALTER TABLE "Investment" DROP COLUMN "customTypeId",
ALTER COLUMN "type" SET NOT NULL;

-- DropTable
DROP TABLE "InvestmentTypeCustom";
