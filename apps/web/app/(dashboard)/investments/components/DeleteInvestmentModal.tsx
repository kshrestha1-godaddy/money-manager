"use client";

import { InvestmentInterface } from "../../../types/investments";

interface DeleteInvestmentModalProps {
    investment: InvestmentInterface | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function DeleteInvestmentModal({ investment, isOpen, onClose, onConfirm }: DeleteInvestmentModalProps) {
    if (!isOpen || !investment) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-red-600">Delete Investment</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ✕
                    </button>
                </div>

                <div className="mb-6">
                    <p className="text-gray-700 mb-4">
                        Are you sure you want to delete this investment? This action cannot be undone.
                    </p>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="font-medium text-gray-600">Investment:</span>
                                <span className="text-gray-900">{investment.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium text-gray-600">Type:</span>
                                <span className="text-gray-900">{investment.type.replace('_', ' ')}</span>
                            </div>
                            {investment.symbol && (
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-600">Symbol:</span>
                                    <span className="text-gray-900">{investment.symbol}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="font-medium text-gray-600">Quantity:</span>
                                <span className="text-gray-900">{investment.quantity}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium text-gray-600">Current Value:</span>
                                <span className="text-gray-900">
                                    ${(investment.quantity * investment.currentPrice).toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
                    >
                        Delete Investment
                    </button>
                </div>
            </div>
        </div>
    );
} 