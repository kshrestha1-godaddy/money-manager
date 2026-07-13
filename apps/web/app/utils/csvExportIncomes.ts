import { Income } from '../types/financial';
import { 
    convertFinancialDataToCsv,
    convertFinancialDataToCsvWithDisplayCurrency,
    exportIncomesToCsv as exportIncomesWithModules,
    getIncomeExportStatistics,
    type IncomeItem 
} from './financialCsvExporter';
import type { ConversionRateMatrix } from './currencyRates';

/**
 * Convert incomes data to CSV format
 * @deprecated Use convertFinancialDataToCsv from financialCsvExporter instead
 */
export function convertIncomesToCSV(incomes: Income[]): string {
    return convertFinancialDataToCsv(incomes as IncomeItem[], { includeReceipt: false });
}

/**
 * Incomes CSV with an extra column for amount in the user's selected currency.
 */
export function convertIncomesToCSVWithDisplayCurrency(
    incomes: Income[],
    displayCurrency: string,
    conversionMatrix?: ConversionRateMatrix
): string {
    return convertFinancialDataToCsvWithDisplayCurrency(incomes as IncomeItem[], displayCurrency, {
        includeReceipt: false,
        conversionMatrix,
    });
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