-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'READ', 'BULK_CREATE', 'BULK_UPDATE', 'BULK_DELETE', 'BULK_IMPORT', 'EXPORT', 'LOGIN', 'LOGOUT', 'SHARE', 'SYNC', 'CALCULATE', 'GENERATE', 'SEND');

-- CreateEnum
CREATE TYPE "ActivityEntityType" AS ENUM ('EXPENSE', 'INCOME', 'INVESTMENT', 'DEBT', 'LOAN', 'ACCOUNT', 'CATEGORY', 'BUDGET_TARGET', 'DEBT_REPAYMENT', 'LOAN_REPAYMENT', 'USER', 'USER_PROFILE', 'USER_SETTINGS', 'NOTIFICATION', 'PASSWORD', 'BOOKMARK', 'EMERGENCY_EMAIL', 'PASSWORD_SHARE', 'REPORT', 'EXPORT', 'IMPORT', 'SESSION', 'AUTHENTICATION', 'NET_WORTH_INCLUSION', 'SYSTEM', 'CRON_JOB');

-- CreateEnum
CREATE TYPE "ActivityCategory" AS ENUM ('TRANSACTION', 'ACCOUNT', 'INVESTMENT', 'DEBT_LOAN', 'AUTHENTICATION', 'SECURITY', 'NOTIFICATION', 'BUDGET', 'REPORT', 'SYSTEM', 'USER_MANAGEMENT', 'BULK_OPERATION');

-- CreateEnum
CREATE TYPE "ActivitySeverity" AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('SUCCESS', 'FAILED', 'ERROR', 'PARTIAL', 'PENDING');

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" "ActivityAction" NOT NULL,
    "entityType" "ActivityEntityType" NOT NULL,
    "entityId" INTEGER,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "category" "ActivityCategory" NOT NULL DEFAULT 'TRANSACTION',
    "severity" "ActivitySeverity" NOT NULL DEFAULT 'INFO',
    "status" "ActivityStatus" NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_action_idx" ON "ActivityLog"("entityType", "action");

-- CreateIndex
CREATE INDEX "ActivityLog_category_createdAt_idx" ON "ActivityLog"("category", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_status_severity_idx" ON "ActivityLog"("status", "severity");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

