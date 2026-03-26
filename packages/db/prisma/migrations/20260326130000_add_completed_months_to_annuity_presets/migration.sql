-- AlterTable
ALTER TABLE "AnnuityCalculatorPreset" ADD COLUMN "completedMonthsJson" JSONB NOT NULL DEFAULT '[]';
