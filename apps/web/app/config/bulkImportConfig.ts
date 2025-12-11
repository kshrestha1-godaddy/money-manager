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
import { 
    bulkImportInvestments,
    bulkImportInvestmentsWithTargets,
    parseCSVForUI as parseInvestmentsCSV, 
    importCorrectedRow as importCorrectedInvestmentRow 
} from '../(dashboard)/investments/actions/investments';
import { 
    parseInvestmentTargetsCSVForUI,
    importCorrectedInvestmentTargetRow
} from '../(dashboard)/investments/actions/investment-targets';
import { downloadInvestmentTargetsImportTemplate } from '../utils/csvImportInvestmentTargets';
import { useOptimizedAccounts } from '../hooks/useOptimizedAccounts';
import { 
    bulkImportBudgetTargets,
    parseCSVForUI as parseBudgetTargetsCSV,
    importCorrectedBudgetTargetRow
} from '../actions/budget-targets';
import { downloadBudgetTargetsImportTemplate } from '../utils/csvImportBudgetTargets';
import { useBudgetTargetsFormData } from '../hooks/useBudgetTargetsFormData';
import { 
    bulkImportNotes,
    parseCSVForUI as parseNotesCSV,
    importCorrectedRow as importCorrectedNoteRow
} from '../(dashboard)/notes/actions/notes';
import { downloadNotesImportTemplate } from '../utils/csvImportNotes';

// Income bulk import configuration
export const incomeImportConfig: BulkImportConfig = {
    type: 'INCOME',
    title: 'Bulk Import Incomes & Categories',
    description: 'Import categories and incomes from CSV files. Categories will be imported first, then incomes. Account names from the CSV will be automatically matched with your existing accounts.',
    requiredFields: ['title', 'amount', 'date', 'category'],
    optionalFields: ['description', 'currency', 'account', 'tags', 'notes', 'recurring'],
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
    optionalFields: ['description', 'currency', 'account', 'tags', 'notes', 'recurring', 'location', 'receipt'],
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

// Investment bulk import configuration
export const investmentImportConfig: BulkImportConfig = {
    type: 'INVESTMENT',
    title: 'Bulk Import Investments & Targets',
    description: 'Import investments and investment targets from CSV files. Targets will be imported first if provided, then investments. Account names from the CSV will be automatically matched with your existing accounts.',
    requiredFields: ['name', 'type', 'quantity', 'purchase price', 'current price', 'purchase date'],
    optionalFields: ['symbol', 'account', 'notes', 'interest rate', 'maturity date'],
    supportsCategoriesImport: false,
    supportsTargetsImport: true,
    bulkImportFunction: async (file: File, targetFile?: File, defaultAccountId?: string) => {
        if (targetFile) {
            return await bulkImportInvestmentsWithTargets(file, targetFile, defaultAccountId);
        } else {
            const fileText = await file.text();
            return await bulkImportInvestments(fileText);
        }
    },
    parseCSVFunction: parseInvestmentsCSV,
    importCorrectedRowFunction: importCorrectedInvestmentRow,
    targetsParseCSVFunction: parseInvestmentTargetsCSVForUI,
    targetsImportCorrectedRowFunction: importCorrectedInvestmentTargetRow,
    targetsTemplateDownload: downloadInvestmentTargetsImportTemplate,
    formDataHook: () => {
        const result = useOptimizedAccounts();
        
        return {
            accounts: result.accounts || [],
            loading: result.loading || false,
            error: result.error || null
        };
    }
};

// Budget targets bulk import configuration
export const budgetTargetsImportConfig: BulkImportConfig = {
    type: 'EXPENSE', // Using EXPENSE as the base type since budget targets can be for both
    title: 'Bulk Import Budget Targets',
    description: 'Import budget targets from CSV file. Categories will be created automatically if they don\'t exist. Categories not in the import file will be hidden from budget tracking.',
    requiredFields: ['Category Name', 'Category Type', 'Target Amount', 'Period'],
    optionalFields: ['Start Date', 'End Date'],
    supportsCategoriesImport: false,
    supportsTargetsImport: false,
    bulkImportFunction: async (file: File) => {
        const fileText = await file.text();
        return await bulkImportBudgetTargets(fileText);
    },
    parseCSVFunction: parseBudgetTargetsCSV,
    importCorrectedRowFunction: importCorrectedBudgetTargetRow,
    targetsTemplateDownload: downloadBudgetTargetsImportTemplate,
    formDataHook: () => {
        const result = useBudgetTargetsFormData();
        
        return {
            accounts: [], // Budget targets don't need accounts
            categories: result.categories || [],
            loading: result.loading || false,
            error: result.error || null
        };
    }
};

// Notes bulk import configuration
export const notesImportConfig: BulkImportConfig = {
    type: 'INCOME', // Using INCOME as base type since notes don't fit the existing types
    title: 'Bulk Import Notes',
    description: 'Import notes from CSV file. Required field: Title. Optional fields: Content, Color, Tags, Reminder Date, Is Pinned, Is Archived. Download the template below to see the expected format.',
    requiredFields: ['title'],
    optionalFields: ['content', 'color', 'tags', 'reminder date', 'is pinned', 'is archived'],
    supportsCategoriesImport: false,
    supportsTargetsImport: false,
    bulkImportFunction: async (file: File) => {
        return await bulkImportNotes(file);
    },
    parseCSVFunction: parseNotesCSV,
    importCorrectedRowFunction: importCorrectedNoteRow,
    targetsTemplateDownload: downloadNotesImportTemplate, // Using targetsTemplateDownload for template
    formDataHook: () => {
        // Notes don't need accounts or categories
        return {
            accounts: [],
            categories: [],
            loading: false,
            error: null
        };
    }
};
