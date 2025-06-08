"use client";

import { useState } from "react";
import { Income, Category } from "../types/financial";
import { AccountInterface } from "../types/accounts";

interface AddIncomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (income: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => void;
    categories: Category[];
    accounts: AccountInterface[];
}

export function AddIncomeModal({ isOpen, onClose, onAdd, categories, accounts }: AddIncomeModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        categoryId: '',
        accountId: '',
        tags: '',
        notes: '',
        isRecurring: false,
        recurringFrequency: 'MONTHLY' as const
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.title || !formData.amount || !formData.categoryId || !formData.accountId) {
            alert('Please fill in all required fields');
            return;
        }

        const selectedCategory = categories.find(c => c.id === parseInt(formData.categoryId));
        if (!selectedCategory) {
            alert('Please select a valid category');
            return;
        }

        const selectedAccount = accounts.find(a => a.id === parseInt(formData.accountId));
        if (!selectedAccount) {
            alert('Please select a valid account');
            return;
        }

        const income: Omit<Income, 'id' | 'createdAt' | 'updatedAt'> = {
            title: formData.title,
            description: formData.description || undefined,
            amount: parseFloat(formData.amount),
            date: new Date(formData.date + 'T00:00:00'),
            category: selectedCategory,
            categoryId: selectedCategory.id,
            account: selectedAccount,
            accountId: selectedAccount.id,
            userId: 1, // TODO: Get from session
            tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
            notes: formData.notes || undefined,
            isRecurring: formData.isRecurring,
            recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined
        };

        onAdd(income);
        
        // Reset form
        setFormData({
            title: '',
            description: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            categoryId: '',
            accountId: '',
            tags: '',
            notes: '',
            isRecurring: false,
            recurringFrequency: 'MONTHLY'
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Add New Income</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Monthly Salary"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional description"
                            rows={2}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date *
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category *
                            </label>
                            <select
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select a category</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Account *
                            </label>
                            <select
                                value={formData.accountId}
                                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select an account</option>
                                {accounts.map(account => (
                                    <option key={account.id} value={account.id}>
                                        {account.bankName} - {account.holderName} ({account.accountType})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tags
                        </label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., salary, regular (comma separated)"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional notes or remarks"
                            rows={2}
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="isRecurring"
                            checked={formData.isRecurring}
                            onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-900">
                            This is a recurring income
                        </label>
                    </div>

                    {formData.isRecurring && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Frequency
                            </label>
                            <select
                                value={formData.recurringFrequency}
                                onChange={(e) => setFormData({ ...formData, recurringFrequency: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                                <option value="QUARTERLY">Quarterly</option>
                                <option value="YEARLY">Yearly</option>
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Add Income
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 