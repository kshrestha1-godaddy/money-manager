"use client";

import { Card } from "@repo/ui/card";
import React, { useState } from "react";
import { AccountInterface } from "../types/accounts";
import { formatCurrency } from "../utils/currency";
import { useCurrency } from "../providers/CurrencyProvider";

export function AccountCard({ account, onEdit, onDelete, onViewDetails }: { 
    account: AccountInterface;
    onEdit?: (account: AccountInterface) => void;
    onDelete?: (account: AccountInterface) => void;
    onViewDetails?: (account: AccountInterface) => void;
}) {
    const { currency: userCurrency } = useCurrency();

    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="font-semibold text-2xl text-gray-900">{account.bankName}</h3>
                    <p className="text-lg text-gray-600 mt-1">{account.branchName}</p>
                </div>
                {account.balance !== undefined && (
                    <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(account.balance, userCurrency)}</p>
                        <p className="text-sm text-gray-500">Balance</p>
                    </div>
                )}
            </div>

            {/* Compact Info - 2 column layout for wider cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
                <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Account Holder:</span>
                    <span className="text-sm font-medium text-gray-900">{account.holderName}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Account Number:</span>
                    <span className="text-sm font-medium text-gray-900">{account.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Account Type:</span>
                    <span className="text-sm font-medium text-gray-900">{account.accountType}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-gray-600">IFSC/Code:</span>
                    <span className="text-sm font-medium text-gray-900">{account.branchCode}</span>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
                {onViewDetails && (
                    <button
                        onClick={() => onViewDetails(account)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                        View Details
                    </button>
                )}
                
                {(onEdit || onDelete) && (
                    <div className="flex space-x-2">
                        {onEdit && (
                            <button
                                onClick={() => onEdit(account)}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            >
                                Edit
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => onDelete(account)}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export function AccountGrid({ accounts, onEdit, onDelete, onViewDetails }: { 
    accounts: AccountInterface[];
    onEdit?: (account: AccountInterface) => void;
    onDelete?: (account: AccountInterface) => void;
    onViewDetails?: (account: AccountInterface) => void;
}) {
    return (
        <div className="grid grid-cols-1 gap-6 max-w-4xl w-full">
            {accounts.map((acc, idx) => (
                <AccountCard 
                    key={idx} 
                    account={acc} 
                    onEdit={onEdit} 
                    onDelete={onDelete} 
                    onViewDetails={onViewDetails}
                />
            ))}
        </div>
    );
}