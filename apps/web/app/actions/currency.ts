"use server";

import prisma from "@repo/db/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";

// Helper function to get user ID from session
function getUserIdFromSession(sessionUserId: string): number {
    // If it's a very large number (OAuth provider), take last 5 digits
    if (sessionUserId.length > 5) {
        return parseInt(sessionUserId.slice(-5));
    }
    // Otherwise parse normally
    return parseInt(sessionUserId);
}

export async function getUserCurrency(): Promise<string> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return "USD";
    }

    const userId = getUserIdFromSession(session.user.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true }
    });
    return user?.currency || "USD";
  } catch (error) {
    console.error("Error fetching user currency:", error);
    return "USD";
  }
}

export async function updateUserCurrency(currency: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);
    await prisma.user.update({
      where: { id: userId },
      data: { currency }
    });
    
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error updating user currency:", error);
    throw new Error("Failed to update currency");
  }
} 