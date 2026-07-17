import type { CronRunStatus, CronTriggerSource } from "@prisma/client";
import {
  evaluateCronJobGate,
  getCronRegistry,
  loadCronJobDefinitions,
  type CronBatchRunSummary,
  type CronJobCounters,
} from "./cron-registry";
import {
  createCronLogCollector,
  extractLogsFromResult,
  type CronLogEntry,
} from "./cron-log-types";
import {
  createPendingCronJobRun,
  finishCronBatchRun,
  finishCronJobRun,
  markCronJobRunStarted,
  startCronBatchRun,
} from "./cron-run-logger";

export interface RunCronOptions {
  jobSlugs?: string[];
  triggerSource: CronTriggerSource;
  triggeredByUserId?: number;
  requestContext?: { ip?: string; userAgent?: string };
}

function buildResultJson(raw: unknown, extraLogs?: CronLogEntry[]): unknown {
  const existingLogs = extractLogsFromResult(raw);
  const logs = extraLogs ? [...existingLogs, ...extraLogs] : existingLogs;
  if (!raw || typeof raw !== "object") {
    return logs.length > 0 ? { logs } : raw;
  }
  return { ...(raw as Record<string, unknown>), logs };
}

function buildSkipResultJson(skipReason: string, jobSlug: string): unknown {
  const log = createCronLogCollector();
  log.skip(`Job skipped: ${skipReason}`, {
    details: { jobSlug, skipReason },
  });
  return { skipped: true, reason: skipReason, logs: log.logs };
}

function deriveJobStatus(
  counters: CronJobCounters,
  errorMessage?: string
): CronRunStatus {
  if (errorMessage && counters.errorCount > 0 && counters.successCount === 0) {
    return "FAILED";
  }
  if (counters.errorCount > 0) return "PARTIAL";
  return "SUCCESS";
}

function deriveBatchStatus(
  jobStatuses: CronRunStatus[]
): CronRunStatus {
  if (jobStatuses.every((s) => s === "SKIPPED")) return "SUCCESS";
  if (jobStatuses.some((s) => s === "FAILED")) {
    if (jobStatuses.some((s) => s === "SUCCESS" || s === "PARTIAL")) {
      return "PARTIAL";
    }
    return "FAILED";
  }
  if (jobStatuses.some((s) => s === "PARTIAL")) return "PARTIAL";
  return "SUCCESS";
}

