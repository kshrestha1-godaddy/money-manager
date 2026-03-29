-- AlterTable
ALTER TABLE "Investment" ADD COLUMN     "investmentTargetId" INTEGER;

-- CreateIndex
CREATE INDEX "Investment_investmentTargetId_idx" ON "Investment"("investmentTargetId");

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_investmentTargetId_fkey" FOREIGN KEY ("investmentTargetId") REFERENCES "InvestmentTarget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
