import prisma from "@repo/db/client";
import { createCronLogCollector } from "./cron-log-types";

const RETENTION_DAYS = 7;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

/** Prune run history only; job definitions remain available for future runs. */
export async function cleanupCronHistory(now: Date = new Date()) {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid cleanup date");
  const cutoff = new Date(now.getTime() - RETENTION_MS);
  const log = createCronLogCollector();

  // CronJobRun.batchRun uses ON DELETE CASCADE, so this single atomic
  // deletion also removes each expired batch's job results and logs.
  const { count } = await prisma.cronBatchRun.deleteMany({
    where: { startedAt: { lt: cutoff } },
  });

  log.success(`Deleted ${count} cron batches older than ${RETENTION_DAYS} days, including their job runs and logs.`, {
    details: { cutoff: cutoff.toISOString(), deletedBatchRuns: count },
  });

  return {
    retentionDays: RETENTION_DAYS,
    cutoff: cutoff.toISOString(),
    deletedBatchRuns: count,
    eligibleCount: count,
    processedCount: count,
    successCount: count,
    skippedCount: 0,
    errorCount: 0,
    logs: log.logs,
  };
}
