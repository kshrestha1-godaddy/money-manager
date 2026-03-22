import { NextRequest, NextResponse } from "next/server";
import { processInactiveUsersForEmailNotifications } from "../../../actions/checkins";
import { recordNetworthSnapshotForAllUsers } from "../../../(dashboard)/worth/actions/networth-history";
import {
  processWeeklyDataExportEmails,
  type WeeklyDataExportEmailResult,
} from "../../../services/process-weekly-data-export-email";

/** 0 = Sunday … 6 = Saturday (UTC). Invalid values default to 0. */
function getWeeklyExportUtcDay(): number {
  const raw = process.env.WEEKLY_EXPORT_DAY_UTC;
  if (raw === undefined || raw === "") return 0;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 6) return 0;
  return n;
}

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (optional security check)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("Starting cron job: check-inactive-users-email and record net worth snapshot");

    const inactiveUsersResult = await processInactiveUsersForEmailNotifications();
    const networthResult = await recordNetworthSnapshotForAllUsers("AUTOMATIC", new Date());

    console.log("Cron job completed:", {
      inactiveUsersResult,
      networthResult
    });

    const inactiveUsersSummary = {
      processedUsers: inactiveUsersResult.processedUsers,
      emailsSent: inactiveUsersResult.emailsSent,
      notificationsCreated: inactiveUsersResult.notificationsCreated,
      errorCount: inactiveUsersResult.errors?.length || 0,
      errors: (inactiveUsersResult.errors || []).slice(0, 5)
    };

    const networthSummary = networthResult.success && networthResult.result
      ? {
          processedUsers: networthResult.result.processedUsers,
          successfulRecords: networthResult.result.successfulRecords,
          errorCount: networthResult.result.errorCount,
          errors: networthResult.result.errors.slice(0, 5)
        }
      : {
          error: networthResult.error || "Failed to record net worth snapshots"
        };

    const weeklyEnabled = process.env.WEEKLY_DATA_EXPORT_ENABLED !== "false";
    const utcDay = new Date().getUTCDay();
    const weeklyTargetDay = getWeeklyExportUtcDay();
    const shouldRunWeeklyExport = weeklyEnabled && utcDay === weeklyTargetDay;

    let weeklyDataExport:
      | ({ ran: true } & WeeklyDataExportEmailResult)
      | { ran: false; reason: string };

    if (shouldRunWeeklyExport) {
      weeklyDataExport = { ran: true, ...(await processWeeklyDataExportEmails()) };
    } else if (!weeklyEnabled) {
      weeklyDataExport = { ran: false, reason: "WEEKLY_DATA_EXPORT_DISABLED" };
    } else {
      weeklyDataExport = {
        ran: false,
        reason: `not_weekly_day (utc_day=${utcDay}, target=${weeklyTargetDay})`,
      };
    }

    const hasInactiveUserErrors = inactiveUsersSummary.errorCount > 0;
    const hasNetworthErrors = !networthResult.success || (networthResult.result?.errorCount || 0) > 0;
    const weeklyHadErrors =
      weeklyDataExport.ran &&
      (weeklyDataExport.errors?.length ?? 0) > 0;

    return NextResponse.json({
      success: !hasInactiveUserErrors && !hasNetworthErrors && !weeklyHadErrors,
      message: "Daily cron jobs completed",
      result: {
        inactiveUsers: inactiveUsersSummary,
        networthSnapshots: networthSummary,
        weeklyDataExport,
      }
    });

  } catch (error) {
    console.error("Error in check-inactive-users-email cron job:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
