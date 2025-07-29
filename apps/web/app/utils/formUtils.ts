/**
 * Form Utility Functions
 * Centralized form validation and transformation utilities for financial transactions
 */

import { Category } from '../types/financial';
import { AccountInterface } from '../types/accounts';
import { DualCurrency, convertToAccountCurrency } from './currency';

// Common form data interface for expenses/incomes
export interface BaseFormData {
    title: string;
    description: string;
    amount: string;
    amountCurrency: DualCurrency;
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
export function initializeFormData(defaultDate: boolean = true, defaultCurrency: DualCurrency = 'INR'): BaseFormData {
    return {
        title: '',
        description: '',
        amount: '',
        amountCurrency: defaultCurrency,
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
    } else if (parseFloat(formData.amount) < 0) {
        errors.push('Amount must be 0 or greater');
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
    } else if (formData.accountId !== '0') {
        // Only validate account existence if it's not cash payment
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
    userAccountCurrency: string = 'INR',
    userId: number = 0
) {
    const selectedCategory = categories.find(c => c.id === parseInt(formData.categoryId));
    
    // Handle cash payments
    let selectedAccount = null;
    let accountId = null; // Use null for cash payments
    
    if (formData.accountId === '0') {
        // For cash payments, use accountId null
        selectedAccount = null;
        accountId = null;
    } else {
        selectedAccount = accounts.find(a => a.id === parseInt(formData.accountId));
        if (!selectedAccount) {
            throw new Error('Invalid account selected');
        }
        accountId = selectedAccount.id;
    }

    if (!selectedCategory) {
        throw new Error('Invalid category selected');
    }

    // Convert amount to user's account currency
    const inputAmount = parseFloat(formData.amount);
    const convertedAmount = convertToAccountCurrency(
        inputAmount,
        formData.amountCurrency,
        userAccountCurrency
    );

    // Helper function to create date without timezone conversion
    const createLocalDate = (dateString: string): Date => {
        const parts = dateString.split('-').map(Number);
        if (parts.length !== 3 || parts.some(part => isNaN(part))) {
            throw new Error('Invalid date format');
        }
        const year = parts[0]!;
        const month = parts[1]!;
        const day = parts[2]!;
        return new Date(year, month - 1, day); // month is 0-indexed
    };

    return {
        title: formData.title,
        description: formData.description || undefined,
        amount: convertedAmount,
        originalAmount: inputAmount,
        originalCurrency: formData.amountCurrency,
        date: createLocalDate(formData.date),
        category: selectedCategory,
        categoryId: selectedCategory.id,
        account: selectedAccount,
        accountId: accountId,
        userId,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        notes: formData.notes || undefined,
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined
    };
}

// Extract form data from existing expense/income
export function extractFormData(item: any): BaseFormData {
    // Helper function to format date without timezone conversion
    const formatDateForInput = (date: Date): string => {
        if (!date) return '';
        // Create a new date object to avoid mutating the original
        const localDate = new Date(date);
        // Use local date methods to avoid timezone conversion
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return {
        title: item.title || '',
        description: item.description || '',
        amount: item.amount?.toString() || '',
        amountCurrency: item.originalCurrency || 'INR',
        date: item.date ? formatDateForInput(item.date) : '',
        categoryId: item.categoryId?.toString() || '',
        accountId: !item.accountId ? '0' : item.accountId.toString(),
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
    primary: "px-4 py-2 bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors",
    secondary: "px-4 py-2 bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors",
    danger: "px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
};

// Modal overlay class
export const modalOverlayClasses = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";

// Modal content class
export const modalContentClasses = "bg-white rounded-lg p-4 sm:p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto";

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