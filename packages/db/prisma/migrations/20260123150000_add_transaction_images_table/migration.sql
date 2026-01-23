-- CreateEnum
CREATE TYPE "TransactionImageType" AS ENUM ('EXPENSE', 'INCOME', 'INVESTMENT', 'DEBT', 'LOAN');

-- CreateTable
CREATE TABLE "TransactionImage" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "transactionType" "TransactionImageType" NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransactionImage_userId_transactionType_idx" ON "TransactionImage"("userId", "transactionType");

-- CreateIndex
CREATE INDEX "TransactionImage_transactionType_transactionId_idx" ON "TransactionImage"("transactionType", "transactionId");

-- CreateIndex
CREATE INDEX "TransactionImage_userId_uploadedAt_idx" ON "TransactionImage"("userId", "uploadedAt");

-- CreateIndex
CREATE INDEX "TransactionImage_userId_isActive_idx" ON "TransactionImage"("userId", "isActive");

-- AddForeignKey
ALTER TABLE "TransactionImage" ADD CONSTRAINT "TransactionImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;