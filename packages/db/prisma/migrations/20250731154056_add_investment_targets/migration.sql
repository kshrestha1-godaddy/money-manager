-- CreateTable
CREATE TABLE "InvestmentTarget" (
    "id" SERIAL NOT NULL,
    "investmentType" "InvestmentType" NOT NULL,
    "targetAmount" DECIMAL(65,30) NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestmentTarget_userId_idx" ON "InvestmentTarget"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentTarget_userId_investmentType_key" ON "InvestmentTarget"("userId", "investmentType");

-- AddForeignKey
ALTER TABLE "InvestmentTarget" ADD CONSTRAINT "InvestmentTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
