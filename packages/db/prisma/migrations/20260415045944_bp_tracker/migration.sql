-- CreateEnum
CREATE TYPE "BloodPressureCategory" AS ENUM ('LOW', 'NORMAL', 'PRE_HYPERTENSION', 'HIGH_STAGE_1', 'HIGH_STAGE_2', 'OTHER');

-- CreateTable
CREATE TABLE "BloodPressureReading" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "systolic" INTEGER NOT NULL,
    "diastolic" INTEGER NOT NULL,
    "category" "BloodPressureCategory" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BloodPressureReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BloodPressureReading_userId_measuredAt_idx" ON "BloodPressureReading"("userId", "measuredAt");

-- AddForeignKey
ALTER TABLE "BloodPressureReading" ADD CONSTRAINT "BloodPressureReading_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
