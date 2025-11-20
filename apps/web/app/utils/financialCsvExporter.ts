/**
 * Generic Financial Data CSV Exporter
 * Handles both expenses and incomes with configurable field mappings
 */

import { 
    formatDateForExport, 
    formatTimestampForExport, 
    formatArrayForExport, 
    generateCsvContent, 
    downloadCsvFile, 
    generateCsvFilename,
    validateExportData,
    getExportStatistics,
    safeStringify
} from './csvExportUtils';

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
    'Notes',
    'Is Recurring',
    'Recurring Frequency',
    'Is Bookmarked',
    'Created At',
    'Updated At'
];

const EXPENSE_HEADERS = [
    ...STANDARD_HEADERS.slice(0, 13), // Up to Location (now includes Currency)
    'Receipt', // Add receipt field for expenses
    ...STANDARD_HEADERS.slice(13) // Notes, Is Recurring, Recurring Frequency, Is Bookmarked, and timestamps
];

/**
 * Convert financial item to CSV row data
 */
function convertItemToRow(item: BaseFinancialItem | ExpenseItem, includeReceipt: boolean = false): (string | number)[] {
    const baseRow = [
        safeStringify(item.id),
        safeStringify(item.title),
        safeStringify(item.description || ''),
        safeStringify(item.amount),
        safeStringify(item.currency || 'INR'),
        formatDateForExport(item.date),
        safeStringify(item.category?.name || ''),
        safeStringify(item.category?.color || ''),
        item.account ? `${item.account.holderName} - ${item.account.bankName}` : '',
        safeStringify(item.account?.bankName || ''),
        safeStringify(item.account?.accountType || ''),
        safeStringify(item.account?.accountNumber || ''),
        formatArrayForExport(item.tags || []),
        formatArrayForExport(item.location || [])
    ];

    // Add receipt field for expenses
    if (includeReceipt) {
        baseRow.push(safeStringify((item as ExpenseItem).receipt || ''));
    }

    // Add remaining fields
    baseRow.push(
        safeStringify(item.notes || ''),
        item.isRecurring ? 'Yes' : 'No',
        safeStringify(item.recurringFrequency || ''),
        item.isBookmarked ? 'Yes' : 'No', // Add bookmark status
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
    
    const rows = items.map(item => convertItemToRow(item, config.includeReceipt));

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
