import { NextRequest, NextResponse } from "next/server";
import { processInactiveUsersForEmailNotifications, getInactiveUsers } from "../../../actions/checkins";

export async function GET(request: NextRequest) {
  try {
    // Optional: Check for CRON_SECRET authorization for security
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized - Invalid or missing authorization header' }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'summary';

    if (action === 'test') {
      // Run the actual inactivity email test (without requiring user session)
      console.log("Manual test triggered via API");
      const result = await processInactiveUsersForEmailNotifications();
      
      return NextResponse.json({
        success: true,
        message: "Inactivity email test completed successfully",
        result: {
          processedUsers: result.processedUsers,
          emailsSent: result.emailsSent,
          notificationsCreated: result.notificationsCreated,
          errorCount: result.errors.length,
          errors: result.errors
        }
      });
    } else {
      // Default: return summary of inactive users
      const inactiveUsers7Days = await getInactiveUsers(7);
      const inactiveUsers15Days = await getInactiveUsers(15);
      
      return NextResponse.json({
        success: true,
        summary: {
          inactive7Days: inactiveUsers7Days.length,
          inactive15Days: inactiveUsers15Days.length,
          users7Days: inactiveUsers7Days.map(user => ({
            userId: user.userId,
            email: user.email,
            name: user.name,
            lastCheckin: user.lastCheckin,
            daysSinceLastCheckin: user.lastCheckin 
              ? Math.floor((Date.now() - user.lastCheckin.getTime()) / (1000 * 60 * 60 * 24))
              : null
          }))
        }
      });
    }

  } catch (error) {
    console.error("Error in inactivity email test API:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for CRON_SECRET authorization
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized - Invalid or missing authorization header' }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action || 'test';

    if (action === 'test') {
      console.log("Manual test triggered via POST API");
      const result = await processInactiveUsersForEmailNotifications();
      
      return NextResponse.json({
        success: true,
        message: "Inactivity email test completed successfully",
        result: {
          processedUsers: result.processedUsers,
          emailsSent: result.emailsSent,
          notificationsCreated: result.notificationsCreated,
          errorCount: result.errors.length,
          errors: result.errors
        }
      });
    } else if (action === 'summary') {
      const inactiveUsers7Days = await getInactiveUsers(7);
      const inactiveUsers15Days = await getInactiveUsers(15);
      
      return NextResponse.json({
        success: true,
        summary: {
          inactive7Days: inactiveUsers7Days.length,
          inactive15Days: inactiveUsers15Days.length,
          users7Days: inactiveUsers7Days.map(user => ({
            userId: user.userId,
            email: user.email,
            name: user.name,
            lastCheckin: user.lastCheckin,
            daysSinceLastCheckin: user.lastCheckin 
              ? Math.floor((Date.now() - user.lastCheckin.getTime()) / (1000 * 60 * 60 * 24))
              : null
          }))
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: "Invalid action. Use 'test' or 'summary'"
      }, { status: 400 });
    }

  } catch (error) {
    console.error("Error in inactivity email test API:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
}
