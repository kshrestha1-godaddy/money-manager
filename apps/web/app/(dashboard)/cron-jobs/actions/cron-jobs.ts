"use server";

import prisma from "@repo/db/client";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "../../../lib/require-admin";
import { runCronJobs } from "../../../services/cron/cron-orchestrator";
import {
  extractLogsFromResult,
  type CronLogEntry,
} from "../../../services/cron/cron-log-types";

export interface CronJobDashboardItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  scheduleLabel: string;
  killSwitchEnvKey: string | null;
  gateType: string;
  isEnabled: boolean;
  sortOrder: number;
  lastRun: {
    id: number;
    status: string;
    startedAt: string | null;
    finishedAt: string | null;
    durationMs: number | null;
    successCount: number;
    skippedCount: number;
    errorCount: number;
    skipReason: string | null;
    errorMessage: string | null;
  } | null;
}

export interface CronJobRunListItem {
  id: number;
  jobSlug: string;
  jobName: string;
  batchRunId: number;
  triggerSource: string;
  triggeredByEmail: string | null;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  successCount: number;
  skippedCount: number;
  errorCount: number;
  skipReason: string | null;
  errorMessage: string | null;
  logs: CronLogEntry[];
}

export interface CronBatchRunListItem {
  id: number;
  triggerSource: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  triggeredByEmail: string | null;
  jobCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
}

export interface CronJobsDashboardData {
  jobs: CronJobDashboardItem[];
  recentBatches: CronBatchRunListItem[];
  recentJobRuns: CronJobRunListItem[];
}

function serializeDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export async function getCronJobsDashboardData(): Promise<CronJobsDashboardData> {
  await requireAdminSession();

  const [definitions, recentBatches, recentJobRuns] = await Promise.all([
    prisma.cronJobDefinition.findMany({
      orderBy: { sortOrder: "asc" },
    }),
    prisma.cronBatchRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      include: {
        triggeredByUser: { select: { email: true } },
        jobRuns: { select: { status: true } },
      },
    }),
    prisma.cronJobRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 50,
      include: {
        jobDefinition: { select: { name: true, slug: true } },
        batchRun: {
          select: {
            id: true,
            triggerSource: true,
            startedAt: true,
            triggeredByUser: { select: { email: true } },
          },
        },
      },
    }),
  ]);

  const latestRuns = await Promise.all(
    definitions.map((definition) =>
      prisma.cronJobRun.findFirst({
        where: { jobSlug: definition.slug },
        orderBy: { startedAt: "desc" },
      })
    )
  );

  const jobs: CronJobDashboardItem[] = definitions.map((definition, index) => {
    const lastRun = latestRuns[index];
    return {
      id: definition.id,
      slug: definition.slug,
      name: definition.name,
      description: definition.description,
      category: definition.category,
      scheduleLabel: definition.scheduleLabel,
      killSwitchEnvKey: definition.killSwitchEnvKey,
      gateType: definition.gateType,
      isEnabled: definition.isEnabled,
      sortOrder: definition.sortOrder,
      lastRun: lastRun
        ? {
            id: lastRun.id,
            status: lastRun.status,
            startedAt: serializeDate(lastRun.startedAt),
            finishedAt: serializeDate(lastRun.finishedAt),
            durationMs: lastRun.durationMs,
            successCount: lastRun.successCount,
            skippedCount: lastRun.skippedCount,
            errorCount: lastRun.errorCount,
            skipReason: lastRun.skipReason,
            errorMessage: lastRun.errorMessage,
          }
        : null,
    };
  });

  return {
    jobs,
    recentBatches: recentBatches.map((batch) => ({
      id: batch.id,
      triggerSource: batch.triggerSource,
      status: batch.status,
      startedAt: batch.startedAt.toISOString(),
      finishedAt: serializeDate(batch.finishedAt),
      durationMs: batch.durationMs,
      triggeredByEmail: batch.triggeredByUser?.email ?? null,
      jobCount: batch.jobRuns.length,
      successCount: batch.jobRuns.filter((run) => run.status === "SUCCESS").length,
      failedCount: batch.jobRuns.filter((run) => run.status === "FAILED").length,
      skippedCount: batch.jobRuns.filter((run) => run.status === "SKIPPED").length,
    })),
    recentJobRuns: recentJobRuns.map((run) => ({
      id: run.id,
      jobSlug: run.jobSlug,
      jobName: run.jobDefinition.name,
      batchRunId: run.batchRun.id,
      triggerSource: run.batchRun.triggerSource,
      triggeredByEmail: run.batchRun.triggeredByUser?.email ?? null,
      status: run.status,
      startedAt:
        serializeDate(run.startedAt) ??
        serializeDate(run.batchRun.startedAt) ??
        new Date(0).toISOString(),
      finishedAt: serializeDate(run.finishedAt),
      durationMs: run.durationMs,
      successCount: run.successCount,
      skippedCount: run.skippedCount,
      errorCount: run.errorCount,
      skipReason: run.skipReason,
      errorMessage: run.errorMessage,
      logs: extractLogsFromResult(run.resultJson),
    })),
  };
}

