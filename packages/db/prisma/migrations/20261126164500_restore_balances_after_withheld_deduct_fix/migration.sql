-- Withheld investments reserve free balance and must not permanently change
-- Account.balance. Restore ledger amounts that were previously decremented by
-- investment withhold/deduct activity. Uses the net of investment balance
-- activity logs (creates were negative, deletes/releases positive).
-- Review before applying. Re-running after logs are unchanged is a no-op only if
-- net_delta is already 0; prefer running once after deploying the withhold fix.

UPDATE "Account" AS a
SET balance = a.balance - sub.net_delta
FROM (
  SELECT
    (al.metadata->>'accountId')::integer AS account_id,
    SUM((al.metadata->>'balanceDeltaUserCurrency')::numeric) AS net_delta
  FROM "ActivityLog" AS al
  WHERE al.metadata->>'source' = 'investment_account_balance'
    AND al.metadata ? 'accountId'
    AND al.metadata ? 'balanceDeltaUserCurrency'
  GROUP BY 1
) AS sub
WHERE a.id = sub.account_id
  AND sub.net_delta < 0;
