"use client";

import { Expense } from "../types/financial";

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    expense: Expense | null;
}

export function DeleteConfirmationModal({ isOpen, onClose, onConfirm, expense }: DeleteConfirmationModalProps) {
    if (!isOpen || !expense) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex items-center mb-4">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                </div>
                
                <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Delete Expense
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Are you sure you want to delete "{expense.title}"?
                        <br />
                        <br />
                        <i><b>This action cannot be undone.</b></i>
                    </p>
                    
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <div className="text-sm">
                            <div className="font-medium text-gray-900">{expense.title}</div>
                            {expense.description && (
                                <div className="text-gray-600 mt-1">{expense.description}</div>
                            )}
                            <div className="text-red-600 font-medium mt-1">
                                ${expense.amount.toFixed(2)}
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                                {expense.date.toLocaleDateString()} • {expense.category.name}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-300 text-gray-700 hover:bg-gray-400 rounded-md"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
} 