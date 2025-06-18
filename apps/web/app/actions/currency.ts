"use server";

import prisma from "@repo/db/client";
import { revalidatePath } from "next/cache";
import { 
    getUserIdFromSession, 
    getAuthenticatedSession 
} from "../utils/auth";

export async function getUserCurrency(): Promise<string> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true }
    });
    return user?.currency || "USD";
  } catch (error) {
    console.error("Failed to fetch user currency:", error);
    return "USD";
  }
}

export async function updateUserCurrency(currency: string) {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    await prisma.user.update({
      where: { id: userId },
      data: { currency }
    });
    
    revalidatePath("/");
    console.info(`Currency updated successfully to ${currency} for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to update currency to ${currency}:`, error);
    throw new Error("Failed to update currency");
  }
} 