/**
 * Configuration objects for bulk import modals
 * Provides type-specific logic and functions for income and expense imports
 */

import { BulkImportConfig } from '../components/shared/UnifiedBulkImportModal';
import { 
    bulkImportIncomes, 
    bulkImportIncomesWithCategories, 
    parseCSVForUI as parseIncomesCSV, 
    importCorrectedRow as importCorrectedIncomeRow 
} from '../(dashboard)/incomes/actions/incomes';
import { 
    bulkImportExpenses,
    bulkImportExpensesWithCategories,
    parseCSVForUI as parseExpensesCSV, 
    importCorrectedRow as importCorrectedExpenseRow 
} from '../(dashboard)/expenses/actions/expenses';
import { useFinancialFormData } from '../hooks/useFinancialFormData';
import { useExpenseFormData } from '../hooks/useExpenseFormData';

// Income bulk import configuration
export const incomeImportConfig: BulkImportConfig = {
    type: 'INCOME',
    title: 'Bulk Import Incomes & Categories',
    description: 'Import categories and incomes from CSV files. Categories will be imported first, then incomes. Account names from the CSV will be automatically matched with your existing accounts.',
    requiredFields: ['title', 'amount', 'date', 'category'],
    optionalFields: ['description', 'account', 'tags', 'notes', 'recurring'],
    supportsCategoriesImport: true,
    bulkImportFunction: async (file: File, categoryFile?: File, defaultAccountId?: string) => {
        if (categoryFile) {
            return await bulkImportIncomesWithCategories(file, categoryFile, defaultAccountId);
        } else {
            return await bulkImportIncomes(file, defaultAccountId || "");
        }
    },
    parseCSVFunction: parseIncomesCSV,
    importCorrectedRowFunction: importCorrectedIncomeRow,
    formDataHook: () => {
        const result = useFinancialFormData("INCOME");
        
        return {
            accounts: result.accounts || [],
            categories: result.categories || [],
            loading: result.loading || false,
            error: result.error || null
        };
    }
};

// Expense bulk import configuration
export const expenseImportConfig: BulkImportConfig = {
    type: 'EXPENSE',
    title: 'Bulk Import Expenses & Categories',
    description: 'Import categories and expenses from CSV files. Categories will be imported first, then expenses. Account names from the CSV will be automatically matched with your existing accounts.',
    requiredFields: ['title', 'amount', 'date', 'category'],
    optionalFields: ['description', 'account', 'tags', 'notes', 'recurring', 'location', 'receipt'],
    supportsCategoriesImport: true,
    bulkImportFunction: async (file: File, categoryFile?: File, defaultAccountId?: string) => {
        if (categoryFile) {
            return await bulkImportExpensesWithCategories(file, categoryFile, defaultAccountId);
        } else {
            const fileText = await file.text();
            return await bulkImportExpenses(fileText, defaultAccountId ? parseInt(defaultAccountId) : undefined);
        }
    },
    parseCSVFunction: parseExpensesCSV,
    importCorrectedRowFunction: importCorrectedExpenseRow,
    formDataHook: () => {
        const result = useExpenseFormData();
        
        return {
            accounts: result.accounts || [],
            categories: result.categories || [],
            loading: result.loading || false,
            error: result.error || null
        };
    }
};