export async function triggerAllCronJobs() {
  const admin = await requireAdminSession();
  const result = await runCronJobs({
    triggerSource: "ADMIN_UI",
    triggeredByUserId: admin.userId,
  });
  revalidatePath("/cron-jobs");
  return result;
}

export async function triggerCronJob(slug: string) {
  const admin = await requireAdminSession();
  const result = await runCronJobs({
    jobSlugs: [slug],
    triggerSource: "ADMIN_UI",
    triggeredByUserId: admin.userId,
  });
  revalidatePath("/cron-jobs");
  return result;
}

export async function getCronBatchRunDetail(batchRunId: number) {
  await requireAdminSession();

  const batch = await prisma.cronBatchRun.findUnique({
    where: { id: batchRunId },
    include: {
      triggeredByUser: { select: { email: true, name: true } },
      jobRuns: {
        orderBy: { sortOrder: "asc" },
        include: {
          jobDefinition: {
            select: { name: true, slug: true, scheduleLabel: true },
          },
        },
      },
    },
  });

  if (!batch) {
    throw new Error("Batch run not found");
  }

  return {
    id: batch.id,
    triggerSource: batch.triggerSource,
    status: batch.status,
    startedAt: batch.startedAt.toISOString(),
    finishedAt: serializeDate(batch.finishedAt),
    durationMs: batch.durationMs,
    summaryJson: batch.summaryJson,
    errorMessage: batch.errorMessage,
    triggeredByEmail: batch.triggeredByUser?.email ?? null,
    triggeredByName: batch.triggeredByUser?.name ?? null,
    jobRuns: batch.jobRuns.map((run) => ({
      id: run.id,
      jobSlug: run.jobSlug,
      jobName: run.jobDefinition.name,
      scheduleLabel: run.jobDefinition.scheduleLabel,
      status: run.status,
      skipReason: run.skipReason,
      startedAt: serializeDate(run.startedAt),
      finishedAt: serializeDate(run.finishedAt),
      durationMs: run.durationMs,
      eligibleCount: run.eligibleCount,
      processedCount: run.processedCount,
      successCount: run.successCount,
      skippedCount: run.skippedCount,
      errorCount: run.errorCount,
      errorMessage: run.errorMessage,
      resultJson: run.resultJson,
      logs: extractLogsFromResult(run.resultJson),
    })),
  };
}

export async function getCronJobRunDetail(jobRunId: number) {
  await requireAdminSession();

  const run = await prisma.cronJobRun.findUnique({
    where: { id: jobRunId },
    include: {
      jobDefinition: {
        select: { name: true, slug: true, scheduleLabel: true, description: true },
      },
      batchRun: {
        select: {
          id: true,
          triggerSource: true,
          startedAt: true,
          triggeredByUser: { select: { email: true } },
        },
      },
    },
  });

  if (!run) {
    throw new Error("Job run not found");
  }

  return {
    id: run.id,
    jobSlug: run.jobSlug,
    jobName: run.jobDefinition.name,
    jobDescription: run.jobDefinition.description,
    scheduleLabel: run.jobDefinition.scheduleLabel,
    status: run.status,
    skipReason: run.skipReason,
    startedAt: serializeDate(run.startedAt),
    finishedAt: serializeDate(run.finishedAt),
    durationMs: run.durationMs,
    eligibleCount: run.eligibleCount,
    processedCount: run.processedCount,
    successCount: run.successCount,
    skippedCount: run.skippedCount,
    errorCount: run.errorCount,
    errorMessage: run.errorMessage,
    resultJson: run.resultJson,
    logs: extractLogsFromResult(run.resultJson),
    batch: {
      id: run.batchRun.id,
      triggerSource: run.batchRun.triggerSource,
      startedAt: run.batchRun.startedAt.toISOString(),
      triggeredByEmail: run.batchRun.triggeredByUser?.email ?? null,
    },
  };
}
