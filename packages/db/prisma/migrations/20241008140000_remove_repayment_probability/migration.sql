-- AlterTable
ALTER TABLE "Debt" DROP COLUMN IF EXISTS "repaymentProbability";

ALTER TABLE "Account" DROP COLUMN IF EXISTS "expectedAnnualReturn";

ALTER TABLE "Investment" DROP COLUMN IF EXISTS "expectedAnnualReturn";