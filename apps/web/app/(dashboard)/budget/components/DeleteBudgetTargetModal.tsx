"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface DeleteBudgetTargetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    categoryName: string | null;
    isDeleting?: boolean;
}

export function DeleteBudgetTargetModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    categoryName,
    isDeleting = false 
}: DeleteBudgetTargetModalProps) {
    if (!isOpen || !categoryName) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            Remove Budget Target
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="mb-6">
                    <p className="text-gray-600 mb-4">
                        Are you sure you want to remove the budget target for <strong>{categoryName}</strong>?
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-800">
                            <strong>Note:</strong> This will:
                        </p>
                        <ul className="text-sm text-amber-800 mt-2 list-disc list-inside">
                            <li>Remove the budget target for this category</li>
                            <li>Keep the category visible in budget tracking</li>
                            <li>Allow you to set a new budget target later</li>
                        </ul>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-gray-300 text-gray-700 hover:bg-gray-400 rounded-md transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? 'Removing...' : 'Remove Target'}
                    </button>
                </div>
            </div>
        </div>
    );
}
