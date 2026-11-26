ALTER TABLE "User"
ADD COLUMN "displayCurrency" TEXT NOT NULL DEFAULT 'USD';

UPDATE "User"
SET "displayCurrency" = "currency";

ALTER TABLE "Expense"
ADD COLUMN "accountAmount" DECIMAL(65,30),
ADD COLUMN "accountCurrency" TEXT,
ADD COLUMN "appliedExchangeRate" DECIMAL(65,30);

ALTER TABLE "Income"
ADD COLUMN "accountAmount" DECIMAL(65,30),
ADD COLUMN "accountCurrency" TEXT,
ADD COLUMN "appliedExchangeRate" DECIMAL(65,30);
