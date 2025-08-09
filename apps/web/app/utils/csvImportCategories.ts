/**
 * Category CSV Import Utilities
 * Handles importing categories from CSV format
 */

import { parseCSV, mapRowToObject } from './csvUtils';

// Interface for parsed category data from CSV
export interface ParsedCategoryData {
    name: string;
    type: 'EXPENSE' | 'INCOME';
    color: string;
    icon?: string;
}

// Import result interface
export interface CategoryImportResult {
    success: boolean;
    importedCount: number;
    errors: Array<{ row: number; error: string }>;
    skippedCount: number;
    categories?: ParsedCategoryData[];
}

/**
 * Parse and validate category from CSV row
 */
function validateAndConvertCategoryRow(
    row: string[], 
    headers: string[], 
    rowIndex: number
): {
    isValid: boolean;
    data: ParsedCategoryData | null;
    errors: string[];
} {
    const errors: string[] = [];
    
    // Create object from row data
    const rowData = mapRowToObject(row, headers);

    // Validate required fields
    const requiredFields = ['name', 'type'];
    for (const field of requiredFields) {
        if (!rowData[field] || rowData[field].trim() === '') {
            errors.push(`Row ${rowIndex + 1}: Missing required field '${field}'`);
        }
    }

    // Validate type field
    const type = rowData.type?.toUpperCase();
    if (type && !['EXPENSE', 'INCOME'].includes(type)) {
        errors.push(`Row ${rowIndex + 1}: Invalid type '${rowData.type}'. Must be 'EXPENSE' or 'INCOME'`);
    }

    // Validate color (should be a valid hex color or color name)
    const color = rowData.color || '#6B7280'; // Default gray color
    if (color && !isValidColor(color)) {
        // Use default color instead of erroring out
        console.warn(`Row ${rowIndex + 1}: Invalid color '${color}', using default`);
    }

    if (errors.length > 0) {
        return { isValid: false, data: null, errors };
    }

    // Convert to ParsedCategoryData
    const categoryData: ParsedCategoryData = {
        name: rowData.name?.trim() || '',
        type: (type as 'EXPENSE' | 'INCOME') || 'EXPENSE',
        color: isValidColor(color) ? color : '#6B7280',
        icon: rowData.icon?.trim() || undefined
    };

    return { isValid: true, data: categoryData, errors: [] };
}

/**
 * Validate if a color is valid (hex code or CSS color name)
 */
function isValidColor(color: string): boolean {
    if (!color) return false;
    
    // Check for hex color (with or without #)
    const hexRegex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexRegex.test(color)) {
        return true;
    }
    
    // Check for CSS color names (basic validation)
    const cssColors = [
        'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown',
        'black', 'white', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'navy',
        'teal', 'olive', 'maroon', 'silver', 'gold', 'indigo', 'violet'
    ];
    
    return cssColors.includes(color.toLowerCase());
}

/**
 * Parse and validate CSV content for category import
 */
export function parseCategoriesCSV(csvContent: string): CategoryImportResult {
    try {
        const rows = parseCSV(csvContent);
        
        if (rows.length === 0) {
            return {
                success: false,
                importedCount: 0,
                errors: [{ row: 0, error: 'CSV file is empty' }],
                skippedCount: 0
            };
        }

        const headers = rows[0];
        const dataRows = rows.slice(1);
        
        if (!headers || headers.length === 0) {
            return {
                success: false,
                importedCount: 0,
                errors: [{ row: 0, error: 'CSV file has no headers' }],
                skippedCount: 0
            };
        }

        // Define required headers
        const requiredHeaders = ['Name', 'Type'];
        const optionalHeaders = ['Color', 'Icon'];
        
        const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[\s\-_]/g, ''));
        const normalizedRequired = requiredHeaders.map(h => h.toLowerCase().replace(/[\s\-_]/g, ''));
        
        // Check for required headers
        const missingRequiredHeaders = normalizedRequired.filter(
            req => !normalizedHeaders.includes(req)
        );
        
        if (missingRequiredHeaders.length > 0) {
            return {
                success: false,
                importedCount: 0,
                errors: [{ 
                    row: 0, 
                    error: `Missing required headers: ${missingRequiredHeaders.join(', ')}. Required headers: ${requiredHeaders.join(', ')}`
                }],
                skippedCount: 0
            };
        }

        const validCategories: ParsedCategoryData[] = [];
        const allErrors: Array<{ row: number; error: string }> = [];

        // Process each data row
        dataRows.forEach((row, index) => {
            if (!row || row.every(cell => !cell || cell.trim() === '')) {
                // Skip empty rows
                return;
            }

            const { isValid, data, errors } = validateAndConvertCategoryRow(row, headers, index + 1);
            
            if (isValid && data) {
                // Check for duplicate names in the current import
                const duplicate = validCategories.find(cat => 
                    cat.name.toLowerCase() === data.name.toLowerCase() && 
                    cat.type === data.type
                );
                
                if (duplicate) {
                    allErrors.push({
                        row: index + 2,
                        error: `Duplicate category: '${data.name}' of type '${data.type}' already exists in this import`
                    });
                } else {
                    validCategories.push(data);
                }
            } else {
                // Add all validation errors for this row
                errors.forEach(error => {
                    allErrors.push({
                        row: index + 2,
                        error
                    });
                });
            }
        });

        return {
            success: validCategories.length > 0,
            importedCount: validCategories.length,
            errors: allErrors,
            skippedCount: dataRows.length - validCategories.length - allErrors.length,
            categories: validCategories
        };

    } catch (error) {
        console.error('Error parsing categories CSV:', error);
        return {
            success: false,
            importedCount: 0,
            errors: [{ 
                row: 0, 
                error: error instanceof Error ? error.message : 'Failed to parse CSV file'
            }],
            skippedCount: 0
        };
    }
}

/**
 * Generate example CSV content for category import
 */
export function generateCategoryImportTemplate(): string {
    const headers = ['Name', 'Type', 'Color', 'Icon'];
    const exampleRows = [
        ['Salary', 'INCOME', '#10B981', 'wallet'],
        ['Freelance', 'INCOME', '#3B82F6', 'laptop'],
        ['Food & Dining', 'EXPENSE', '#EF4444', 'utensils'],
        ['Transportation', 'EXPENSE', '#F59E0B', 'car'],
        ['Entertainment', 'EXPENSE', '#8B5CF6', 'gamepad2']
    ];
    
    const csvContent = [headers, ...exampleRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    
    return csvContent;
}

/**
 * Download category import template
 */
export function downloadCategoryImportTemplate(): void {
    const csvContent = generateCategoryImportTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'category_import_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
