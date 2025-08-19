"use server";

import prisma from "@repo/db/client";
import { revalidatePath } from "next/cache";
import { 
    getUserIdFromSession, 
    getAuthenticatedSession 
} from "../utils/auth";
import { isValidTimezone, detectUserTimezone } from "../utils/timezone";

export async function getUserTimezone(): Promise<string> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true }
    });
    
    const userTimezone = user?.timezone || "UTC";
    
    // Validate the stored timezone, fallback to UTC if invalid
    if (!isValidTimezone(userTimezone)) {
      console.warn(`Invalid timezone stored for user ${userId}: ${userTimezone}, falling back to UTC`);
      return "UTC";
    }
    
    return userTimezone;
  } catch (error) {
    console.error("Failed to fetch user timezone:", error);
    return "UTC";
  }
}

export async function updateUserTimezone(timezone: string) {
  try {
    // Validate timezone before saving
    if (!isValidTimezone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }
    
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    await prisma.user.update({
      where: { id: userId },
      data: { timezone }
    });
    
    revalidatePath("/");
    console.info(`Timezone updated successfully to ${timezone} for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to update timezone to ${timezone}:`, error);
    throw new Error("Failed to update timezone");
  }
}

export async function initializeUserTimezone(): Promise<string> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true }
    });
    
    // If user doesn't have a timezone set or it's the default UTC, 
    // we'll return UTC but won't automatically update the database
    // The client can detect and set the timezone if needed
    if (!user?.timezone || user.timezone === "UTC") {
      return "UTC";
    }
    
    return user.timezone;
  } catch (error) {
    console.error("Failed to initialize user timezone:", error);
    return "UTC";
  }
}

export async function setTimezoneFromBrowser(detectedTimezone: string) {
  try {
    // Validate the detected timezone
    if (!isValidTimezone(detectedTimezone)) {
      console.warn(`Invalid detected timezone: ${detectedTimezone}`);
      return { success: false, error: "Invalid timezone detected" };
    }
    
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true }
    });
    
    // Only update if the user currently has UTC (default) or an invalid timezone
    if (!user?.timezone || user.timezone === "UTC" || !isValidTimezone(user.timezone)) {
      await prisma.user.update({
        where: { id: userId },
        data: { timezone: detectedTimezone }
      });
      
      revalidatePath("/");
      console.info(`Timezone auto-detected and set to ${detectedTimezone} for user ${userId}`);
      return { success: true, timezone: detectedTimezone };
    }
    
    // User already has a valid timezone set, don't override
    return { success: true, timezone: user.timezone, message: "User timezone already set" };
  } catch (error) {
    console.error(`Failed to set timezone from browser detection:`, error);
    return { success: false, error: "Failed to set timezone" };
  }
}
