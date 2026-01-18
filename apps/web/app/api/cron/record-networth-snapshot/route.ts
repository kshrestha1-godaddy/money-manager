import { NextRequest, NextResponse } from "next/server";
import { recordNetworthSnapshotForAllUsers } from "../../../(dashboard)/worth/actions/networth-history";

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (optional security check)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("Starting cron job: record-networth-snapshot");

    const snapshotResult = await recordNetworthSnapshotForAllUsers("AUTOMATIC", new Date());
    if (!snapshotResult.success || !snapshotResult.result) {
      return NextResponse.json({
        success: false,
        error: snapshotResult.error || "Failed to record net worth snapshots"
      }, { status: 500 });
    }

    console.log("Cron job completed:", snapshotResult.result);

    return NextResponse.json({
      success: true,
      message: "Net worth snapshot recording completed",
      result: {
        processedUsers: snapshotResult.result.processedUsers,
        successfulRecords: snapshotResult.result.successfulRecords,
        errorCount: snapshotResult.result.errorCount,
        errors: snapshotResult.result.errors.slice(0, 5) // Only return first 5 errors to avoid large response
      }
    });

  } catch (error) {
    console.error("Error in record-networth-snapshot cron job:", error);
    
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