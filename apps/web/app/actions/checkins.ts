"use server";

import { getAuthenticatedSession, getUserIdFromSession } from "../utils/auth";
import prisma from "@repo/db/client";

export interface CheckinData {
  id: number;
  userId: number;
  checkinAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Record a user check-in when they access the application
 */
export async function recordUserCheckin(ipAddress?: string, userAgent?: string): Promise<CheckinData> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    const checkin = await prisma.userCheckin.create({
      data: {
        userId,
        checkinAt: new Date(),
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    return {
      id: checkin.id,
      userId: checkin.userId,
      checkinAt: checkin.checkinAt,
      ipAddress: checkin.ipAddress || undefined,
      userAgent: checkin.userAgent || undefined,
    };
  } catch (error) {
    console.error("Error recording user checkin:", error);
    throw new Error("Failed to record checkin");
  }
}

/**
 * Get the last check-in date for a user
 */
export async function getLastCheckinDate(userId?: number): Promise<Date | null> {
  try {
    let targetUserId: number;
    
    if (userId) {
      targetUserId = userId;
    } else {
      const session = await getAuthenticatedSession();
      targetUserId = getUserIdFromSession(session.user.id);
    }

    const lastCheckin = await prisma.userCheckin.findFirst({
      where: { userId: targetUserId },
      orderBy: { checkinAt: 'desc' },
      select: { checkinAt: true },
    });

    return lastCheckin?.checkinAt || null;
  } catch (error) {
    console.error("Error getting last checkin date:", error);
    return null;
  }
}

/**
 * Check if a user has been inactive for more than the specified days
 */
export async function isUserInactive(userId: number, inactiveDays: number = 15): Promise<boolean> {
  try {
    const lastCheckin = await getLastCheckinDate(userId);
    
    if (!lastCheckin) {
      // If no checkin found, consider user inactive
      return true;
    }

    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysDiff > inactiveDays;
  } catch (error) {
    console.error("Error checking user inactivity:", error);
    return false;
  }
}

/**
 * Get all inactive users (not checked in for more than specified days)
 */
export async function getInactiveUsers(inactiveDays: number = 15): Promise<{ userId: number; email: string | null; name: string | null; lastCheckin: Date | null }[]> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    // Get users who either haven't checked in at all or their last checkin was before cutoff
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        userCheckins: {
          orderBy: { checkinAt: 'desc' },
          take: 1,
          select: { checkinAt: true },
        },
      },
    });

    const inactiveUsers = users.filter(user => {
      if (user.userCheckins.length === 0) {
        return true; // No checkins at all
      }
      
      const lastCheckin = user.userCheckins[0]?.checkinAt;
      return lastCheckin ? lastCheckin < cutoffDate : true;
    });

    return inactiveUsers.map(user => ({
      userId: user.id,
      email: user.email,
      name: user.name,
      lastCheckin: user.userCheckins[0]?.checkinAt || null,
    }));
  } catch (error) {
    console.error("Error getting inactive users:", error);
    return [];
  }
}

/**
 * Get user checkin history
 */
export async function getUserCheckins(limit: number = 10): Promise<CheckinData[]> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    const checkins = await prisma.userCheckin.findMany({
      where: { userId },
      orderBy: { checkinAt: 'desc' },
      take: limit,
    });

    return checkins.map(checkin => ({
      id: checkin.id,
      userId: checkin.userId,
      checkinAt: checkin.checkinAt,
      ipAddress: checkin.ipAddress || undefined,
      userAgent: checkin.userAgent || undefined,
    }));
  } catch (error) {
    console.error("Error getting user checkins:", error);
    throw new Error("Failed to get checkins");
  }
}

/**
 * Process inactive users for email notifications (7-day threshold)
 */
export async function processInactiveUsersForEmailNotifications(): Promise<{
  processedUsers: number;
  emailsSent: number;
  notificationsCreated: number;
  errors: string[];
}> {
  try {
    console.log("Starting inactive users email notification process...");
    
    const inactiveUsers = await getInactiveUsers(7); // Users inactive for more than 7 days
    console.log(`Found ${inactiveUsers.length} users inactive for 7+ days`);

    let processedUsers = 0;
    let emailsSent = 0;
    let notificationsCreated = 0;
    const errors: string[] = [];

    for (const user of inactiveUsers) {
      try {
        if (!user.email) {
          console.log(`User ${user.userId} has no email address, skipping...`);
          continue;
        }

        // Check if we've already sent an inactivity email recently (within last 7 days)
        const recentEmailCheck = await prisma.notification.findFirst({
          where: {
            userId: user.userId,
            type: 'MONTHLY_SUMMARY', // Using existing type for now, we'll create a new one later
            message: {
              contains: 'inactivity reminder' // Check for our specific message pattern
            },
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
            }
          }
        });

        if (recentEmailCheck) {
          console.log(`Inactivity email already sent to user ${user.userId} within last 7 days, skipping...`);
          continue;
        }

        // Calculate days since last checkin
        const daysSinceLastCheckin = user.lastCheckin 
          ? Math.floor((Date.now() - user.lastCheckin.getTime()) / (1000 * 60 * 60 * 24))
          : 999; // Never checked in

        // Send inactivity reminder email
        const { sendInactivityReminderEmail } = await import('../services/email');
        const emailResult = await sendInactivityReminderEmail(
          user.email, 
          user.name || undefined, 
          daysSinceLastCheckin === 999 ? undefined : daysSinceLastCheckin
        );

        if (emailResult.success) {
          emailsSent++;
          console.log(`Inactivity email sent successfully to ${user.email}`);

          // Create notification for the user
          const { createNotification } = await import('./notifications');
          await createNotification(
            user.userId,
            "📊 Inactivity Reminder Sent",
            `We've sent you an inactivity reminder email. You haven't checked in for ${daysSinceLastCheckin === 999 ? 'a while' : `${daysSinceLastCheckin} days`}. Time to get back on track with your finances!`,
            "MONTHLY_SUMMARY", // Using existing type for now
            "NORMAL",
            "/dashboard",
            {
              emailSent: true,
              daysSinceLastCheckin,
              lastCheckin: user.lastCheckin?.toISOString(),
              reminderType: 'inactivity reminder',
            }
          );
          notificationsCreated++;
          console.log(`Notification created for user ${user.userId}`);
        } else {
          errors.push(`Failed to send email to ${user.email}: ${emailResult.error}`);
          console.error(`Failed to send inactivity email to ${user.email}:`, emailResult.error);
        }

        processedUsers++;

      } catch (error) {
        console.error(`Error processing inactive user ${user.userId}:`, error);
        errors.push(`User ${user.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`Processed ${processedUsers} users, sent ${emailsSent} emails, created ${notificationsCreated} notifications`);
    
    return {
      processedUsers,
      emailsSent,
      notificationsCreated,
      errors
    };

  } catch (error) {
    console.error("Error in processInactiveUsersForEmailNotifications:", error);
    return {
      processedUsers: 0,
      emailsSent: 0,
      notificationsCreated: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"]
    };
  }
}
