"use server";

import { getAuthenticatedSession, getUserIdFromSession } from "../utils/auth";
import { getPasswords, decryptPasswordValue } from "../(dashboard)/passwords/actions/passwords";
import { getEmergencyEmailsForUser } from "./emergency-emails";
import { getLastCheckinDate, isUserInactive, getInactiveUsers } from "./checkins";
import { createNotification } from "./notifications";
import { sendPasswordShareEmail, PasswordShareEmailData } from "../services/email";
import prisma from "@repo/db/client";

export interface PasswordShareResult {
  success: boolean;
  sharedCount: number;
  failedEmails: string[];
  error?: string;
}

export interface SharePasswordsData {
  secretKey: string;
  reason?: 'MANUAL' | 'EMERGENCY';
  specificEmails?: string[]; // Optional: share to specific emails instead of all emergency emails
}

/**
 * Share all user passwords with their emergency email contacts
 */
export async function sharePasswordsWithEmergencyContacts(data: SharePasswordsData): Promise<PasswordShareResult> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    const { secretKey, reason = 'MANUAL', specificEmails } = data;

    // Get user's passwords
    const passwords = await getPasswords();
    
    if (passwords.length === 0) {
      return {
        success: false,
        sharedCount: 0,
        failedEmails: [],
        error: "No passwords found to share"
      };
    }

    // Get emergency emails
    let emergencyEmails;
    if (specificEmails && specificEmails.length > 0) {
      emergencyEmails = specificEmails.map(email => ({ email, label: undefined }));
    } else {
      const emailData = await getEmergencyEmailsForUser(userId);
      emergencyEmails = emailData.map(e => ({ email: e.email, label: e.label }));
    }

    if (emergencyEmails.length === 0) {
      return {
        success: false,
        sharedCount: 0,
        failedEmails: [],
        error: "No emergency email contacts found"
      };
    }

    // Decrypt passwords for sharing
    const decryptedPasswords = [];
    const failedDecryption: string[] = [];

    for (const password of passwords) {
      try {
        // Decrypt main password
        const decryptedPassword = await decryptPasswordValue({
          passwordHash: password.passwordHash,
          secretKey
        });

        // Decrypt transaction PIN if exists
        let decryptedPin;
        if (password.transactionPin) {
          try {
            decryptedPin = await decryptPasswordValue({
              passwordHash: password.transactionPin,
              secretKey
            });
          } catch (error) {
            // If PIN decryption fails, continue without it
            console.warn(`Failed to decrypt transaction PIN for ${password.websiteName}:`, error);
          }
        }

        decryptedPasswords.push({
          websiteName: password.websiteName,
          description: password.description,
          username: password.username,
          password: decryptedPassword,
          transactionPin: decryptedPin,
          notes: password.notes,
          category: password.category,
          validity: password.validity || undefined,
        });
      } catch (error) {
        console.error(`Failed to decrypt password for ${password.websiteName}:`, error);
        failedDecryption.push(password.websiteName);
      }
    }

    if (decryptedPasswords.length === 0) {
      return {
        success: false,
        sharedCount: 0,
        failedEmails: [],
        error: `Failed to decrypt passwords. Please check your secret key. Failed items: ${failedDecryption.join(', ')}`
      };
    }

    // Get user info for the email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    const lastCheckin = reason === 'MANUAL' ? null : await getLastCheckinDate(userId);
    
    // Prepare email data
    const emailData: PasswordShareEmailData = {
      passwords: decryptedPasswords,
      userName: user?.name || undefined,
      shareReason: reason,
      lastCheckinDate: lastCheckin || undefined,
    };

    // Send emails to emergency contacts
    const failedEmails: string[] = [];
    let successCount = 0;

    for (const contact of emergencyEmails) {
      try {
        const result = await sendPasswordShareEmail(contact.email, emailData);
        if (result.success) {
          successCount++;
          
          // Record the password share
          await prisma.passwordShare.create({
            data: {
              userId,
              recipientEmail: contact.email,
              passwordCount: decryptedPasswords.length,
              shareReason: reason,
              sentAt: new Date(),
            },
          });
        } else {
          failedEmails.push(contact.email);
        }
      } catch (error) {
        console.error(`Failed to send password share email to ${contact.email}:`, error);
        failedEmails.push(contact.email);
      }
    }

    // Create notification for the user
    if (successCount > 0) {
      await createNotification(
        userId,
        "🔐 Passwords Shared",
        `Your ${decryptedPasswords.length} passwords have been shared with ${successCount} emergency contact${successCount > 1 ? 's' : ''}. Reason: ${reason === 'MANUAL' ? 'Manual request' : 'Emergency share'}.`,
        "PASSWORD_SHARED",
        "HIGH",
        undefined,
        {
          passwordCount: decryptedPasswords.length,
          recipientCount: successCount,
          shareReason: reason,
          sentAt: new Date().toISOString(),
        }
      );
    }

    return {
      success: successCount > 0,
      sharedCount: successCount,
      failedEmails,
      error: failedEmails.length > 0 ? `Failed to send to: ${failedEmails.join(', ')}` : undefined
    };

  } catch (error) {
    console.error("Error sharing passwords with emergency contacts:", error);
    return {
      success: false,
      sharedCount: 0,
      failedEmails: [],
      error: error instanceof Error ? error.message : "Failed to share passwords"
    };
  }
}

