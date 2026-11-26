-- CSV imports previously stamped accountAmount=0 / appliedExchangeRate=0 on
-- linked rows (same marker as self-transfer tracking). That hid non-zero
-- native amounts from snapshot-based display. Clear those false zero-impact
-- snapshots so display falls back to native amount until a real booking exists.
-- True transfer markers keep amount=0 with zero snapshots and are left alone.

UPDATE "Expense"
SET
  "accountAmount" = NULL,
  "accountCurrency" = NULL,
  "appliedExchangeRate" = NULL
WHERE "accountId" IS NOT NULL
  AND "amount" <> 0
  AND "accountAmount" = 0
  AND "appliedExchangeRate" = 0;

UPDATE "Income"
SET
  "accountAmount" = NULL,
  "accountCurrency" = NULL,
  "appliedExchangeRate" = NULL
WHERE "accountId" IS NOT NULL
  AND "amount" <> 0
  AND "accountAmount" = 0
  AND "appliedExchangeRate" = 0;
