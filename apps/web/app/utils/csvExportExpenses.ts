import { Expense } from '../types/financial';
import { 
    convertFinancialDataToCsv, 
    exportExpensesToCsv as exportExpensesWithModules,
    getExpenseExportStatistics,
    type ExpenseItem 
} from './financialCsvExporter';

/**
 * Convert expenses data to CSV format
 * @deprecated Use convertFinancialDataToCsv from financialCsvExporter instead
 */
export function convertExpensesToCSV(expenses: Expense[]): string {
    return convertFinancialDataToCsv(expenses as ExpenseItem[], { includeReceipt: true });
}

/**
 * Download expenses data as CSV file
 * Uses the new modular CSV export functionality with improved handling
 */
export function exportExpensesToCSV(expenses: Expense[], filename?: string): void {
    exportExpensesWithModules(expenses as ExpenseItem[], filename);
}

/**
 * Get export statistics
 * @deprecated Use getExpenseExportStatistics from financialCsvExporter instead
 */
export function getExpenseExportStats(expenses: Expense[]): {
    totalExpenses: number;
    totalAmount: number;
    dateRange: { start: Date | null; end: Date | null };
    categoriesCount: number;
    accountsCount: number;
} {
    const stats = getExpenseExportStatistics(expenses as ExpenseItem[]);
    return {
        totalExpenses: stats.totalItems,
        totalAmount: stats.totalAmount,
        dateRange: stats.dateRange,
        categoriesCount: stats.categoriesCount,
        accountsCount: stats.accountsCount
    };
} 