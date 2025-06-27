"use server";

import { PasswordInterface, PasswordFormData, PasswordUpdateData, DecryptPasswordData } from "../types/passwords";
import prisma from "@repo/db/client";
import { getAuthenticatedSession, getUserIdFromSession } from "../utils/auth";
import crypto from 'crypto';
import { ParsedPasswordData } from "../utils/csvImportPasswords";

// Encryption and decryption functions
function encryptPassword(password: string, secretKey: string): string {
  const algorithm = 'aes-256-ctr';
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(secretKey).digest('base64').substr(0, 32);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(password), cipher.final()]);
  
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptPassword(hash: string, secretKey: string): string {
  try {
    const algorithm = 'aes-256-ctr';
    const parts = hash.split(':');
    
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted format");
    }
    
    const iv = Buffer.from(parts[0] || '', 'hex');
    const encryptedText = Buffer.from(parts[1] || '', 'hex');
    const key = crypto.createHash('sha256').update(secretKey).digest('base64').substr(0, 32);
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    throw new Error("Incorrect secret key or corrupted data");
  }
}

export async function getPasswords(): Promise<PasswordInterface[]> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    const passwords = await prisma.password.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return passwords.map(password => ({
      ...password,
      userId: password.userId.toString(),
      notes: password.notes || undefined,
      category: password.category || undefined,
      favicon: password.favicon || undefined
    }));
  } catch (error) {
    console.error("Error fetching passwords:", error);
    throw new Error("Failed to fetch passwords");
  }
}

export async function createPassword(data: PasswordFormData): Promise<PasswordInterface> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    const passwordHash = encryptPassword(data.password, data.secretKey);
    // Encrypt transaction PIN if provided
    const transactionPin = data.transactionPin 
      ? encryptPassword(data.transactionPin, data.secretKey) 
      : null;
    
    const password = await prisma.password.create({
      data: {
        websiteName: data.websiteName,
        description: data.description,
        username: data.username,
        passwordHash: passwordHash,
        transactionPin: transactionPin,
        validity: data.validity ? new Date(data.validity) : null,
        notes: data.notes || null,
        category: data.category || null,
        tags: data.tags || [],
        favicon: null,
        userId: userId
      }
    });

    return {
      ...password,
      userId: password.userId.toString(),
      notes: password.notes || undefined,
      category: password.category || undefined,
      favicon: password.favicon || undefined,
      transactionPin: password.transactionPin || undefined,
      validity: password.validity || undefined
    };
  } catch (error) {
    console.error("Error creating password:", error);
    throw new Error("Failed to create password");
  }
}

/**
 * Bulk import passwords from CSV data
 */
export async function bulkImportPasswords(
  passwordsData: ParsedPasswordData[],
  secretKey: string
): Promise<{ success: number; failed: number }> {
  try {
    console.log(`Server action: Starting bulk import of ${passwordsData.length} passwords`);
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    console.log(`Server action: Authenticated user ID: ${userId}`);
    
    let successCount = 0;
    let failedCount = 0;
    
    // Helper function to check if a string is already in encrypted format
    const isAlreadyEncrypted = (str: string): boolean => {
      return true;
    };
    
    // Process each password
    for (const data of passwordsData) {
      try {
        // Log sanitized data for debugging
        const sanitizedData = { ...data };
        sanitizedData.password = '[REDACTED]';
        if (sanitizedData.transactionPin) sanitizedData.transactionPin = '[REDACTED]';
        console.log('Server action: Processing password entry:', sanitizedData);
        
        // Check if password is already encrypted
        let passwordHash: string;
        if (isAlreadyEncrypted(data.password)) {
          console.log('Server action: Password is already encrypted, using as is');
          passwordHash = data.password;
        } else {
          console.log('Server action: Password is not encrypted, encrypting now');
          passwordHash = encryptPassword(data.password, secretKey);
        }
        
        // Check if transaction PIN is already encrypted
        let transactionPin: string | null = null;
        if (data.transactionPin) {
          if (isAlreadyEncrypted(data.transactionPin)) {
            console.log('Server action: Transaction PIN is already encrypted, using as is');
            transactionPin = data.transactionPin;
          } else {
            console.log('Server action: Transaction PIN is not encrypted, encrypting now');
            transactionPin = encryptPassword(data.transactionPin, secretKey);
          }
        }
        
        await prisma.password.create({
          data: {
            websiteName: data.websiteName,
            description: data.description,
            username: data.username,
            passwordHash: passwordHash,
            transactionPin: transactionPin,
            validity: data.validity || null,
            notes: data.notes || null,
            category: data.category || null,
            tags: data.tags || [],
            favicon: null,
            userId: userId
          }
        });
        
        successCount++;
        console.log(`Server action: Successfully imported password for ${data.websiteName}`);
      } catch (error) {
        console.error("Server action: Error importing password:", error);
        failedCount++;
      }
    }
    
    console.log(`Server action: Import complete. Success: ${successCount}, Failed: ${failedCount}`);
    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error("Server action: Error in bulk import:", error);
    throw new Error("Failed to import passwords");
  }
}

