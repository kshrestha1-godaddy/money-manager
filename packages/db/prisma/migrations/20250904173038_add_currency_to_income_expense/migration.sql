-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';
