-- CreateTable
CREATE TABLE "AccountThreshold" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "lowBalanceThreshold" DECIMAL(65,30) NOT NULL DEFAULT 500,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountThreshold_userId_idx" ON "AccountThreshold"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountThreshold_accountId_userId_key" ON "AccountThreshold"("accountId", "userId");

-- AddForeignKey
ALTER TABLE "AccountThreshold" ADD CONSTRAINT "AccountThreshold_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountThreshold" ADD CONSTRAINT "AccountThreshold_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
