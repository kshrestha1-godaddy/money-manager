-- AlterTable
ALTER TABLE "Password" ADD COLUMN     "transactionPin" TEXT,
ADD COLUMN     "validity" TIMESTAMP(3);
