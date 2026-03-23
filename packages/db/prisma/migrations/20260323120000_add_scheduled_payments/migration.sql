-- CreateEnum
CREATE TYPE "ScheduledPaymentResolution" AS ENUM ('ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "ScheduledPayment" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "accountId" INTEGER,
    "userId" INTEGER NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringFrequency" "RecurringFrequency",
    "resolution" "ScheduledPaymentResolution",
    "resolvedAt" TIMESTAMP(3),
    "createdExpenseId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledPayment_createdExpenseId_key" ON "ScheduledPayment"("createdExpenseId");

-- CreateIndex
CREATE INDEX "ScheduledPayment_userId_scheduledAt_idx" ON "ScheduledPayment"("userId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ScheduledPayment_userId_resolution_idx" ON "ScheduledPayment"("userId", "resolution");

-- AddForeignKey
ALTER TABLE "ScheduledPayment" ADD CONSTRAINT "ScheduledPayment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPayment" ADD CONSTRAINT "ScheduledPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPayment" ADD CONSTRAINT "ScheduledPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPayment" ADD CONSTRAINT "ScheduledPayment_createdExpenseId_fkey" FOREIGN KEY ("createdExpenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
