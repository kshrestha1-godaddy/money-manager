/*
  Warnings:

  - You are about to drop the column `websiteUrl` on the `Password` table. All the data in the column will be lost.
  - Added the required column `description` to the `Password` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Password" DROP COLUMN "websiteUrl",
ADD COLUMN     "description" TEXT NOT NULL;
