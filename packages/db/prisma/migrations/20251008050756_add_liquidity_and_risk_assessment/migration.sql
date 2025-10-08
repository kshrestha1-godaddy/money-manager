-- CreateEnum
CREATE TYPE "LiquidityTimeframe" AS ENUM ('IMMEDIATE', 'DAYS', 'WEEKS', 'MONTHS', 'YEARS');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "expectedAnnualReturn" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "isEmergencyFund" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLiquid" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "liquidityTimeframe" "LiquidityTimeframe" NOT NULL DEFAULT 'IMMEDIATE',
ADD COLUMN     "riskLevel" "RiskLevel" NOT NULL DEFAULT 'VERY_LOW';

-- AlterTable
ALTER TABLE "Debt" ADD COLUMN     "borrowerCreditRating" TEXT,
ADD COLUMN     "hasCollateral" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLiquid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "liquidityTimeframe" "LiquidityTimeframe" NOT NULL DEFAULT 'MONTHS',
ADD COLUMN     "repaymentProbability" DECIMAL(65,30) NOT NULL DEFAULT 80,
ADD COLUMN     "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "Investment" ADD COLUMN     "expectedAnnualReturn" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "hasMaturityDate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isInflationHedge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLiquid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "liquidityTimeframe" "LiquidityTimeframe" NOT NULL DEFAULT 'DAYS',
ADD COLUMN     "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM';
