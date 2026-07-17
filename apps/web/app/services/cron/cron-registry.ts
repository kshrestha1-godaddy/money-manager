import prisma from "@repo/db/client";
import type {
  CronJobDefinition,
  CronRunStatus,
  CronTriggerSource,
} from "@prisma/client";

export interface CronJobCounters {
  eligibleCount: number;
  processedCount: number;
  successCount: number;
  skippedCount: number;
  errorCount: number;
}

export interface CronJobExecutionResult {
  raw: unknown;
  counters: CronJobCounters;
  errorMessage?: string;
}

export interface CronGateEvaluation {
  run: boolean;
  skipReason?: string;
}

export interface CronRegistryEntry {
  slug: string;
  run: () => Promise<unknown>;
  normalizeResult: (raw: unknown) => CronJobExecutionResult;
}

export interface CronBatchRunSummary {
  batchRunId: number;
  status: CronRunStatus;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  jobs: Array<{
    jobSlug: string;
    status: CronRunStatus;
    skipReason: string | null;
    durationMs: number | null;
    counters: CronJobCounters;
    resultJson: unknown;
    errorMessage: string | null;
  }>;
  summaryJson: Record<string, unknown>;
}

function emptyCounters(): CronJobCounters {
  return {
    eligibleCount: 0,
    processedCount: 0,
    successCount: 0,
    skippedCount: 0,
    errorCount: 0,
  };
}

function countersFromFields(fields: Record<string, unknown>): CronJobCounters {
  const errors = Array.isArray(fields.errors) ? (fields.errors as string[]) : [];
  return {
    eligibleCount: Number(fields.eligibleCount ?? fields.eligibleUsers ?? 0),
    processedCount: Number(
      fields.processedCount ??
        fields.processedUsers ??
        fields.emailsAttempted ??
        fields.successfulRecords ??
        0
    ),
    successCount: Number(
      fields.successCount ??
        fields.emailsSent ??
        fields.successfulRecords ??
        fields.successfulShares ??
        fields.notificationsCreated ??
        0
    ),
    skippedCount: Number(
      fields.skippedCount ??
        (Number(fields.skipped ?? 0) +
          Number(fields.skippedNoPayments ?? 0) +
          Number(fields.skippedAlreadySent ?? 0) +
          Number(fields.skippedNotFirst ?? 0) +
          Number(fields.skippedNoTransactions ?? 0))
    ),
    errorCount: Number(fields.errorCount ?? errors.length),
  };
}

function resultFromRaw(
  raw: unknown,
  overrides?: Partial<CronJobCounters>
): CronJobExecutionResult {
  if (!raw || typeof raw !== "object") {
    return { raw, counters: { ...emptyCounters(), ...overrides } };
  }

  const data = raw as Record<string, unknown>;
  const errors = Array.isArray(data.errors) ? (data.errors as string[]) : [];

  if ("success" in data && data.success === false) {
    return {
      raw,
      counters: countersFromFields({ ...data, errors, ...overrides }),
      errorMessage:
        typeof data.error === "string" ? data.error : "Job returned success=false",
    };
  }

  if ("result" in data && data.result && typeof data.result === "object") {
    const nested = data.result as Record<string, unknown>;
    const nestedErrors = Array.isArray(nested.errors)
      ? (nested.errors as string[])
      : errors;
    return {
      raw,
      counters: countersFromFields({
        ...nested,
        errors: nestedErrors,
        processedCount: nested.processedUsers,
        successCount: nested.successfulRecords,
        errorCount: nested.errorCount ?? nestedErrors.length,
        ...overrides,
      }),
      errorMessage:
        typeof nested.error === "string"
          ? nested.error
          : nestedErrors[0],
    };
  }

  return {
    raw,
    counters: countersFromFields({ ...data, errors, ...overrides }),
    errorMessage: errors[0],
  };
}

