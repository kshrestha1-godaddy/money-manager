-- AlterEnum
ALTER TYPE "ActivityCategory" ADD VALUE 'NOTE';

-- AlterEnum
ALTER TYPE "ActivityEntityType" ADD VALUE 'NOTE';

-- AlterTable
ALTER TABLE "Investment" ADD COLUMN     "deductFromAccount" BOOLEAN NOT NULL DEFAULT true;
