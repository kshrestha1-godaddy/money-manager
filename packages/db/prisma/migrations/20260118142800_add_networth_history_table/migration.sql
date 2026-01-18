-- CreateEnum
CREATE TYPE "NetWorthRecordType" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateTable
CREATE TABLE "NetworthHistory" (
    "id" SERIAL NOT NULL,
    "totalAccountBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalInvestmentValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalInvestmentCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalInvestmentGain" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalInvestmentGainPercentage" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalMoneyLent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalAssets" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netWorth" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordType" "NetWorthRecordType" NOT NULL DEFAULT 'AUTOMATIC',
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworthHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NetworthHistory_userId_snapshotDate_idx" ON "NetworthHistory"("userId", "snapshotDate");

-- CreateIndex
CREATE INDEX "NetworthHistory_userId_recordType_idx" ON "NetworthHistory"("userId", "recordType");

-- CreateIndex
CREATE INDEX "NetworthHistory_userId_createdAt_idx" ON "NetworthHistory"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NetworthHistory_userId_snapshotDate_key" ON "NetworthHistory"("userId", "snapshotDate");

-- AddForeignKey
ALTER TABLE "NetworthHistory" ADD CONSTRAINT "NetworthHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
