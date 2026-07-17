import { NextRequest } from "next/server";
import { handleCronApiRoute } from "../../../lib/cron-api-handler";
import { DAILY_CRON_JOB_SLUGS } from "../../../services/cron/cron-registry";

/** @deprecated Use POST /api/cron/run */
export async function GET(request: NextRequest) {
  return POST(request);
}

/** @deprecated Use POST /api/cron/run */
export async function POST(request: NextRequest) {
  return handleCronApiRoute(request, {
    jobSlugs: [...DAILY_CRON_JOB_SLUGS],
    triggerSource: "LEGACY",
    successMessage: "Daily cron jobs completed",
    errorLogLabel: "/api/cron/check-inactive-users-email",
    formatResponse(result) {
      const jobBySlug = Object.fromEntries(
        result.jobs.map((job) => [job.jobSlug, job])
      );

      return {
        inactiveUsers: jobBySlug.inactive_user_email?.resultJson ?? null,
        networthSnapshots: jobBySlug.networth_snapshot?.resultJson ?? null,
        weeklyDataExport: jobBySlug.weekly_data_export?.resultJson ?? {
          ran: jobBySlug.weekly_data_export?.status !== "SKIPPED",
          reason: jobBySlug.weekly_data_export?.skipReason,
        },
        scheduledPaymentsDigest:
          jobBySlug.scheduled_payments_digest?.resultJson ?? null,
        monthlyBalanceSheet: jobBySlug.monthly_balance_sheet?.resultJson ?? null,
        batchRunId: result.batchRunId,
      };
    },
  });
}
