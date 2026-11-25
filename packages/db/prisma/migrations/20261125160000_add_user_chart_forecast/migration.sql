-- Per-user forecast overlay on/off, keyed by chart
CREATE TABLE "UserChartForecast" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "chartId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserChartForecast_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserChartForecast_userId_chartId_key" ON "UserChartForecast"("userId", "chartId");

CREATE INDEX "UserChartForecast_userId_idx" ON "UserChartForecast"("userId");

ALTER TABLE "UserChartForecast"
ADD CONSTRAINT "UserChartForecast_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
