"use client";

import React from "react";
import { CheckCircle, X, AlertCircle } from "lucide-react";

interface BudgetActionSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    details?: string[];
}

export function BudgetActionSuccessModal({ 
    isOpen, 
    onClose, 
    type,
    title,
    message,
    details = []
}: BudgetActionSuccessModalProps) {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-600 mr-2" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-600 mr-2" />;
            case 'info':
                return <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />;
        }
    };

    const getColors = () => {
        switch (type) {
            case 'success':
                return {
                    bg: 'bg-green-50',
                    border: 'border-green-200',
                    text: 'text-green-800'
                };
            case 'error':
                return {
                    bg: 'bg-red-50',
                    border: 'border-red-200',
                    text: 'text-red-800'
                };
            case 'info':
                return {
                    bg: 'bg-blue-50',
                    border: 'border-blue-200',
                    text: 'text-blue-800'
                };
        }
    };

    const colors = getColors();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        {getIcon()}
                        <h2 className="text-lg font-semibold text-gray-900">
                            {title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="mb-6">
                    <p className="text-gray-600 mb-4">
                        {message}
                    </p>
                    {details.length > 0 && (
                        <div className={`${colors.bg} ${colors.border} border rounded-lg p-3`}>
                            <ul className={`text-sm ${colors.text} space-y-1`}>
                                {details.map((detail, index) => (
                                    <li key={index} className="flex items-start">
                                        <span className="mr-2">•</span>
                                        <span>{detail}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-md transition-colors"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
