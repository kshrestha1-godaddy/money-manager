"use server";

import { PasswordInterface, PasswordFormData, PasswordUpdateData, DecryptPasswordData } from "../types/passwords";
import prisma from "@repo/db/client";
import { getAuthenticatedSession, getUserIdFromSession } from "../utils/auth";
import crypto from 'crypto';

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
    const favicon = `https://www.google.com/s2/favicons?domain=${new URL(data.websiteUrl).hostname}`;
    
    const password = await prisma.password.create({
      data: {
        websiteName: data.websiteName,
        websiteUrl: data.websiteUrl,
        username: data.username,
        passwordHash: passwordHash,
        notes: data.notes || null,
        category: data.category || null,
        tags: data.tags || [],
        favicon: favicon,
        userId: userId
      }
    });

    return {
      ...password,
      userId: password.userId.toString(),
      notes: password.notes || undefined,
      category: password.category || undefined,
      favicon: password.favicon || undefined
    };
  } catch (error) {
    console.error("Error creating password:", error);
    throw new Error("Failed to create password");
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
    if (data.websiteUrl !== undefined) {
      updateData.websiteUrl = data.websiteUrl;
      updateData.favicon = `https://www.google.com/s2/favicons?domain=${new URL(data.websiteUrl).hostname}`;
    }
    if (data.username !== undefined) updateData.username = data.username;
    if (data.password !== undefined && data.secretKey) {
      updateData.passwordHash = encryptPassword(data.password, data.secretKey);
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
      favicon: updatedPassword.favicon || undefined
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
            websiteUrl: {
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