-- CreateTable
CREATE TABLE "CurrencyRateConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "inrToNpr" DECIMAL(18,8) NOT NULL,
    "nprPerUsd" DECIMAL(18,8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrencyRateConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "CurrencyRateConfig" ("id", "inrToNpr", "nprPerUsd", "createdAt", "updatedAt")
VALUES (1, 1.6, 140, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