export function getCronRegistry(): Record<string, CronRegistryEntry> {
  return {
    inactive_user_email: {
      slug: "inactive_user_email",
      async run() {
        const { processInactiveUsersForEmailNotifications } = await import(
          "../../actions/checkins"
        );
        return processInactiveUsersForEmailNotifications();
      },
      normalizeResult(raw) {
        return resultFromRaw(raw);
      },
    },
    networth_snapshot: {
      slug: "networth_snapshot",
      async run() {
        const { recordNetworthSnapshotForAllUsers } = await import(
          "../../(dashboard)/worth/actions/networth-history"
        );
        return recordNetworthSnapshotForAllUsers("AUTOMATIC", new Date());
      },
      normalizeResult(raw) {
        return resultFromRaw(raw);
      },
    },
    scheduled_payments_digest: {
      slug: "scheduled_payments_digest",
      async run() {
        const { processScheduledPaymentsDigestEmails } = await import(
          "../process-scheduled-payments-digest-email"
        );
        return processScheduledPaymentsDigestEmails();
      },
      normalizeResult(raw) {
        return resultFromRaw(raw);
      },
    },
    monthly_balance_sheet: {
      slug: "monthly_balance_sheet",
      async run() {
        const { processMonthlyBalanceSheetEmails } = await import(
          "../process-monthly-balance-sheet-email"
        );
        return processMonthlyBalanceSheetEmails();
      },
      normalizeResult(raw) {
        return resultFromRaw(raw);
      },
    },
    weekly_data_export: {
      slug: "weekly_data_export",
      async run() {
        const { processWeeklyDataExportEmails } = await import(
          "../process-weekly-data-export-email"
        );
        return processWeeklyDataExportEmails();
      },
      normalizeResult(raw) {
        return resultFromRaw(raw);
      },
    },
    inactive_password_share: {
      slug: "inactive_password_share",
      async run() {
        const { processInactiveUsersPasswordSharing } = await import(
          "../../actions/password-sharing"
        );
        return processInactiveUsersPasswordSharing();
      },
      normalizeResult(raw) {
        return resultFromRaw(raw);
      },
    },
  };
}

function getWeeklyExportUtcDay(): number {
  const raw = process.env.WEEKLY_EXPORT_DAY_UTC;
  if (raw === undefined || raw === "") return 0;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 6) return 0;
  return n;
}

function isEnvKillSwitchActive(
  envKey: string | null | undefined,
  gateConfig: unknown
): boolean {
  if (!envKey) return false;
  const config =
    gateConfig && typeof gateConfig === "object"
      ? (gateConfig as Record<string, unknown>)
      : {};
  const disabledWhen =
    typeof config.envDisabledWhen === "string" ? config.envDisabledWhen : "false";
  return process.env[envKey] === disabledWhen;
}

export function evaluateCronJobGate(definition: CronJobDefinition): CronGateEvaluation {
  if (!definition.isEnabled) {
    return { run: false, skipReason: "Job disabled in CronJobDefinition" };
  }

  if (isEnvKillSwitchActive(definition.killSwitchEnvKey, definition.gateConfig)) {
    return {
      run: false,
      skipReason: `${definition.killSwitchEnvKey} is disabled`,
    };
  }

  const gateConfig =
    definition.gateConfig && typeof definition.gateConfig === "object"
      ? (definition.gateConfig as Record<string, unknown>)
      : {};

  if (definition.gateType === "UTC_WEEKDAY") {
    const targetDay =
      typeof gateConfig.utcWeekday === "number"
        ? gateConfig.utcWeekday
        : getWeeklyExportUtcDay();
    const utcDay = new Date().getUTCDay();
    if (utcDay !== targetDay) {
      return {
        run: false,
        skipReason: `not_weekly_day (utc_day=${utcDay}, target=${targetDay})`,
      };
    }
  }

  return { run: true };
}

export async function loadCronJobDefinitions(
  jobSlugs?: string[]
): Promise<CronJobDefinition[]> {
  const definitions = await prisma.cronJobDefinition.findMany({
    where: jobSlugs?.length ? { slug: { in: jobSlugs } } : undefined,
    orderBy: { sortOrder: "asc" },
  });
  return definitions;
}

export type { CronTriggerSource };

/** Daily bundle (excludes password sharing — use full orchestrator run for all jobs). */
export const DAILY_CRON_JOB_SLUGS = [
  "inactive_user_email",
  "networth_snapshot",
  "scheduled_payments_digest",
  "monthly_balance_sheet",
  "weekly_data_export",
] as const;

export function getAllCronJobSlugs(): string[] {
  return Object.keys(getCronRegistry());
}
