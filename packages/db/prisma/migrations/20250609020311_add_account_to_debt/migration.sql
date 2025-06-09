-- AlterTable
ALTER TABLE "Debt" ADD COLUMN     "accountId" INTEGER;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
