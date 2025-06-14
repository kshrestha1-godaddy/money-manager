/*
  Warnings:

  - You are about to drop the column `userId` on the `Subscriber` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Subscriber" DROP CONSTRAINT "Subscriber_userId_fkey";

-- AlterTable
ALTER TABLE "Subscriber" DROP COLUMN "userId";
