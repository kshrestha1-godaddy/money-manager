/**
 * Form Utility Functions
 * Centralized form validation and transformation utilities for financial transactions
 */

import { Category } from '../types/financial';
import { AccountInterface } from '../types/accounts';

// Common form data interface for expenses/incomes
export interface BaseFormData {
    title: string;
    description: string;
    amount: string;
    date: string;
    categoryId: string;
    accountId: string;
    tags: string;
    notes: string;
    isRecurring: boolean;
    recurringFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
}

// Transaction type for generic operations
export type TransactionType = 'EXPENSE' | 'INCOME';

// Initialize form data with default values
export function initializeFormData(defaultDate: boolean = true): BaseFormData {
    return {
        title: '',
        description: '',
        amount: '',
        date: defaultDate ? (new Date().toISOString().split('T')[0] || '') : '',
        categoryId: '',
        accountId: '',
        tags: '',
        notes: '',
        isRecurring: false,
        recurringFrequency: 'MONTHLY'
    };
}

// Validate form data
export function validateFormData(
    formData: BaseFormData, 
    categories: Category[],
    accounts: AccountInterface[]
): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formData.title.trim()) {
        errors.push('Title is required');
    }

    if (!formData.amount || isNaN(parseFloat(formData.amount))) {
        errors.push('Valid amount is required');
    } else if (parseFloat(formData.amount) <= 0) {
        errors.push('Amount must be greater than 0');
    }

    if (!formData.date) {
        errors.push('Date is required');
    }

    if (!formData.categoryId) {
        errors.push('Category is required');
    } else {
        const selectedCategory = categories.find(c => c.id === parseInt(formData.categoryId));
        if (!selectedCategory) {
            errors.push('Please select a valid category');
        }
    }

    if (!formData.accountId) {
        errors.push('Account is required');
    } else {
        const selectedAccount = accounts.find(a => a.id === parseInt(formData.accountId));
        if (!selectedAccount) {
            errors.push('Please select a valid account');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Transform form data to expense/income object
export function transformFormData(
    formData: BaseFormData,
    categories: Category[],
    accounts: AccountInterface[],
    userId: number = 0
) {
    const selectedCategory = categories.find(c => c.id === parseInt(formData.categoryId));
    const selectedAccount = accounts.find(a => a.id === parseInt(formData.accountId));

    if (!selectedCategory || !selectedAccount) {
        throw new Error('Invalid category or account selected');
    }

    return {
        title: formData.title,
        description: formData.description || undefined,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date + 'T00:00:00'),
        category: selectedCategory,
        categoryId: selectedCategory.id,
        account: selectedAccount,
        accountId: selectedAccount.id,
        userId,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        notes: formData.notes || undefined,
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined
    };
}

// Extract form data from existing expense/income
export function extractFormData(item: any): BaseFormData {
    return {
        title: item.title || '',
        description: item.description || '',
        amount: item.amount?.toString() || '',
        date: item.date ? item.date.toISOString().split('T')[0] : '',
        categoryId: item.categoryId?.toString() || '',
        accountId: item.accountId?.toString() || '',
        tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
        notes: item.notes || '',
        isRecurring: item.isRecurring || false,
        recurringFrequency: (item.recurringFrequency || 'MONTHLY') as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
    };
}

// Handle form input changes
export function handleInputChange<T extends Record<string, any>>(
    formData: T,
    field: keyof T,
    value: any,
    setFormData: (data: T) => void
) {
    setFormData({
        ...formData,
        [field]: value
    });
}

// Common input classes for styling consistency
export const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
export const selectClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
export const textareaClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
export const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
export const checkboxClasses = "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded";

// Show alert with error messages
export function showValidationErrors(errors: string[]): void {
    if (errors.length > 0) {
        alert(errors.join('\n'));
    }
}

// Common button classes for styling consistency
export const buttonClasses = {
    primary: "px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors",
    secondary: "px-4 py-2 bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors",
    danger: "px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
};

// Modal overlay class
export const modalOverlayClasses = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";

// Modal content class
export const modalContentClasses = "bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto";

// Generic transaction placeholders based on type
export function getTransactionPlaceholders(type: TransactionType) {
    return {
        title: type === 'EXPENSE' ? 'e.g., Grocery Shopping' : 'e.g., Monthly Salary',
        modalTitle: {
            add: type === 'EXPENSE' ? 'Add New Expense' : 'Add New Income',
            edit: type === 'EXPENSE' ? 'Edit Expense' : 'Edit Income'
        },
        submitText: {
            add: type === 'EXPENSE' ? 'Add Expense' : 'Add Income',
            edit: type === 'EXPENSE' ? 'Update Expense' : 'Update Income'
        },
        submittingText: {
            add: type === 'EXPENSE' ? 'Adding...' : 'Adding...',
            edit: type === 'EXPENSE' ? 'Updating...' : 'Updating...'
        }
    };
} 