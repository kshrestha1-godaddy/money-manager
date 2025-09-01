import { NextRequest, NextResponse } from "next/server";
import { processInactiveUsersForEmailNotifications } from "../../../actions/checkins";

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (optional security check)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("Starting cron job: check-inactive-users-email");
    
    const result = await processInactiveUsersForEmailNotifications();
    
    console.log("Cron job completed:", result);
    
    return NextResponse.json({
      success: true,
      message: "Inactive users email notification process completed",
      result: {
        processedUsers: result.processedUsers,
        emailsSent: result.emailsSent,
        notificationsCreated: result.notificationsCreated,
        errorCount: result.errors.length,
        errors: result.errors.slice(0, 5) // Only return first 5 errors to avoid large response
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
