import prisma from "@repo/db/client";

/**
 * Check if an email is whitelisted in the database
 * @param email - The email to check
 * @returns Promise<boolean> - True if email is whitelisted and active
 */
export async function isEmailWhitelisted(email: string): Promise<boolean> {
  if (!email) return false;

  try {
    const whitelistedEmail = await prisma.whitelistedEmail.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
    });

    return whitelistedEmail !== null && whitelistedEmail.isActive;
  } catch (error) {
    console.error("Error checking whitelisted email:", error);
    return false;
  }
}

/**
 * Add an email to the whitelist
 * @param email - The email to add
 * @param addedBy - Who added this email
 * @param reason - Reason for whitelisting
 * @returns Promise<boolean> - True if successfully added
 */
export async function addEmailToWhitelist(
  email: string,
  addedBy?: string,
  reason?: string
): Promise<boolean> {
  if (!email) return false;

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

    return true;
  } catch (error) {
    console.error("Error adding email to whitelist:", error);
    return false;
  }
}

/**
 * Remove an email from the whitelist (deactivate)
 * @param email - The email to remove
 * @returns Promise<boolean> - True if successfully removed
 */
export async function removeEmailFromWhitelist(email: string): Promise<boolean> {
  if (!email) return false;

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

    return true;
  } catch (error) {
    console.error("Error removing email from whitelist:", error);
    return false;
  }
}

/**
 * Get all whitelisted emails
 * @param activeOnly - Whether to return only active emails
 * @returns Promise<Array> - Array of whitelisted email objects
 */
export async function getAllWhitelistedEmails(activeOnly: boolean = true) {
  try {
    return await prisma.whitelistedEmail.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    console.error("Error fetching whitelisted emails:", error);
    return [];
  }
} 