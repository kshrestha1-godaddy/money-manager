-- AlterTable
ALTER TABLE "ScheduledPayment" ADD COLUMN "investmentId" INTEGER;

-- CreateIndex
CREATE INDEX "ScheduledPayment_investmentId_idx" ON "ScheduledPayment"("investmentId");

-- AddForeignKey
ALTER TABLE "ScheduledPayment" ADD CONSTRAINT "ScheduledPayment_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
