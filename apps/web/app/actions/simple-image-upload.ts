"use server";

import { put } from '@vercel/blob';

export interface SimpleUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Simple image upload to blob storage only (no database record)
 * Used for form uploads before transaction is created
 */
export async function uploadImageToBlob(formData: FormData): Promise<SimpleUploadResult> {
  try {
    const imageFile = formData.get('image') as File;
    
    if (!imageFile || imageFile.size === 0) {
      return {
        success: false,
        error: 'No image file provided'
      };
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

    // Generate a unique filename with timestamp
    const timestamp = new Date().getTime();
    const fileExtension = imageFile.name.split('.').pop();
    const fileName = `temp-receipt-${timestamp}.${fileExtension}`;

    // Upload to Vercel Blob
    const blob = await put(fileName, imageFile, {
      access: 'public',
      addRandomSuffix: true,
    });

    return {
      success: true,
      url: blob.url
    };
    
  } catch (error) {
    console.error('Error uploading image:', error);
    return {
      success: false,
      error: 'Failed to upload image. Please try again.'
    };
  }
}