/**
 * Core CSV Export Utilities
 * Modular functions for creating and downloading CSV files
 */

/**
 * Convert a 2D array to CSV string with proper escaping
 */
export function arrayToCSV(data: (string | number)[][]): string {
    if (!data || data.length === 0) {
        return '';
    }
    
    return data.map(row => 
        row.map(cell => {
            const stringCell = String(cell);
            
            // Escape quotes and wrap in quotes if necessary
            if (stringCell.includes(',') || 
                stringCell.includes('"') || 
                stringCell.includes('\n') || 
                stringCell.includes('\r')) {
                return `"${stringCell.replace(/"/g, '""')}"`;
            }
            
            return stringCell;
        }).join(',')
    ).join('\n');
}

/**
 * Add BOM (Byte Order Mark) for better Excel compatibility
 */
export function addBOM(csvContent: string): string {
    return '\uFEFF' + csvContent;
}

/**
 * Create a Blob with proper CSV MIME type
 */
export function createCSVBlob(csvContent: string, includeBOM: boolean = true): Blob {
    const finalContent = includeBOM ? addBOM(csvContent) : csvContent;
    
    return new Blob([finalContent], {
        type: 'text/csv;charset=utf-8;'
    });
}

/**
 * Generate a filename with timestamp
 */
export function generateTimestampedFilename(baseName: string, extension: string = 'csv'): string {
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    return `${baseName}_${timestamp}.${extension}`;
}

/**
 * Download a CSV file to the user's device
 */
export function downloadCSVFile(csvContent: string, filename: string): void {
    const blob = createCSVBlob(csvContent);
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
}

/**
 * Validate data before export
 */
export function validateExportData<T>(
    data: T[], 
    requiredFields: (keyof T)[]
): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!Array.isArray(data)) {
        errors.push('Data must be an array');
        return { isValid: false, errors };
    }
    
    if (data.length === 0) {
        errors.push('No data to export');
        return { isValid: false, errors };
    }
    
    // Check if required fields exist in the first item
    const firstItem = data[0];
    if (firstItem && typeof firstItem === 'object' && firstItem !== null) {
        for (const field of requiredFields) {
            if (!(field in firstItem)) {
                errors.push(`Required field '${String(field)}' is missing`);
            }
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Create CSV headers with optional display names
 */
export function createCSVHeaders<T>(
    fields: (keyof T)[],
    displayNames?: Record<keyof T, string>
): string[] {
    return fields.map(field => {
        if (displayNames && displayNames[field]) {
            return displayNames[field];
        }
        
        // Convert camelCase to Title Case
        const fieldStr = String(field);
        return fieldStr
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    });
}

/**
 * Convert object array to 2D array for CSV
 */
export function objectArrayTo2DArray<T extends Record<string, any>>(
    data: T[],
    fields: (keyof T)[],
    formatter?: (value: any, field: keyof T, item: T) => string
): string[][] {
    return data.map(item => 
        fields.map(field => {
            const value = item[field];
            
            if (formatter) {
                return formatter(value, field, item);
            }
            
            // Default formatting
            if (value === null || value === undefined) {
                return '';
            }
            
            return String(value);
        })
    );
}

/**
 * Export data to CSV with full control over formatting
 */
export function exportToCSV<T extends Record<string, any>>(
    data: T[],
    config: {
        filename: string;
        fields: (keyof T)[];
        headers?: string[];
        formatter?: (value: any, field: keyof T, item: T) => string;
        includeBOM?: boolean;
        validate?: boolean;
    }
): { success: boolean; error?: string } {
    try {
        // Validate if requested
        if (config.validate !== false) {
            const validation = validateExportData(data, config.fields);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: validation.errors.join('; ')
                };
            }
        }
        
        // Create headers
        const headers = config.headers || createCSVHeaders(config.fields);
        
        // Convert data to 2D array
        const dataRows = objectArrayTo2DArray(data, config.fields, config.formatter);
        
        // Combine headers and data
        const allRows = [headers, ...dataRows];
        
        // Convert to CSV string
        const csvContent = arrayToCSV(allRows);
        
        // Generate filename if not provided
        const filename = config.filename || generateTimestampedFilename('export');
        
        // Download the file
        downloadCSVFile(csvContent, filename);
        
        return { success: true };
        
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}
