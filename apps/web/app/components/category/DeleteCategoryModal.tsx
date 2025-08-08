"use client";

import { useState } from "react";
import { Category } from "../../types/financial";

interface DeleteCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (categoryId: number) => Promise<void>;
    category: Category | null;
}

export function DeleteCategoryModal({ isOpen, onClose, onConfirm, category }: DeleteCategoryModalProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string>("");

    const handleDelete = async () => {
        if (!category) return;

        setIsDeleting(true);
        setError("");

        try {
            await onConfirm(category.id);
            onClose();
        } catch (error) {
            console.error("Failed to delete category:", error);
            setError(error instanceof Error ? error.message : "Failed to delete category");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        if (!isDeleting) {
            setError("");
            onClose();
        }
    };

    if (!isOpen || !category) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                </div>

                <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Delete Category
                    </h3>
                    
                    <div className="mb-4">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                            <div
                                className="w-4 h-4 rounded-full border border-gray-300"
                                style={{ backgroundColor: category.color }}
                            />
                            <span className="font-medium text-gray-900">
                                {category.icon && `${category.icon} `}{category.name}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600">
                            Are you sure you want to delete this {category.type.toLowerCase()} category?
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h4 className="text-sm font-medium text-red-800">
                                        Cannot Delete Category
                                    </h4>
                                    <div className="mt-1 text-sm text-red-700">
                                        {error}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h4 className="text-sm font-medium text-yellow-800">
                                    Warning
                                </h4>
                                <div className="mt-1 text-sm text-yellow-700">
                                    This action cannot be undone. The category will be permanently removed.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex space-x-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                        {isDeleting ? "Deleting..." : "Delete Category"}
                    </button>
                </div>
            </div>
        </div>
    );
} 