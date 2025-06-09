-- AlterTable
ALTER TABLE "DebtRepayment" ADD COLUMN     "accountId" INTEGER;

-- AddForeignKey
ALTER TABLE "DebtRepayment" ADD CONSTRAINT "DebtRepayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
