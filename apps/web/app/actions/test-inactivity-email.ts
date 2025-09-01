"use server";

import { processInactiveUsersForEmailNotifications } from "./checkins";
import { getAuthenticatedSession, getUserIdFromSession } from "../utils/auth";

/**
 * Test function to manually trigger inactivity email notifications
 * This is for testing purposes only
 */
export async function testInactivityEmailSystem() {
  try {
    // Verify user is authenticated (optional security check)
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    console.log(`Manual test triggered by user ${userId}`);
    
    const result = await processInactiveUsersForEmailNotifications();
    
    return {
      success: true,
      message: "Inactivity email test completed successfully",
      result: {
        processedUsers: result.processedUsers,
        emailsSent: result.emailsSent,
        notificationsCreated: result.notificationsCreated,
        errorCount: result.errors.length,
        errors: result.errors
      }
    };

  } catch (error) {
    console.error("Error in testInactivityEmailSystem:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Get summary of inactive users (for testing/monitoring)
 */
export async function getInactiveUsersSummary() {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    const { getInactiveUsers } = await import("./checkins");
    
    const inactiveUsers7Days = await getInactiveUsers(7);
    const inactiveUsers15Days = await getInactiveUsers(15);
    
    return {
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
    };

  } catch (error) {
    console.error("Error in getInactiveUsersSummary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}
