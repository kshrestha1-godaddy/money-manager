-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "transactionLocationId" INTEGER;

-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "transactionLocationId" INTEGER;

-- CreateTable
CREATE TABLE "TransactionLocation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "category" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransactionLocation_userId_name_idx" ON "TransactionLocation"("userId", "name");

-- CreateIndex
CREATE INDEX "TransactionLocation_userId_city_idx" ON "TransactionLocation"("userId", "city");

-- CreateIndex
CREATE INDEX "TransactionLocation_userId_category_idx" ON "TransactionLocation"("userId", "category");

-- CreateIndex
CREATE INDEX "TransactionLocation_userId_isActive_idx" ON "TransactionLocation"("userId", "isActive");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_transactionLocationId_fkey" FOREIGN KEY ("transactionLocationId") REFERENCES "TransactionLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_transactionLocationId_fkey" FOREIGN KEY ("transactionLocationId") REFERENCES "TransactionLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLocation" ADD CONSTRAINT "TransactionLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
