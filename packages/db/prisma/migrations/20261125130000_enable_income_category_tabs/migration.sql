ALTER TABLE "Category" RENAME COLUMN "showAsExpenseTab" TO "showAsTransactionTab";

UPDATE "Category"
SET "showAsTransactionTab" = true
WHERE "type" = 'INCOME'
  AND "name" IN ('Self Transfer of Money', 'SToM (Self Transfer of Money)');
