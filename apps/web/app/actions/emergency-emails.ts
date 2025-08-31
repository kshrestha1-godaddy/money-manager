"use server";

import { getAuthenticatedSession, getUserIdFromSession } from "../utils/auth";
import prisma from "@repo/db/client";

export interface EmergencyEmailData {
  id: number;
  email: string;
  label?: string;
  userId: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmergencyEmailData {
  email: string;
  label?: string;
}

export interface UpdateEmergencyEmailData {
  id: number;
  email?: string;
  label?: string;
  isActive?: boolean;
}

/**
 * Get all emergency emails for the current user
 */
export async function getEmergencyEmails(): Promise<EmergencyEmailData[]> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    const emails = await prisma.emergencyEmail.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return emails.map(email => ({
      id: email.id,
      email: email.email,
      label: email.label || undefined,
      userId: email.userId,
      isActive: email.isActive,
      createdAt: email.createdAt,
      updatedAt: email.updatedAt,
    }));
  } catch (error) {
    console.error("Error fetching emergency emails:", error);
    throw new Error("Failed to fetch emergency emails");
  }
}

/**
 * Get emergency emails for a specific user (for system use)
 */
export async function getEmergencyEmailsForUser(userId: number): Promise<EmergencyEmailData[]> {
  try {
    const emails = await prisma.emergencyEmail.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return emails.map(email => ({
      id: email.id,
      email: email.email,
      label: email.label || undefined,
      userId: email.userId,
      isActive: email.isActive,
      createdAt: email.createdAt,
      updatedAt: email.updatedAt,
    }));
  } catch (error) {
    console.error("Error fetching emergency emails for user:", error);
    return [];
  }
}

/**
 * Add a new emergency email
 */
export async function addEmergencyEmail(data: CreateEmergencyEmailData): Promise<EmergencyEmailData> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error("Invalid email format");
    }

    const email = await prisma.emergencyEmail.create({
      data: {
        email: data.email.toLowerCase().trim(),
        label: data.label?.trim() || null,
        userId,
        isActive: true,
      },
    });

    return {
      id: email.id,
      email: email.email,
      label: email.label || undefined,
      userId: email.userId,
      isActive: email.isActive,
      createdAt: email.createdAt,
      updatedAt: email.updatedAt,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      throw new Error("This email is already added as an emergency contact");
    }
    console.error("Error adding emergency email:", error);
    throw new Error("Failed to add emergency email");
  }
}

/**
 * Update an emergency email
 */
export async function updateEmergencyEmail(data: UpdateEmergencyEmailData): Promise<EmergencyEmailData> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    // Verify the email belongs to the user
    const existingEmail = await prisma.emergencyEmail.findFirst({
      where: {
        id: data.id,
        userId: userId,
      },
    });

    if (!existingEmail) {
      throw new Error("Emergency email not found or unauthorized");
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error("Invalid email format");
      }
      updateData.email = data.email.toLowerCase().trim();
    }

    if (data.label !== undefined) {
      updateData.label = data.label?.trim() || null;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    const updatedEmail = await prisma.emergencyEmail.update({
      where: { id: data.id },
      data: updateData,
    });

    return {
      id: updatedEmail.id,
      email: updatedEmail.email,
      label: updatedEmail.label || undefined,
      userId: updatedEmail.userId,
      isActive: updatedEmail.isActive,
      createdAt: updatedEmail.createdAt,
      updatedAt: updatedEmail.updatedAt,
    };
  } catch (error) {
    console.error("Error updating emergency email:", error);
    throw new Error("Failed to update emergency email");
  }
}

/**
 * Delete an emergency email
 */
export async function deleteEmergencyEmail(id: number): Promise<void> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    // Verify the email belongs to the user
    const existingEmail = await prisma.emergencyEmail.findFirst({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!existingEmail) {
      throw new Error("Emergency email not found or unauthorized");
    }

    await prisma.emergencyEmail.delete({
      where: { id: id },
    });
  } catch (error) {
    console.error("Error deleting emergency email:", error);
    throw new Error("Failed to delete emergency email");
  }
}

/**
 * Check if user has any emergency emails configured
 */
export async function hasEmergencyEmails(userId?: number): Promise<boolean> {
  try {
    let targetUserId: number;
    
    if (userId) {
      targetUserId = userId;
    } else {
      const session = await getAuthenticatedSession();
      targetUserId = getUserIdFromSession(session.user.id);
    }

    const count = await prisma.emergencyEmail.count({
      where: { userId: targetUserId, isActive: true },
    });

    return count > 0;
  } catch (error) {
    console.error("Error checking emergency emails:", error);
    return false;
  }
}
