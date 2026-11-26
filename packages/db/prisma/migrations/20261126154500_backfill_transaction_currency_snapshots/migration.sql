-- Freeze the best available ledger impact for linked records created before
-- transaction currency snapshots were introduced.
WITH rates AS (
  SELECT
    COALESCE((SELECT "inrToNpr" FROM "CurrencyRateConfig" WHERE "id" = 1), 1.6) AS inr_to_npr,
    COALESCE((SELECT "nprPerUsd" FROM "CurrencyRateConfig" WHERE "id" = 1), 140) AS npr_per_usd
),
converted AS (
  SELECT
    e."id",
    u."currency" AS account_currency,
    CASE
      WHEN UPPER(TRIM(e."currency")) = UPPER(TRIM(u."currency")) THEN e."amount"
      WHEN UPPER(TRIM(e."currency")) = 'USD' AND UPPER(TRIM(u."currency")) = 'INR' THEN e."amount" * (r.npr_per_usd / r.inr_to_npr)
      WHEN UPPER(TRIM(e."currency")) = 'USD' AND UPPER(TRIM(u."currency")) = 'NPR' THEN e."amount" * r.npr_per_usd
      WHEN UPPER(TRIM(e."currency")) = 'INR' AND UPPER(TRIM(u."currency")) = 'USD' THEN e."amount" / (r.npr_per_usd / r.inr_to_npr)
      WHEN UPPER(TRIM(e."currency")) = 'INR' AND UPPER(TRIM(u."currency")) = 'NPR' THEN e."amount" * r.inr_to_npr
      WHEN UPPER(TRIM(e."currency")) = 'NPR' AND UPPER(TRIM(u."currency")) = 'USD' THEN e."amount" / r.npr_per_usd
      WHEN UPPER(TRIM(e."currency")) = 'NPR' AND UPPER(TRIM(u."currency")) = 'INR' THEN e."amount" / r.inr_to_npr
      ELSE NULL
    END AS account_amount
  FROM "Expense" e
  JOIN "User" u ON u."id" = e."userId"
  CROSS JOIN rates r
  WHERE e."accountId" IS NOT NULL
    AND e."accountAmount" IS NULL
    AND e."accountCurrency" IS NULL
    AND e."appliedExchangeRate" IS NULL
)
UPDATE "Expense" e
SET
  "accountAmount" = c.account_amount,
  "accountCurrency" = c.account_currency,
  "appliedExchangeRate" = CASE
    WHEN e."amount" = 0 OR c.account_amount IS NULL THEN NULL
    ELSE c.account_amount / e."amount"
  END
FROM converted c
WHERE e."id" = c."id"
  AND c.account_amount IS NOT NULL;

WITH rates AS (
  SELECT
    COALESCE((SELECT "inrToNpr" FROM "CurrencyRateConfig" WHERE "id" = 1), 1.6) AS inr_to_npr,
    COALESCE((SELECT "nprPerUsd" FROM "CurrencyRateConfig" WHERE "id" = 1), 140) AS npr_per_usd
),
converted AS (
  SELECT
    i."id",
    u."currency" AS account_currency,
    CASE
      WHEN UPPER(TRIM(i."currency")) = UPPER(TRIM(u."currency")) THEN i."amount"
      WHEN UPPER(TRIM(i."currency")) = 'USD' AND UPPER(TRIM(u."currency")) = 'INR' THEN i."amount" * (r.npr_per_usd / r.inr_to_npr)
      WHEN UPPER(TRIM(i."currency")) = 'USD' AND UPPER(TRIM(u."currency")) = 'NPR' THEN i."amount" * r.npr_per_usd
      WHEN UPPER(TRIM(i."currency")) = 'INR' AND UPPER(TRIM(u."currency")) = 'USD' THEN i."amount" / (r.npr_per_usd / r.inr_to_npr)
      WHEN UPPER(TRIM(i."currency")) = 'INR' AND UPPER(TRIM(u."currency")) = 'NPR' THEN i."amount" * r.inr_to_npr
      WHEN UPPER(TRIM(i."currency")) = 'NPR' AND UPPER(TRIM(u."currency")) = 'USD' THEN i."amount" / r.npr_per_usd
      WHEN UPPER(TRIM(i."currency")) = 'NPR' AND UPPER(TRIM(u."currency")) = 'INR' THEN i."amount" / r.inr_to_npr
      ELSE NULL
    END AS account_amount
  FROM "Income" i
  JOIN "User" u ON u."id" = i."userId"
  CROSS JOIN rates r
  WHERE i."accountId" IS NOT NULL
    AND i."accountAmount" IS NULL
    AND i."accountCurrency" IS NULL
    AND i."appliedExchangeRate" IS NULL
)
UPDATE "Income" i
SET
  "accountAmount" = c.account_amount,
  "accountCurrency" = c.account_currency,
  "appliedExchangeRate" = CASE
    WHEN i."amount" = 0 OR c.account_amount IS NULL THEN NULL
    ELSE c.account_amount / i."amount"
  END
FROM converted c
WHERE i."id" = c."id"
  AND c.account_amount IS NOT NULL;
