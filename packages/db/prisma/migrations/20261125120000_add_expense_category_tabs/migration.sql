ALTER TABLE "Category" ADD COLUMN "showAsExpenseTab" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Category"
SET "showAsExpenseTab" = true
WHERE "type" = 'EXPENSE'
  AND "name" IN ('Self Transfer of Money', 'SToM (Self Transfer of Money)');
