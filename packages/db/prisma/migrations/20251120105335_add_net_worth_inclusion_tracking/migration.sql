-- CreateEnum
CREATE TYPE "WorthEntityType" AS ENUM ('ACCOUNT', 'INVESTMENT', 'DEBT');

-- CreateTable
CREATE TABLE "NetWorthInclusion" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "entityType" "WorthEntityType" NOT NULL,
    "entityId" INTEGER NOT NULL,
    "includeInNetWorth" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetWorthInclusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NetWorthInclusion_userId_entityType_idx" ON "NetWorthInclusion"("userId", "entityType");

-- CreateIndex
CREATE INDEX "NetWorthInclusion_userId_includeInNetWorth_idx" ON "NetWorthInclusion"("userId", "includeInNetWorth");

-- CreateIndex
CREATE UNIQUE INDEX "NetWorthInclusion_userId_entityType_entityId_key" ON "NetWorthInclusion"("userId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "NetWorthInclusion" ADD CONSTRAINT "NetWorthInclusion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

