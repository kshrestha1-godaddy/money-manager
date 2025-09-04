"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface BulkDeleteTargetsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    targetCount: number;
    isDeleting?: boolean;
}

export function BulkDeleteTargetsModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    targetCount,
    isDeleting = false 
}: BulkDeleteTargetsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            Delete All Targets
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
                        Are you sure you want to delete all {targetCount} investment targets? This action cannot be undone.
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">
                            <strong>Warning:</strong> This will permanently remove all your investment targets and their progress tracking.
                        </p>
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
                        {isDeleting ? 'Deleting...' : `Delete All ${targetCount} Targets`}
                    </button>
                </div>
            </div>
        </div>
    );
}
