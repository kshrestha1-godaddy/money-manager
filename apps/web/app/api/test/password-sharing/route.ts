import { NextRequest, NextResponse } from "next/server";
import { processInactiveUsersPasswordSharing } from "../../../actions/password-sharing";

export async function GET(request: NextRequest) {
  try {
    // Optional: Check for CRON_SECRET authorization for security
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized - Invalid or missing authorization header' }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'test';

    if (action === 'test') {
      // Run the actual password sharing test
      console.log("Manual password sharing test triggered via API");
      const result = await processInactiveUsersPasswordSharing();
      
      return NextResponse.json({
        success: true,
        message: "Password sharing test completed successfully",
        result: {
          processedUsers: result.processedUsers,
          successfulShares: result.successfulShares,
          errorCount: result.errors.length,
          errors: result.errors
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action parameter. Use ?action=test"
    }, { status: 400 });

  } catch (error) {
    console.error("Error in password sharing test:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      details: "Check server logs for more information"
    }, { status: 500 });
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
