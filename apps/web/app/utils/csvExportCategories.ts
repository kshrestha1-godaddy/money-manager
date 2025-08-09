/**
 * Category CSV Export Utilities
 * Handles exporting categories to CSV format
 */

import { Category } from '../types/financial';
import { 
    formatDateForExport, 
    formatTimestampForExport,
    generateCsvContent, 
    downloadCsvFile, 
    generateCsvFilename,
    validateExportData,
    safeStringify
} from './csvExportUtils';

// Headers for category CSV export
const CATEGORY_HEADERS = [
    'ID',
    'Name',
    'Type',
    'Color',
    'Icon',
    'User ID',
    'Created At',
    'Updated At'
];

/**
 * Convert category to CSV row data
 */
function convertCategoryToRow(category: Category): (string | number)[] {
    return [
        safeStringify(category.id),
        safeStringify(category.name),
        safeStringify(category.type),
        safeStringify(category.color),
        safeStringify(category.icon || ''),
        safeStringify(category.userId),
        formatTimestampForExport(category.createdAt),
        formatTimestampForExport(category.updatedAt)
    ];
}

/**
 * Convert categories data to CSV format
 */
export function convertCategoriesToCsv(categories: Category[]): string {
    validateExportData(categories, 'Categories');

    const rows = categories.map(category => convertCategoryToRow(category));

    return generateCsvContent(CATEGORY_HEADERS, rows);
}

/**
 * Export categories to CSV file
 */
export function exportCategoriesToCsv(categories: Category[], filename?: string): void {
    try {
        const csvContent = convertCategoriesToCsv(categories);
        const csvFilename = filename || generateCsvFilename('categories');
        
        downloadCsvFile(csvContent, csvFilename);
    } catch (error) {
        console.error('Error exporting categories to CSV:', error);
        if (error instanceof Error) {
            alert(`Export failed: ${error.message}`);
        } else {
            alert('Failed to export categories. Please try again.');
        }
    }
}

/**
 * Export categories filtered by type
 */
export function exportCategoriesByType(categories: Category[], type: 'EXPENSE' | 'INCOME', filename?: string): void {
    const filteredCategories = categories.filter(category => category.type === type);
    const typeFilename = filename || generateCsvFilename(`${type.toLowerCase()}_categories`);
    
    exportCategoriesToCsv(filteredCategories, typeFilename);
}

/**
 * Get export statistics for categories
 */
export function getCategoryExportStatistics(categories: Category[]): {
    totalCategories: number;
    expenseCategories: number;
    incomeCategories: number;
    dateRange: { start: Date | null; end: Date | null };
    uniqueColors: number;
} {
    if (categories.length === 0) {
        return {
            totalCategories: 0,
            expenseCategories: 0,
            incomeCategories: 0,
            dateRange: { start: null, end: null },
            uniqueColors: 0
        };
    }

    const expenseCategories = categories.filter(cat => cat.type === 'EXPENSE').length;
    const incomeCategories = categories.filter(cat => cat.type === 'INCOME').length;
    
    const dates = categories
        .map(category => category.createdAt)
        .filter(date => date && !isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
    
    const uniqueColors = new Set(
        categories.map(category => category.color).filter(Boolean)
    );

    return {
        totalCategories: categories.length,
        expenseCategories,
        incomeCategories,
        dateRange: { 
            start: dates[0] || null, 
            end: dates[dates.length - 1] || null 
        },
        uniqueColors: uniqueColors.size
    };
}
