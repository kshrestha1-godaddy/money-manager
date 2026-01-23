"use client";

import React, { useState, useRef, useEffect } from "react";
import { uploadImageToBlob, SimpleUploadResult } from "../../../actions/simple-image-upload";

interface ImageUploadProps {
    value?: string;
    onChange: (imageUrl: string) => void;
    disabled?: boolean;
}

export function ImageUpload({ value, onChange, disabled = false }: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string>("");
    const [previewUrl, setPreviewUrl] = useState<string>(value || "");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Update preview URL when value prop changes (for edit mode)
    useEffect(() => {
        setPreviewUrl(value || "");
        // Clear any previous upload errors when value changes
        if (uploadError) {
            setUploadError("");
        }
    }, [value, uploadError]);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Clear any previous errors
        setUploadError("");
        
        // Create a preview URL for immediate feedback
        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);
        
        // Start upload
        setIsUploading(true);
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const result: SimpleUploadResult = await uploadImageToBlob(formData);
            
            if (result.success && result.url) {
                // Clean up preview URL
                URL.revokeObjectURL(preview);
                
                // Update with the actual uploaded URL
                setPreviewUrl(result.url);
                onChange(result.url);
            } else {
                // Revert to previous state on error
                setPreviewUrl(value || "");
                setUploadError(result.error || "Upload failed");
            }
        } catch (error) {
            console.error('Upload error:', error);
            setPreviewUrl(value || "");
            setUploadError("Failed to upload image. Please try again.");
        } finally {
            setIsUploading(false);
            
            // Clear the file input so the same file can be selected again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveImage = () => {
        setPreviewUrl("");
        onChange("");
        setUploadError("");
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const triggerFileSelect = () => {
        if (!disabled && !isUploading) {
            fileInputRef.current?.click();
        }
    };

    return (
        <div className="space-y-3">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                disabled={disabled || isUploading}
            />
            
            {/* Upload area */}
            <div className="space-y-2">
                {!previewUrl ? (
                    // Upload button when no image
                    <button
                        type="button"
                        onClick={triggerFileSelect}
                        disabled={disabled || isUploading}
                        className={`
                            w-full p-4 border-2 border-dashed rounded-lg text-center transition-all
                            ${disabled || isUploading 
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed' 
                                : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 cursor-pointer'
                            }
                        `}
                    >
                        <div className="space-y-2">
                            <div className="mx-auto w-12 h-12 text-gray-400">
                                {isUploading ? (
                                    <div className="flex items-center justify-center w-full h-full">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : (
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
                                        <path
                                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                            </div>
                            <div className="text-sm">
                                {isUploading ? (
                                    "Uploading image..."
                                ) : (
                                    <>
                                        <span className="font-medium">Click to upload receipt</span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            JPEG, PNG, or WebP up to 5MB
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </button>
                ) : (
                    // Preview when image is loaded
                    <div className="relative border border-gray-300 rounded-lg overflow-hidden">
                        <img
                            src={previewUrl}
                            alt="Receipt preview"
                            className="w-full h-48 object-cover"
                        />
                        
                        {/* Overlay with actions */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                            <div className="space-x-2">
                                <button
                                    type="button"
                                    onClick={triggerFileSelect}
                                    disabled={disabled || isUploading}
                                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Replace
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    disabled={disabled || isUploading}
                                    className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                        
                        {/* Loading overlay */}
                        {isUploading && (
                            <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                    <p className="text-sm text-gray-600">Uploading...</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Error message */}
                {uploadError && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                        {uploadError}
                    </div>
                )}
            </div>
        </div>
    );
}