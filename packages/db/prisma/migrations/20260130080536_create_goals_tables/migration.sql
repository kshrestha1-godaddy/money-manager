-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "GoalPhaseStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED', 'OVERDUE');

-- CreateTable
CREATE TABLE "Goal" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" DECIMAL(65,30),
    "currentAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "startDate" TIMESTAMP(3) NOT NULL,
    "targetCompletionDate" TIMESTAMP(3),
    "actualCompletionDate" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 1,
    "status" "GoalStatus" NOT NULL DEFAULT 'PLANNING',
    "category" TEXT,
    "tags" TEXT[],
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "notes" TEXT,
    "successCriteria" TEXT,
    "accountId" INTEGER,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalPhase" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "plannedStartDate" TIMESTAMP(3) NOT NULL,
    "plannedEndDate" TIMESTAMP(3) NOT NULL,
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "status" "GoalPhaseStatus" NOT NULL DEFAULT 'PLANNED',
    "progressPercentage" INTEGER NOT NULL DEFAULT 0,
    "sequenceOrder" INTEGER NOT NULL,
    "estimatedDuration" INTEGER,
    "actualDuration" INTEGER,
    "notes" TEXT,
    "requirements" TEXT,
    "deliverables" TEXT,
    "goalId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalProgress" (
    "id" SERIAL NOT NULL,
    "progressPercentage" INTEGER NOT NULL,
    "amountProgress" DECIMAL(65,30),
    "milestoneReached" TEXT,
    "notes" TEXT,
    "challenges" TEXT,
    "nextSteps" TEXT,
    "progressDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAutomaticUpdate" BOOLEAN NOT NULL DEFAULT false,
    "phaseId" INTEGER,
    "goalId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Goal_userId_status_idx" ON "Goal"("userId", "status");

-- CreateIndex
CREATE INDEX "Goal_userId_startDate_idx" ON "Goal"("userId", "startDate");

-- CreateIndex
CREATE INDEX "Goal_userId_priority_idx" ON "Goal"("userId", "priority");

-- CreateIndex
CREATE INDEX "Goal_userId_category_idx" ON "Goal"("userId", "category");

-- CreateIndex
CREATE INDEX "Goal_userId_createdAt_idx" ON "Goal"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GoalPhase_goalId_sequenceOrder_idx" ON "GoalPhase"("goalId", "sequenceOrder");

-- CreateIndex
CREATE INDEX "GoalPhase_userId_status_idx" ON "GoalPhase"("userId", "status");

-- CreateIndex
CREATE INDEX "GoalPhase_goalId_plannedStartDate_idx" ON "GoalPhase"("goalId", "plannedStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "GoalPhase_goalId_sequenceOrder_key" ON "GoalPhase"("goalId", "sequenceOrder");

-- CreateIndex
CREATE INDEX "GoalProgress_goalId_progressDate_idx" ON "GoalProgress"("goalId", "progressDate");

-- CreateIndex
CREATE INDEX "GoalProgress_userId_progressDate_idx" ON "GoalProgress"("userId", "progressDate");

-- CreateIndex
CREATE INDEX "GoalProgress_goalId_createdAt_idx" ON "GoalProgress"("goalId", "createdAt");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalPhase" ADD CONSTRAINT "GoalPhase_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalPhase" ADD CONSTRAINT "GoalPhase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalProgress" ADD CONSTRAINT "GoalProgress_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "GoalPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalProgress" ADD CONSTRAINT "GoalProgress_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalProgress" ADD CONSTRAINT "GoalProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
