    "use client";

import { useEffect, useState } from "react";
import { AccountInterface } from "../../../types/accounts";

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    isDeleting: boolean;
    account: AccountInterface | null;
}

export function DeleteAccountModal({ isOpen, onClose, onConfirm, isDeleting, account }: DeleteAccountModalProps) {
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) setError(null);
    }, [isOpen]);

    async function confirmDelete() {
        setError(null);
        try {
            await onConfirm();
        } catch (error) {
            setError(error instanceof Error ? error.message : "Couldn’t delete the account. Please try again.");
        }
    }

    if (!isOpen || !account) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-red-600">Delete Account</h2>
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                <div className="mb-6">
                    <p className="text-gray-700 mb-2">
                        Are you sure you want to delete this account?
                    </p>
                    <div className="bg-gray-50 p-3 rounded-md">
                        <p className="font-medium text-gray-900">{account.bankName}</p>
                        <p className="text-sm text-gray-600">Account: {account.accountNumber}</p>
                        <p className="text-sm text-gray-600">Holder: {account.holderName}</p>
                    </div>
                    <p className="text-red-600 text-sm mt-2">
                        This action cannot be undone.
                    </p>
                </div>

                {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirmDelete}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        {isDeleting ? "Deleting…" : "Delete Account"}
                    </button>
                </div>
            </div>
        </div>
    );
} 