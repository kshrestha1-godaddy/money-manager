/**
 * Generic Financial Data CSV Exporter
 * Handles both expenses and incomes with configurable field mappings
 */

import { 
    formatDateForExport, 
    formatTimestampForExport, 
    formatArrayForExport, 
    splitLocationFieldForExport,
    generateCsvContent, 
    downloadCsvFile, 
    generateCsvFilename,
    validateExportData,
    getExportStatistics,
    safeStringify
} from './csvExportUtils';
import { convertCurrencySync } from './currencyConversion';
import type { ConversionRateMatrix } from './currencyRates';

function formatAmountForExport(amount: number): string {
    return (Math.round(amount * 100) / 100).toFixed(2);
}

// Base interface for financial items
interface BaseFinancialItem {
    id: number;
    title: string;
    description?: string | null;
    amount: number;
    currency: string;
    date: Date;
    category: {
        id: number;
        name: string;
        color: string;
    };
    account?: {
        id: number;
        bankName: string;
        holderName: string;
        accountType: string;
        accountNumber?: string;
    } | null;
    tags: string[];
    location: string[];
    transactionLocation?: { latitude: number; longitude: number } | null;
    notes?: string | null;
    isRecurring: boolean;
    recurringFrequency?: string | null;
    isBookmarked?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Extended interfaces for specific types
interface ExpenseItem extends BaseFinancialItem {
    receipt?: string | null;
}

interface IncomeItem extends BaseFinancialItem {
    // Incomes don't have receipt field
}

// Configuration for field mapping
interface ExportFieldConfig {
    includeReceipt?: boolean;
    customFields?: { [key: string]: (item: any) => string };
}

// Standard headers configuration
const STANDARD_HEADERS = [
    'ID',
    'Title', 
    'Description',
    'Amount',
    'Currency',
    'Date',
    'Category',
    'Category Color',
    'Account',
    'Bank Name',
    'Account Type',
    'Account Number',
    'Tags',
    'Location',
    'Links',
    'Latitude',
    'Longitude',
    'Notes',
    'Is Recurring',
    'Recurring Frequency',
    'Is Bookmarked',
    'Created At',
    'Updated At'
];

const EXPENSE_HEADERS = [
    ...STANDARD_HEADERS.slice(0, 13), // Through Tags
    ...STANDARD_HEADERS.slice(13, 17), // Location, Links, Latitude, Longitude
    'Receipt',
    ...STANDARD_HEADERS.slice(17), // Notes through Updated At
];

function displayAmountHeader(displayCurrency: string): string {
    return `Amount (${displayCurrency.trim().toUpperCase()})`;
}

/**
 * CSV headers for expenses or incomes, optionally including a converted amount column.
 */
export function getFinancialExportHeaders(
    displayCurrency: string,
    includeReceipt: boolean,
    includeDisplayAmount = true
): string[] {
    const baseHeaders = includeReceipt ? EXPENSE_HEADERS : STANDARD_HEADERS;
    if (!includeDisplayAmount) return [...baseHeaders];

    const headers = [...baseHeaders];
    const currencyIndex = headers.indexOf('Currency');
    headers.splice(currencyIndex + 1, 0, displayAmountHeader(displayCurrency));
    return headers;
}

interface ConvertItemRowOptions {
    includeReceipt?: boolean;
    displayCurrency?: string;
    conversionMatrix?: ConversionRateMatrix;
}

/**
 * Convert financial item to CSV row data
 */
function convertItemToRow(
    item: BaseFinancialItem | ExpenseItem,
    options: ConvertItemRowOptions = {}
): (string | number)[] {
    const includeReceipt = options.includeReceipt ?? false;
    const { locationText, linksText } = splitLocationFieldForExport(item.location || []);
    const tl = item.transactionLocation;
    const latStr =
        tl != null && Number.isFinite(Number(tl.latitude)) ? safeStringify(tl.latitude) : '';
    const lngStr =
        tl != null && Number.isFinite(Number(tl.longitude)) ? safeStringify(tl.longitude) : '';

    const amountCells: (string | number)[] = [
        safeStringify(item.amount),
        safeStringify(item.currency || 'INR'),
    ];

    if (options.displayCurrency) {
        const converted = convertCurrencySync(
            item.amount,
            item.currency || 'INR',
            options.displayCurrency,
            options.conversionMatrix
        );
        amountCells.push(formatAmountForExport(converted));
    }

    const baseRow = [
        safeStringify(item.id),
        safeStringify(item.title),
        safeStringify(item.description || ''),
        ...amountCells,
        formatDateForExport(item.date),
        safeStringify(item.category?.name || ''),
        safeStringify(item.category?.color || ''),
        item.account ? `${item.account.holderName} - ${item.account.bankName}` : '',
        safeStringify(item.account?.bankName || ''),
        safeStringify(item.account?.accountType || ''),
        safeStringify(item.account?.accountNumber || ''),
        formatArrayForExport(item.tags || []),
        locationText,
        linksText,
        latStr,
        lngStr
    ];

    if (includeReceipt) {
        baseRow.push(safeStringify((item as ExpenseItem).receipt || ''));
    }

    baseRow.push(
        safeStringify(item.notes || ''),
        item.isRecurring ? 'Yes' : 'No',
        safeStringify(item.recurringFrequency || ''),
        item.isBookmarked ? 'Yes' : 'No',
        formatTimestampForExport(item.createdAt),
        formatTimestampForExport(item.updatedAt)
    );

    return baseRow;
}

/**
 * Convert financial data to CSV format
 */
export function convertFinancialDataToCsv<T extends BaseFinancialItem>(
    items: T[],
    config: ExportFieldConfig = {}
): string {
    validateExportData(items, 'Financial');

    const headers = config.includeReceipt ? EXPENSE_HEADERS : STANDARD_HEADERS;
    
    const rows = items.map(item => convertItemToRow(item, { includeReceipt: config.includeReceipt }));

    return generateCsvContent(headers, rows);
}

/**
 * Convert financial data to CSV with amounts normalized to the user's selected currency.
 */
export function convertFinancialDataToCsvWithDisplayCurrency<T extends BaseFinancialItem>(
    items: T[],
    displayCurrency: string,
    config: ExportFieldConfig & { conversionMatrix?: ConversionRateMatrix } = {}
): string {
    validateExportData(items, 'Financial');

    const headers = getFinancialExportHeaders(
        displayCurrency,
        config.includeReceipt ?? false
    );

    const rows = items.map(item =>
        convertItemToRow(item, {
            includeReceipt: config.includeReceipt,
            displayCurrency,
            conversionMatrix: config.conversionMatrix,
        })
    );

    return generateCsvContent(headers, rows);
}

/**
 * Export expenses to CSV
 */
export function exportExpensesToCsv(expenses: ExpenseItem[], filename?: string): void {
    try {
        const csvContent = convertFinancialDataToCsv(expenses, { includeReceipt: true });
        const csvFilename = filename || generateCsvFilename('expenses');
        
        downloadCsvFile(csvContent, csvFilename);
    } catch (error) {
        console.error('Error exporting expenses to CSV:', error);
        if (error instanceof Error) {
            alert(`Export failed: ${error.message}`);
        } else {
            alert('Failed to export expenses. Please try again.');
        }
    }
}

/**
 * Export incomes to CSV
 */
export function exportIncomesToCsv(incomes: IncomeItem[], filename?: string): void {
    try {
        const csvContent = convertFinancialDataToCsv(incomes, { includeReceipt: false });
        const csvFilename = filename || generateCsvFilename('incomes');
        
        downloadCsvFile(csvContent, csvFilename);
    } catch (error) {
        console.error('Error exporting incomes to CSV:', error);
        if (error instanceof Error) {
            alert(`Export failed: ${error.message}`);
        } else {
            alert('Failed to export incomes. Please try again.');
        }
    }
}

/**
 * Get export statistics for expenses
 */
export function getExpenseExportStatistics(expenses: ExpenseItem[]) {
    return getExportStatistics(expenses, 'Expenses');
}

/**
 * Get export statistics for incomes
 */
export function getIncomeExportStatistics(incomes: IncomeItem[]) {
    return getExportStatistics(incomes, 'Incomes');
}

/**
 * Export financial data with custom configuration
 */
export function exportFinancialDataWithConfig<T extends BaseFinancialItem>(
    items: T[],
    dataType: 'expenses' | 'incomes',
    config: ExportFieldConfig = {},
    filename?: string
): void {
    try {
        const includeReceipt = dataType === 'expenses';
        const csvContent = convertFinancialDataToCsv(items, { ...config, includeReceipt });
        const csvFilename = filename || generateCsvFilename(dataType);
        
        downloadCsvFile(csvContent, csvFilename);
    } catch (error) {
        console.error(`Error exporting ${dataType} to CSV:`, error);
        if (error instanceof Error) {
            alert(`Export failed: ${error.message}`);
        } else {
            alert(`Failed to export ${dataType}. Please try again.`);
        }
    }
}

// Re-export types for external use
export type { BaseFinancialItem, ExpenseItem, IncomeItem, ExportFieldConfig };
