"use server";

import prisma from "@repo/db/client";
import { TransactionImage, TransactionImageType } from "../types/financial";
import { put, del } from '@vercel/blob';
import { revalidatePath } from 'next/cache';
import { 
    getUserIdFromSession, 
    getAuthenticatedSession 
} from "../utils/auth";

export interface CreateTransactionImageData {
  imageUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  transactionType: TransactionImageType;
  transactionId: number;
  description?: string;
}

export interface TransactionImageResponse {
  success: boolean;
  data?: TransactionImage | TransactionImage[];
  error?: string;
}

export interface UploadTransactionImageData {
  file: File;
  transactionType: TransactionImageType;
  transactionId: number;
  description?: string;
}

/**
 * Upload and create a new transaction image
 */
export async function uploadTransactionImage(
  formData: FormData
): Promise<TransactionImageResponse> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    const imageFile = formData.get('image') as File;
    const transactionType = formData.get('transactionType') as TransactionImageType;
    const transactionId = parseInt(formData.get('transactionId') as string);
    const description = formData.get('description') as string;

    if (!imageFile || imageFile.size === 0) {
      return { success: false, error: "No image file provided" };
    }

    if (!transactionType || !transactionId) {
      return { success: false, error: "Transaction type and ID are required" };
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      return {
        success: false,
        error: 'Invalid file type. Please upload JPEG, PNG, or WebP images only.'
      };
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (imageFile.size > maxSize) {
      return {
        success: false,
        error: 'File size too large. Please upload an image under 5MB.'
      };
    }

    // Generate unique filename
    const timestamp = new Date().getTime();
    const fileExtension = imageFile.name.split('.').pop();
    const fileName = `${transactionType.toLowerCase()}-${transactionId}-${timestamp}.${fileExtension}`;

    // Upload to Vercel Blob
    const blob = await put(fileName, imageFile, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Create database record
    const transactionImage = await prisma.transactionImage.create({
      data: {
        imageUrl: blob.url,
        fileName: imageFile.name,
        fileSize: imageFile.size,
        mimeType: imageFile.type,
        transactionType,
        transactionId,
        description: description || undefined,
        userId
      }
    });

    // Revalidate relevant pages
    revalidatePath(`/(dashboard)/${transactionType.toLowerCase()}s`, 'page');
    revalidatePath('/(dashboard)/transactions', 'page');

    return { success: true, data: transactionImage as TransactionImage };

  } catch (error) {
    console.error('Error uploading transaction image:', error);
    return {
      success: false,
      error: 'Failed to upload image. Please try again.'
    };
  }
}

/**
 * Create a transaction image record (when image is already uploaded)
 */
export async function createTransactionImage(
  data: CreateTransactionImageData
): Promise<TransactionImageResponse> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    const transactionImage = await prisma.transactionImage.create({
      data: {
        ...data,
        userId
      }
    });

    // Revalidate relevant pages
    revalidatePath(`/(dashboard)/${data.transactionType.toLowerCase()}s`, 'page');
    revalidatePath('/(dashboard)/transactions', 'page');

    return { success: true, data: transactionImage as TransactionImage };

  } catch (error) {
    console.error('Error creating transaction image:', error);
    return {
      success: false,
      error: 'Failed to create image record. Please try again.'
    };
  }
}

/**
 * Get all images for a specific transaction
 */
export async function getTransactionImages(
  transactionType: TransactionImageType,
  transactionId: number
): Promise<TransactionImageResponse> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    const images = await prisma.transactionImage.findMany({
      where: {
        userId,
        transactionType,
        transactionId,
        isActive: true
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    });

    return { success: true, data: images as TransactionImage[] };

  } catch (error) {
    console.error('Error fetching transaction images:', error);
    return {
      success: false,
      error: 'Failed to fetch images. Please try again.'
    };
  }
}

/**
 * Get all images for a user, optionally filtered by transaction type
 */