export async function runCronJobs(
  options: RunCronOptions
): Promise<CronBatchRunSummary> {
  const batchStartedAt = Date.now();
  const registry = getCronRegistry();
  const definitions = await loadCronJobDefinitions(options.jobSlugs);

  if (definitions.length === 0) {
    throw new Error("No cron job definitions found for the requested slugs");
  }

  const batch = await startCronBatchRun({
    triggerSource: options.triggerSource,
    triggeredByUserId: options.triggeredByUserId,
    requestIp: options.requestContext?.ip,
    userAgent: options.requestContext?.userAgent,
  });

  const jobSummaries: CronBatchRunSummary["jobs"] = [];

  for (const definition of definitions) {
    const entry = registry[definition.slug];
    if (!entry) {
      const handlerError = "No registry handler found";
      const handlerResultJson = buildSkipResultJson(handlerError, definition.slug);
      const pending = await createPendingCronJobRun({
        batchRunId: batch.id,
        jobSlug: definition.slug,
        sortOrder: definition.sortOrder,
        status: "FAILED",
        skipReason: handlerError,
      });
      await finishCronJobRun({
        jobRunId: pending.id,
        status: "FAILED",
        durationMs: 0,
        counters: {
          eligibleCount: 0,
          processedCount: 0,
          successCount: 0,
          skippedCount: 0,
          errorCount: 1,
        },
        errorMessage: handlerError,
        resultJson: handlerResultJson,
      });
      jobSummaries.push({
        jobSlug: definition.slug,
        status: "FAILED",
        skipReason: handlerError,
        durationMs: 0,
        counters: {
          eligibleCount: 0,
          processedCount: 0,
          successCount: 0,
          skippedCount: 0,
          errorCount: 1,
        },
        resultJson: handlerResultJson,
        errorMessage: handlerError,
      });
      continue;
    }

    const gate = evaluateCronJobGate(definition);
    if (!gate.run) {
      const skipReason = gate.skipReason ?? "Gate evaluation failed";
      const skipResultJson = buildSkipResultJson(skipReason, definition.slug);
      const pending = await createPendingCronJobRun({
        batchRunId: batch.id,
        jobSlug: definition.slug,
        sortOrder: definition.sortOrder,
        status: "SKIPPED",
        skipReason: gate.skipReason,
      });
      await finishCronJobRun({
        jobRunId: pending.id,
        status: "SKIPPED",
        durationMs: 0,
        counters: {
          eligibleCount: 0,
          processedCount: 0,
          successCount: 0,
          skippedCount: 1,
          errorCount: 0,
        },
        skipReason: gate.skipReason,
        resultJson: skipResultJson,
      });
      jobSummaries.push({
        jobSlug: definition.slug,
        status: "SKIPPED",
        skipReason: gate.skipReason ?? null,
        durationMs: 0,
        counters: {
          eligibleCount: 0,
          processedCount: 0,
          successCount: 0,
          skippedCount: 1,
          errorCount: 0,
        },
        resultJson: skipResultJson,
        errorMessage: null,
      });
      continue;
    }

    const pending = await createPendingCronJobRun({
      batchRunId: batch.id,
      jobSlug: definition.slug,
      sortOrder: definition.sortOrder,
      status: "PENDING",
    });
    await markCronJobRunStarted(pending.id);

    const jobStartedAt = Date.now();
    let status: CronRunStatus = "FAILED";
    let counters: CronJobCounters = {
      eligibleCount: 0,
      processedCount: 0,
      successCount: 0,
      skippedCount: 0,
      errorCount: 1,
    };
    let resultJson: unknown = null;
    let errorMessage: string | undefined;

    try {
      const raw = await entry.run();
      const normalized = entry.normalizeResult(raw);
      counters = normalized.counters;
      resultJson = buildResultJson(normalized.raw);
      errorMessage = normalized.errorMessage;
      status = deriveJobStatus(counters, errorMessage);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errLog = createCronLogCollector();
      errLog.error(`Job execution failed: ${errorMessage}`, {
        details: { jobSlug: definition.slug },
      });
      resultJson = buildResultJson({ error: errorMessage }, errLog.logs);
      status = "FAILED";
    }

    const durationMs = Date.now() - jobStartedAt;
    await finishCronJobRun({
      jobRunId: pending.id,
      status,
      durationMs,
      counters,
      resultJson,
      errorMessage,
    });

    jobSummaries.push({
      jobSlug: definition.slug,
      status,
      skipReason: null,
      durationMs,
      counters,
      resultJson,
      errorMessage: errorMessage ?? null,
    });
  }

  const batchDurationMs = Date.now() - batchStartedAt;
  const batchStatus = deriveBatchStatus(jobSummaries.map((j) => j.status));
  const summaryJson = {
    jobCount: jobSummaries.length,
    successCount: jobSummaries.filter((j) => j.status === "SUCCESS").length,
    partialCount: jobSummaries.filter((j) => j.status === "PARTIAL").length,
    failedCount: jobSummaries.filter((j) => j.status === "FAILED").length,
    skippedCount: jobSummaries.filter((j) => j.status === "SKIPPED").length,
    jobs: jobSummaries,
  };

  await finishCronBatchRun({
    batchRunId: batch.id,
    status: batchStatus,
    durationMs: batchDurationMs,
    summaryJson,
    errorMessage:
      batchStatus === "FAILED" || batchStatus === "PARTIAL"
        ? "One or more cron jobs failed or partially failed"
        : undefined,
  });

  return {
    batchRunId: batch.id,
    status: batchStatus,
    startedAt: batch.startedAt,
    finishedAt: new Date(),
    durationMs: batchDurationMs,
    jobs: jobSummaries,
    summaryJson,
  };
}
