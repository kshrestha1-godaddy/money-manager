-- CreateTable
CREATE TABLE "AnnuityCalculatorPreset" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "inputsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnuityCalculatorPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnnuityCalculatorPreset_userId_idx" ON "AnnuityCalculatorPreset"("userId");

-- CreateIndex
CREATE INDEX "AnnuityCalculatorPreset_userId_updatedAt_idx" ON "AnnuityCalculatorPreset"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "AnnuityCalculatorPreset" ADD CONSTRAINT "AnnuityCalculatorPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