export async function getUserTransactionImages(
  transactionType?: TransactionImageType,
  limit?: number
): Promise<TransactionImageResponse> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    const whereClause: any = {
      userId,
      isActive: true
    };

    if (transactionType) {
      whereClause.transactionType = transactionType;
    }

    const images = await prisma.transactionImage.findMany({
      where: whereClause,
      orderBy: {
        uploadedAt: 'desc'
      },
      take: limit
    });

    return { success: true, data: images as TransactionImage[] };

  } catch (error) {
    console.error('Error fetching user transaction images:', error);
    return {
      success: false,
      error: 'Failed to fetch images. Please try again.'
    };
  }
}

/**
 * Update a transaction image
 */
export async function updateTransactionImage(
  imageId: number,
  updates: Partial<Pick<TransactionImage, 'description' | 'fileName'>>
): Promise<TransactionImageResponse> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    // Verify ownership
    const existingImage = await prisma.transactionImage.findFirst({
      where: {
        id: imageId,
        userId
      }
    });

    if (!existingImage) {
      return { success: false, error: "Image not found or unauthorized" };
    }

    const updatedImage = await prisma.transactionImage.update({
      where: { id: imageId },
      data: updates
    });

    // Revalidate relevant pages
    revalidatePath(`/(dashboard)/${existingImage.transactionType.toLowerCase()}s`, 'page');
    revalidatePath('/(dashboard)/transactions', 'page');

    return { success: true, data: updatedImage as TransactionImage };

  } catch (error) {
    console.error('Error updating transaction image:', error);
    return {
      success: false,
      error: 'Failed to update image. Please try again.'
    };
  }
}

/**
 * Soft delete a transaction image (mark as inactive)
 */
export async function deactivateTransactionImage(
  imageId: number
): Promise<TransactionImageResponse> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    // Verify ownership
    const existingImage = await prisma.transactionImage.findFirst({
      where: {
        id: imageId,
        userId
      }
    });

    if (!existingImage) {
      return { success: false, error: "Image not found or unauthorized" };
    }

    const updatedImage = await prisma.transactionImage.update({
      where: { id: imageId },
      data: { isActive: false }
    });

    // Revalidate relevant pages
    revalidatePath(`/(dashboard)/${existingImage.transactionType.toLowerCase()}s`, 'page');
    revalidatePath('/(dashboard)/transactions', 'page');

    return { success: true, data: updatedImage as TransactionImage };

  } catch (error) {
    console.error('Error deactivating transaction image:', error);
    return {
      success: false,
      error: 'Failed to deactivate image. Please try again.'
    };
  }
}

/**
 * Permanently delete a transaction image and its blob
 */
export async function deleteTransactionImage(
  imageId: number
): Promise<TransactionImageResponse> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    // Get the image to delete blob
    const existingImage = await prisma.transactionImage.findFirst({
      where: {
        id: imageId,
        userId
      }
    });

    if (!existingImage) {
      return { success: false, error: "Image not found or unauthorized" };
    }

    // Delete from database first
    await prisma.transactionImage.delete({
      where: { id: imageId }
    });

    // Try to delete from blob storage (non-critical)
    try {
      await del(existingImage.imageUrl);
    } catch (blobError) {
      console.warn('Failed to delete blob:', blobError);
      // Continue since database deletion succeeded
    }

    // Revalidate relevant pages
    revalidatePath(`/(dashboard)/${existingImage.transactionType.toLowerCase()}s`, 'page');
    revalidatePath('/(dashboard)/transactions', 'page');

    return { success: true };

  } catch (error) {
    console.error('Error deleting transaction image:', error);
    return {
      success: false,
      error: 'Failed to delete image. Please try again.'
    };
  }
}

/**
 * Get image statistics for a user
 */
export async function getTransactionImageStats(): Promise<TransactionImageResponse> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    const stats = await prisma.transactionImage.groupBy({
      by: ['transactionType'],
      where: {
        userId,
        isActive: true
      },
      _count: {
        id: true
      },
      _sum: {
        fileSize: true
      }
    });

    return { success: true, data: stats as any };

  } catch (error) {
    console.error('Error fetching transaction image stats:', error);
    return {
      success: false,
      error: 'Failed to fetch image statistics. Please try again.'
    };
  }
}