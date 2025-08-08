"use client";

import { useState } from "react";
import { AccountInterface } from "../../../types/accounts";

interface ShareAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: AccountInterface | null;
}

export function ShareAccountModal({ isOpen, onClose, account }: ShareAccountModalProps) {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !account) return null;

    const handleCopyToClipboard = () => {
        const accountDetails = `
        Account Number: ${account.accountNumber}
        Account Holder Name: ${account.holderName}
        Bank Name: ${account.bankName}
        Branch Name: ${account.branchName}
        Branch Address: ${account.bankAddress}
        Account Type: ${account.accountType}`;
        
        navigator.clipboard.writeText(accountDetails).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        }).catch(() => {
            // Silently handle error - no alert
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Share Account Details</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">
                                    Account Number
                                </label>
                                <div className="text-sm font-mono text-gray-900 bg-white p-2 rounded border">
                                    {account.accountNumber}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">
                                    Account Holder Name
                                </label>
                                <div className="text-sm text-gray-900 bg-white p-2 rounded border">
                                    {account.holderName}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">
                                    Bank Name
                                </label>
                                <div className="text-sm text-gray-900 bg-white p-2 rounded border">
                                    {account.bankName}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">
                                    Branch Name
                                </label>
                                <div className="text-sm text-gray-900 bg-white p-2 rounded border">
                                    {account.branchName}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">
                                    Branch Address
                                </label>
                                <div className="text-sm text-gray-900 bg-white p-2 rounded border">
                                    {account.bankAddress}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">
                                    Account Type
                                </label>
                                <div className="text-sm text-gray-900 bg-white p-2 rounded border">
                                    {account.accountType}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={handleCopyToClipboard}
                            className={`flex-1 px-4 py-2 rounded-md transition-colors flex items-center justify-center space-x-2 ${
                                copied 
                                    ? 'bg-green-600 text-white hover:bg-green-700' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            {copied ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <span>Copy to Clipboard</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 