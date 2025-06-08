"use client";

import { useState } from "react";
import { Button } from "@repo/ui/button";
import { DebtInterface } from "../types/debts";

interface AddDebtModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (debt: Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>) => void;
}

export function AddDebtModal({ isOpen, onClose, onAdd }: AddDebtModalProps) {
    const [formData, setFormData] = useState({
        borrowerName: "",
        borrowerContact: "",
        borrowerEmail: "",
        amount: 0,
        interestRate: 0,
        dueDate: "",
        lentDate: new Date().toISOString().split('T')[0],
        status: "ACTIVE" as const,
        purpose: "",
        notes: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Process dates properly
        let dueDate: Date | undefined = undefined;
        if (formData.dueDate && formData.dueDate.trim() !== "") {
            dueDate = new Date(formData.dueDate);
        }

        const processedData = {
            borrowerName: formData.borrowerName,
            borrowerContact: formData.borrowerContact || undefined,
            borrowerEmail: formData.borrowerEmail || undefined,
            amount: formData.amount,
            interestRate: formData.interestRate,
            // @ts-ignore - Date constructor handles string inputs properly
            lentDate: new Date(formData.lentDate),
            dueDate: dueDate,
            status: formData.status,
            purpose: formData.purpose || undefined, 
            notes: formData.notes || undefined,
        };

        onAdd(processedData);
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            borrowerName: "",
            borrowerContact: "",
            borrowerEmail: "",
            amount: 0,
            interestRate: 0,
            dueDate: "",
            lentDate: new Date().toISOString().split('T')[0],
            status: "ACTIVE" as const,
            purpose: "",
            notes: "",
        });
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Add New Debt</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Borrower Name *
                            </label>
                            <input
                                type="text"
                                value={formData.borrowerName}
                                onChange={(e) => setFormData(prev => ({ ...prev, borrowerName: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Interest Rate (%)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.interestRate}
                                onChange={(e) => setFormData(prev => ({ ...prev, interestRate: parseFloat(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Lent Date *
                            </label>
                            <input
                                type="date"
                                value={formData.lentDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, lentDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="PARTIALLY_PAID">Partially Paid</option>
                                <option value="FULLY_PAID">Fully Paid</option>
                                <option value="OVERDUE">Overdue</option>
                                <option value="DEFAULTED">Defaulted</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Borrower Contact
                            </label>
                            <input
                                type="tel"
                                value={formData.borrowerContact}
                                onChange={(e) => setFormData(prev => ({ ...prev, borrowerContact: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Phone number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Borrower Email
                            </label>
                            <input
                                type="email"
                                value={formData.borrowerEmail}
                                onChange={(e) => setFormData(prev => ({ ...prev, borrowerEmail: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="email@example.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Purpose
                        </label>
                        <input
                            type="text"
                            value={formData.purpose}
                            onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Personal loan, Business loan, Emergency"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Additional notes about this debt..."
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-6">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Add Debt
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}