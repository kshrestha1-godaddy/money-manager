BEGIN;

ALTER TABLE "Expense" DROP CONSTRAINT "Expense_transactionLocationId_fkey",
    ADD CONSTRAINT "Expense_transactionLocationId_fkey" FOREIGN KEY ("transactionLocationId")
    REFERENCES "TransactionLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Income" DROP CONSTRAINT "Income_transactionLocationId_fkey",
    ADD CONSTRAINT "Income_transactionLocationId_fkey" FOREIGN KEY ("transactionLocationId")
    REFERENCES "TransactionLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
