/*
  Warnings:

  - The values [EMERGENCY] on the enum `PasswordShareReason` will be removed. If these variants are still used in the database, this will fail.

*/
-- First, update any existing EMERGENCY records to MANUAL
UPDATE "PasswordShare" SET "shareReason" = 'MANUAL' WHERE "shareReason" = 'EMERGENCY';

-- AlterEnum
BEGIN;
CREATE TYPE "PasswordShareReason_new" AS ENUM ('INACTIVITY', 'MANUAL');
ALTER TABLE "PasswordShare" ALTER COLUMN "shareReason" DROP DEFAULT;
ALTER TABLE "PasswordShare" ALTER COLUMN "shareReason" TYPE "PasswordShareReason_new" USING ("shareReason"::text::"PasswordShareReason_new");
ALTER TYPE "PasswordShareReason" RENAME TO "PasswordShareReason_old";
ALTER TYPE "PasswordShareReason_new" RENAME TO "PasswordShareReason";
DROP TYPE "PasswordShareReason_old";
ALTER TABLE "PasswordShare" ALTER COLUMN "shareReason" SET DEFAULT 'INACTIVITY';
COMMIT;
