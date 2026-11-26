ALTER TABLE "CurrencyRateConfig"
ADD COLUMN "userId" INTEGER;

CREATE UNIQUE INDEX "CurrencyRateConfig_userId_key"
ON "CurrencyRateConfig"("userId");

ALTER TABLE "CurrencyRateConfig"
ADD CONSTRAINT "CurrencyRateConfig_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE SEQUENCE IF NOT EXISTS "CurrencyRateConfig_id_seq";

SELECT setval(
  '"CurrencyRateConfig_id_seq"',
  COALESCE((SELECT MAX("id") FROM "CurrencyRateConfig"), 0) + 1,
  false
);

ALTER TABLE "CurrencyRateConfig"
ALTER COLUMN "id" SET DEFAULT nextval('"CurrencyRateConfig_id_seq"');

ALTER SEQUENCE "CurrencyRateConfig_id_seq"
OWNED BY "CurrencyRateConfig"."id";
