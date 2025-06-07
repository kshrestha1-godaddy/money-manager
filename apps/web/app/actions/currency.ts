"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function getUserCurrency(userId: number): Promise<string> {
  try {
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

export async function updateUserCurrency(userId: number, currency: string) {
  try {
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