/**
 * Check for inactive users and share their passwords automatically
 */
export async function processInactiveUsersPasswordSharing(): Promise<{
  processedUsers: number;
  successfulShares: number;
  errors: string[];
}> {
  try {
    console.log("Starting inactive users password sharing process...");
    
    const inactiveUsers = await getInactiveUsers(15); // Users inactive for more than 15 days
    console.log(`Found ${inactiveUsers.length} inactive users`);

    let processedUsers = 0;
    let successfulShares = 0;
    const errors: string[] = [];

    for (const user of inactiveUsers) {
      try {
        // Check if user has emergency emails configured
        const emergencyEmails = await getEmergencyEmailsForUser(user.userId);
        
        if (emergencyEmails.length === 0) {
          console.log(`User ${user.userId} has no emergency emails configured, skipping...`);
          continue;
        }

        // Check if we've already sent password share for this user recently (within last 7 days)
        const recentShare = await prisma.passwordShare.findFirst({
          where: {
            userId: user.userId,
            shareReason: 'INACTIVITY',
            sentAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
            }
          }
        });

        if (recentShare) {
          console.log(`Password already shared for user ${user.userId} within last 7 days, skipping...`);
          continue;
        }

        // Get user's passwords (this requires being authenticated as the user, which we can't do here)
        // For now, we'll need a different approach - maybe store a master key or handle this differently
        // This is a security consideration that needs to be addressed
        
        console.log(`Would process password sharing for user ${user.userId}, but we need to handle authentication differently`);
        processedUsers++;
        
        // For now, create a notification for the user about inactivity
        await createNotification(
          user.userId,
          "⚠️ Account Inactivity Detected",
          `You haven't checked into your MoneyManager account for more than 15 days. Please log in to prevent automatic password sharing to your emergency contacts.`,
          "PASSWORD_EXPIRY", // Using existing type for now
          "HIGH",
          "/passwords",
          {
            lastCheckin: user.lastCheckin?.toISOString(),
            inactiveDays: Math.floor((Date.now() - (user.lastCheckin?.getTime() || 0)) / (1000 * 60 * 60 * 24)),
          }
        );

      } catch (error) {
        console.error(`Error processing inactive user ${user.userId}:`, error);
        errors.push(`User ${user.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`Processed ${processedUsers} users, ${successfulShares} successful shares`);
    
    return {
      processedUsers,
      successfulShares,
      errors
    };

  } catch (error) {
    console.error("Error in processInactiveUsersPasswordSharing:", error);
    return {
      processedUsers: 0,
      successfulShares: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"]
    };
  }
}

/**
 * Get password sharing history for current user
 */
export async function getPasswordSharingHistory(limit: number = 10) {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    const shares = await prisma.passwordShare.findMany({
      where: { userId },
      orderBy: { sentAt: 'desc' },
      take: limit,
    });

    return shares.map(share => ({
      id: share.id,
      recipientEmail: share.recipientEmail,
      sentAt: share.sentAt,
      passwordCount: share.passwordCount,
      shareReason: share.shareReason,
      expiresAt: share.expiresAt,
    }));

  } catch (error) {
    console.error("Error getting password sharing history:", error);
    throw new Error("Failed to get password sharing history");
  }
}

/**
 * Check if user should be warned about inactivity
 */
export async function shouldWarnUserAboutInactivity(userId?: number): Promise<{
  shouldWarn: boolean;
  daysSinceLastCheckin: number;
  daysUntilPasswordShare: number;
}> {
  try {
    let targetUserId: number;
    
    if (userId) {
      targetUserId = userId;
    } else {
      const session = await getAuthenticatedSession();
      targetUserId = getUserIdFromSession(session.user.id);
    }

    const lastCheckin = await getLastCheckinDate(targetUserId);
    
    if (!lastCheckin) {
      return {
        shouldWarn: true,
        daysSinceLastCheckin: 999, // Indicate never checked in
        daysUntilPasswordShare: 0,
      };
    }

    const daysSinceLastCheckin = Math.floor((Date.now() - lastCheckin.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilPasswordShare = Math.max(0, 15 - daysSinceLastCheckin);
    
    // Warn if user has been inactive for 10+ days (5 days before password sharing)
    const shouldWarn = daysSinceLastCheckin >= 10;

    return {
      shouldWarn,
      daysSinceLastCheckin,
      daysUntilPasswordShare,
    };

  } catch (error) {
    console.error("Error checking if user should be warned:", error);
    return {
      shouldWarn: false,
      daysSinceLastCheckin: 0,
      daysUntilPasswordShare: 15,
    };
  }
}
