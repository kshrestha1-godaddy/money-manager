/*
  Warnings:

  - Added the required column `userId` to the `Category` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add userId column as nullable first
ALTER TABLE "Category" ADD COLUMN "userId" INTEGER;

-- Step 2: Update all existing categories to be owned by user 23634
UPDATE "Category" SET "userId" = 23634 WHERE "userId" IS NULL;

-- Step 3: Make userId column required (NOT NULL)
ALTER TABLE "Category" ALTER COLUMN "userId" SET NOT NULL;

-- Step 4: Add foreign key constraint
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
