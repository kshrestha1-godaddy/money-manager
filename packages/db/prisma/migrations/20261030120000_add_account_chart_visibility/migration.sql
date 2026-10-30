-- Existing and new accounts remain visible until explicitly hidden.
ALTER TABLE "Account" ADD COLUMN "showInBalanceChart" BOOLEAN NOT NULL DEFAULT true;
