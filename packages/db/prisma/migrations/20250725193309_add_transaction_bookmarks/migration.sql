-- CreateTable
CREATE TABLE "TransactionBookmark" (
    "id" SERIAL NOT NULL,
    "transactionType" TEXT NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransactionBookmark_transactionType_transactionId_userId_key" ON "TransactionBookmark"("transactionType", "transactionId", "userId");

-- AddForeignKey
ALTER TABLE "TransactionBookmark" ADD CONSTRAINT "TransactionBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
