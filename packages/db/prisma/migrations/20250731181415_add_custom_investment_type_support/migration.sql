-- AlterTable
ALTER TABLE "Investment" ADD COLUMN     "customTypeId" INTEGER,
ALTER COLUMN "type" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_customTypeId_fkey" FOREIGN KEY ("customTypeId") REFERENCES "InvestmentTypeCustom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
