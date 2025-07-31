-- CreateTable
CREATE TABLE "InvestmentTypeCustom" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentTypeCustom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestmentTypeCustom_userId_idx" ON "InvestmentTypeCustom"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentTypeCustom_userId_name_key" ON "InvestmentTypeCustom"("userId", "name");

-- AddForeignKey
ALTER TABLE "InvestmentTypeCustom" ADD CONSTRAINT "InvestmentTypeCustom_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
