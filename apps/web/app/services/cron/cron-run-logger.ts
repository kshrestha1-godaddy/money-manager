import prisma from "@repo/db/client";
import type { CronRunStatus, CronTriggerSource } from "@prisma/client";
import type { CronJobCounters } from "./cron-registry";

export async function startCronBatchRun(params: {
  triggerSource: CronTriggerSource;
  triggeredByUserId?: number;
  requestIp?: string;
  userAgent?: string;
}) {
  return prisma.cronBatchRun.create({
    data: {
      triggerSource: params.triggerSource,
      triggeredByUserId: params.triggeredByUserId,
      status: "RUNNING",
      requestIp: params.requestIp,
      userAgent: params.userAgent,
    },
  });
}

export async function createPendingCronJobRun(params: {
  batchRunId: number;
  jobSlug: string;
  sortOrder: number;
  status: CronRunStatus;
  skipReason?: string;
}) {
  return prisma.cronJobRun.create({
    data: {
      batchRunId: params.batchRunId,
      jobSlug: params.jobSlug,
      sortOrder: params.sortOrder,
      status: params.status,
      skipReason: params.skipReason,
      startedAt: params.status === "SKIPPED" ? new Date() : undefined,
      finishedAt: params.status === "SKIPPED" ? new Date() : undefined,
    },
  });
}

export async function markCronJobRunStarted(jobRunId: number) {
  return prisma.cronJobRun.update({
    where: { id: jobRunId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
    },
  });
}

export async function finishCronJobRun(params: {
  jobRunId: number;
  status: CronRunStatus;
  durationMs: number;
  counters: CronJobCounters;
  resultJson?: unknown;
  errorMessage?: string;
  skipReason?: string;
}) {
  return prisma.cronJobRun.update({
    where: { id: params.jobRunId },
    data: {
      status: params.status,
      durationMs: params.durationMs,
      eligibleCount: params.counters.eligibleCount,
      processedCount: params.counters.processedCount,
      successCount: params.counters.successCount,
      skippedCount: params.counters.skippedCount,
      errorCount: params.counters.errorCount,
      resultJson: params.resultJson as never,
      errorMessage: params.errorMessage,
      skipReason: params.skipReason,
      finishedAt: new Date(),
    },
  });
}

export async function finishCronBatchRun(params: {
  batchRunId: number;
  status: CronRunStatus;
  durationMs: number;
  summaryJson: Record<string, unknown>;
  errorMessage?: string;
}) {
  return prisma.cronBatchRun.update({
    where: { id: params.batchRunId },
    data: {
      status: params.status,
      durationMs: params.durationMs,
      summaryJson: params.summaryJson as never,
      errorMessage: params.errorMessage,
      finishedAt: new Date(),
    },
  });
}
