-- AlterEnum
ALTER TYPE "InvestmentType" ADD VALUE 'FIXED_DEPOSIT';

-- AlterTable
ALTER TABLE "Investment" ADD COLUMN     "interestRate" DECIMAL(65,30),
ADD COLUMN     "maturityDate" TIMESTAMP(3);
