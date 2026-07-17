-- CreateEnum
CREATE TYPE "CronTriggerSource" AS ENUM ('SCHEDULER', 'ADMIN_UI', 'API_SINGLE', 'API_ALL', 'LEGACY');

-- CreateEnum
CREATE TYPE "CronRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SKIPPED', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "CronGateType" AS ENUM ('ALWAYS', 'UTC_WEEKDAY', 'LOCAL_FIRST_OF_MONTH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CronJobCategory" AS ENUM ('EMAIL', 'DATA', 'SECURITY', 'REPORT');

-- CreateTable
CREATE TABLE "CronJobDefinition" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "CronJobCategory" NOT NULL,
    "scheduleLabel" TEXT NOT NULL,
    "killSwitchEnvKey" TEXT,
    "gateType" "CronGateType" NOT NULL DEFAULT 'ALWAYS',
    "gateConfig" JSONB,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CronJobDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronBatchRun" (
    "id" SERIAL NOT NULL,
    "triggerSource" "CronTriggerSource" NOT NULL,
    "triggeredByUserId" INTEGER,
    "status" "CronRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "summaryJson" JSONB,
    "errorMessage" TEXT,
    "requestIp" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "CronBatchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronJobRun" (
    "id" SERIAL NOT NULL,
    "batchRunId" INTEGER NOT NULL,
    "jobSlug" TEXT NOT NULL,
    "status" "CronRunStatus" NOT NULL DEFAULT 'PENDING',
    "skipReason" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "resultJson" JSONB,
    "errorMessage" TEXT,
    "eligibleCount" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CronJobRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CronJobDefinition_slug_key" ON "CronJobDefinition"("slug");

-- CreateIndex
CREATE INDEX "CronJobDefinition_isEnabled_sortOrder_idx" ON "CronJobDefinition"("isEnabled", "sortOrder");

-- CreateIndex
CREATE INDEX "CronBatchRun_startedAt_idx" ON "CronBatchRun"("startedAt");

-- CreateIndex
CREATE INDEX "CronBatchRun_status_startedAt_idx" ON "CronBatchRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "CronBatchRun_triggeredByUserId_idx" ON "CronBatchRun"("triggeredByUserId");

-- CreateIndex
CREATE INDEX "CronJobRun_batchRunId_sortOrder_idx" ON "CronJobRun"("batchRunId", "sortOrder");

-- CreateIndex
CREATE INDEX "CronJobRun_jobSlug_startedAt_idx" ON "CronJobRun"("jobSlug", "startedAt");

-- AddForeignKey
ALTER TABLE "CronBatchRun" ADD CONSTRAINT "CronBatchRun_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CronJobRun" ADD CONSTRAINT "CronJobRun_batchRunId_fkey" FOREIGN KEY ("batchRunId") REFERENCES "CronBatchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CronJobRun" ADD CONSTRAINT "CronJobRun_jobSlug_fkey" FOREIGN KEY ("jobSlug") REFERENCES "CronJobDefinition"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed cron job definitions
INSERT INTO "CronJobDefinition" ("slug", "name", "description", "category", "scheduleLabel", "killSwitchEnvKey", "gateType", "gateConfig", "isEnabled", "sortOrder", "updatedAt") VALUES
(
    'inactive_user_email',
    'Inactive User Email',
    'Sends reminder emails to users who have not checked in for 7+ days.',
    'EMAIL',
    'Daily',
    NULL,
    'ALWAYS',
    NULL,
    true,
    10,
    CURRENT_TIMESTAMP
),
(
    'networth_snapshot',
    'Net Worth Snapshot',
    'Records automatic net worth history snapshots for all users.',
    'DATA',
    'Daily',
    NULL,
    'ALWAYS',
    NULL,
    true,
    20,
    CURRENT_TIMESTAMP
),
(
    'scheduled_payments_digest',
    'Scheduled Payments Digest',
    'Emails users a daily digest of unresolved scheduled payments due today in their timezone.',
    'EMAIL',
    'Daily (per-user local day)',
    'SCHEDULED_PAYMENTS_DIGEST_ENABLED',
    'ALWAYS',
    '{"envDisabledWhen":"false"}'::jsonb,
    true,
    30,
    CURRENT_TIMESTAMP
),
(
    'monthly_balance_sheet',
    'Monthly Balance Sheet',
    'On each user local 1st, emails previous month balance sheet as Excel attachment.',
    'REPORT',
    'Monthly (per-user local 1st)',
    'MONTHLY_BALANCE_SHEET_ENABLED',
    'ALWAYS',
    '{"perUserLocalFirst":true,"envDisabledWhen":"false"}'::jsonb,
    true,
    40,
    CURRENT_TIMESTAMP
),
(
    'weekly_data_export',
    'Weekly Data Export',
    'Emails weekly CSV backup bundle to users with valid email addresses.',
    'REPORT',
    'Weekly (UTC weekday, default Sunday)',
    'WEEKLY_DATA_EXPORT_ENABLED',
    'UTC_WEEKDAY',
    '{"utcWeekday":0,"envDisabledWhen":"false"}'::jsonb,
    true,
    50,
    CURRENT_TIMESTAMP
),
(
    'inactive_password_share',
    'Inactive Password Share',
    'Shares passwords with emergency contacts for users inactive 15+ days.',
    'SECURITY',
    'Daily (separate trigger supported)',
    NULL,
    'ALWAYS',
    NULL,
    true,
    60,
    CURRENT_TIMESTAMP
);