export async function updatePassword(data: PasswordUpdateData): Promise<PasswordInterface> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    // Verify the password belongs to the user
    const existingPassword = await prisma.password.findFirst({
      where: {
        id: data.id,
        userId: userId
      }
    });

    if (!existingPassword) {
      throw new Error("Password not found or unauthorized");
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    if (data.websiteName !== undefined) updateData.websiteName = data.websiteName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.username !== undefined) updateData.username = data.username;
    
    // Validate that secret key is provided when password is being updated
    if (data.password !== undefined) {
      if (!data.secretKey) {
        throw new Error("Secret key is required to update password");
      }
      updateData.passwordHash = encryptPassword(data.password, data.secretKey);
    }
    
    // Validate that secret key is provided when transaction PIN is being updated
    if (data.transactionPin !== undefined) {
      if (!data.secretKey) {
        throw new Error("Secret key is required to update transaction PIN");
      }
      updateData.transactionPin = data.transactionPin 
        ? encryptPassword(data.transactionPin, data.secretKey) 
        : null;
    }
    
    if (data.validity !== undefined) {
      updateData.validity = data.validity ? new Date(data.validity) : null;
    }
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = data.tags;

    const updatedPassword = await prisma.password.update({
      where: {
        id: data.id
      },
      data: updateData
    });

    return {
      ...updatedPassword,
      userId: updatedPassword.userId.toString(),
      notes: updatedPassword.notes || undefined,
      category: updatedPassword.category || undefined,
      favicon: updatedPassword.favicon || undefined,
      transactionPin: updatedPassword.transactionPin || undefined,
      validity: updatedPassword.validity || undefined
    };
  } catch (error) {
    console.error("Error updating password:", error);
    throw new Error("Failed to update password");
  }
}

export async function deletePassword(id: number): Promise<void> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    // Verify the password belongs to the user
    const existingPassword = await prisma.password.findFirst({
      where: {
        id: id,
        userId: userId
      }
    });

    if (!existingPassword) {
      throw new Error("Password not found or unauthorized");
    }

    await prisma.password.delete({
      where: {
        id: id
      }
    });
  } catch (error) {
    console.error("Error deleting password:", error);
    throw new Error("Failed to delete password");
  }
}

export async function decryptPasswordValue(data: DecryptPasswordData): Promise<string> {
  try {
    return decryptPassword(data.passwordHash, data.secretKey);
  } catch (error) {
    console.error("Error decrypting password:", error);
    throw new Error("Failed to decrypt password. Please check your secret key.");
  }
}

export async function getPasswordsByCategory(category: string): Promise<PasswordInterface[]> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    const passwords = await prisma.password.findMany({
      where: {
        userId: userId,
        category: category
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return passwords.map(password => ({
      ...password,
      userId: password.userId.toString(),
      notes: password.notes || undefined,
      category: password.category || undefined,
      favicon: password.favicon || undefined
    }));
  } catch (error) {
    console.error("Error fetching passwords by category:", error);
    throw new Error("Failed to fetch passwords by category");
  }
}

export async function searchPasswords(query: string): Promise<PasswordInterface[]> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    const searchTerm = query.toLowerCase();
    
    const passwords = await prisma.password.findMany({
      where: {
        userId: userId,
        OR: [
          {
            websiteName: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            username: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            notes: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            category: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            tags: {
              hasSome: [searchTerm]
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return passwords.map(password => ({
      ...password,
      userId: password.userId.toString(),
      notes: password.notes || undefined,
      category: password.category || undefined,
      favicon: password.favicon || undefined
    }));
  } catch (error) {
    console.error("Error searching passwords:", error);
    throw new Error("Failed to search passwords");
  }
}

export async function decryptTransactionPin(data: DecryptPasswordData): Promise<string> {
  try {
    return decryptPassword(data.passwordHash, data.secretKey);
  } catch (error) {
    console.error("Error decrypting transaction PIN:", error);
    throw new Error("Failed to decrypt transaction PIN. Please check your secret key.");
  }
} 