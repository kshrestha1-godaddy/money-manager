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
