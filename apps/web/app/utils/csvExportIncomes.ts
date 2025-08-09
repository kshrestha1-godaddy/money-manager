import { Income } from '../types/financial';
import { 
    convertFinancialDataToCsv, 
    exportIncomesToCsv as exportIncomesWithModules,
    getIncomeExportStatistics,
    type IncomeItem 
} from './financialCsvExporter';

/**
 * Convert incomes data to CSV format
 * @deprecated Use convertFinancialDataToCsv from financialCsvExporter instead
 */
export function convertIncomesToCSV(incomes: Income[]): string {
    return convertFinancialDataToCsv(incomes as IncomeItem[], { includeReceipt: false });
}

/**
 * Download incomes data as CSV file
 * Uses the new modular CSV export functionality with improved handling
 */
export function exportIncomesToCSV(incomes: Income[], filename?: string): void {
    exportIncomesWithModules(incomes as IncomeItem[], filename);
}

/**
 * Get export statistics
 * @deprecated Use getIncomeExportStatistics from financialCsvExporter instead
 */
export function getIncomeExportStats(incomes: Income[]): {
    totalIncomes: number;
    totalAmount: number;
    dateRange: { start: Date | null; end: Date | null };
    categoriesCount: number;
    accountsCount: number;
} {
    const stats = getIncomeExportStatistics(incomes as IncomeItem[]);
    return {
        totalIncomes: stats.totalItems,
        totalAmount: stats.totalAmount,
        dateRange: stats.dateRange,
        categoriesCount: stats.categoriesCount,
        accountsCount: stats.accountsCount
    };
} 