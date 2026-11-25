-- Per-user forecasting model selection and order parameters
CREATE TABLE "UserForecastSetting" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "selectedModelIds" TEXT[] DEFAULT ARRAY['auto']::TEXT[],
    "horizon" INTEGER NOT NULL DEFAULT 12,
    "modelParams" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserForecastSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserForecastSetting_userId_key" ON "UserForecastSetting"("userId");

ALTER TABLE "UserForecastSetting"
ADD CONSTRAINT "UserForecastSetting_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
