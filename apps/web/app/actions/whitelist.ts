"use server";

import prisma from "@repo/db/client";
import { validateEmail } from "../utils/auth";


export async function isEmailWhitelisted(email: string): Promise<boolean> {
  if (!email) return false;

  // Validate email format before checking database
  if (!validateEmail(email)) {
    return false;
  }

  try {
    const whitelistedEmail = await prisma.whitelistedEmail.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
    });

    return whitelistedEmail !== null && whitelistedEmail.isActive;
  } catch (error) {
    console.error(`Failed to check whitelisted email ${email}:`, error);
    return false;
  }
}


export async function addEmailToWhitelist(
  email: string,
  addedBy?: string,
  reason?: string
): Promise<boolean> {
  if (!email) return false;

  // Validate email format before adding to database
  if (!validateEmail(email)) {
    console.error(`Invalid email format for whitelist addition: ${email}`);
    return false;
  }

  try {
    await prisma.whitelistedEmail.upsert({
      where: {
        email: email.toLowerCase().trim(),
      },
      update: {
        isActive: true,
        addedBy,
        reason,
        updatedAt: new Date(),
      },
      create: {
        email: email.toLowerCase().trim(),
        addedBy,
        reason,
        isActive: true,
      },
    });

    console.info(`Email added to whitelist: ${email} by ${addedBy || 'system'}`);
    return true;
  } catch (error) {
    console.error(`Failed to add email to whitelist ${email}:`, error);
    return false;
  }
}


export async function removeEmailFromWhitelist(email: string): Promise<boolean> {
  if (!email) return false;

  // Validate email format before processing
  if (!validateEmail(email)) {
    console.error(`Invalid email format for whitelist removal: ${email}`);
    return false;
  }

  try {
    await prisma.whitelistedEmail.update({
      where: {
        email: email.toLowerCase().trim(),
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    console.info(`Email removed from whitelist: ${email}`);
    return true;
  } catch (error) {
    console.error(`Failed to remove email from whitelist ${email}:`, error);
    return false;
  }
}


export async function getAllWhitelistedEmails(activeOnly: boolean = true) {
  try {
    return await prisma.whitelistedEmail.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    console.error("Failed to fetch whitelisted emails:", error);
    return [];
  }
} 