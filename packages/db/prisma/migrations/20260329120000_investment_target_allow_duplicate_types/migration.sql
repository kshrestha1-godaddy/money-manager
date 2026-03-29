-- Drop unique (userId, investmentType) so users can have multiple targets per category;
-- progress is tracked per target id via Investment.investmentTargetId.
DROP INDEX IF EXISTS "InvestmentTarget_userId_investmentType_key";

CREATE INDEX IF NOT EXISTS "InvestmentTarget_userId_investmentType_idx" ON "InvestmentTarget"("userId", "investmentType");
