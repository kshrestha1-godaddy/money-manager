/**
 * Core CSV Import Utilities
 * Robust CSV parsing with proper quote and multiline handling
 */

/**
 * Parse CSV content with advanced quote and multiline support
 */
export function parseCSVContent(csvText: string): string[][] {
    if (!csvText || typeof csvText !== 'string') {
        return [];
    }
    
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < csvText.length) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];
        
        if (char === '"') {
            if (!inQuotes) {
                // Start of quoted field
                inQuotes = true;
            } else if (nextChar === '"') {
                // Escaped quote (double quote)
                currentCell += '"';
                i++; // Skip the next quote
            } else {
                // End of quoted field
                inQuotes = false;
            }
        } else if (char === ',' && !inQuotes) {
            // End of cell
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            // End of row
            currentRow.push(currentCell.trim());
            
            // Only add non-empty rows
            if (currentRow.length > 0 && currentRow.some(cell => cell !== '')) {
                rows.push(currentRow);
            }
            
            currentRow = [];
            currentCell = '';
            
            // Skip \r\n combinations
            if (char === '\r' && nextChar === '\n') {
                i++;
            }
        } else {
            // Regular character
            currentCell += char;
        }
        
        i++;
    }
    
    // Handle last cell and row
    if (currentCell !== '' || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell !== '')) {
            rows.push(currentRow);
        }
    }
    
    return rows;
}

/**
 * Validate CSV headers against expected fields
 */
export function validateCSVHeaders(
    headers: string[],
    requiredFields: string[],
    optionalFields: string[] = []
): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!headers || headers.length === 0) {
        errors.push('No headers found in CSV file');
        return { isValid: false, errors, warnings };
    }
    
    // Normalize headers for comparison
    const normalizedHeaders = headers.map(h => 
        h?.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') || ''
    );
    const normalizedRequired = requiredFields.map(f => 
        f.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
    );
    const normalizedOptional = optionalFields.map(f => 
        f.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
    );
    
    // Check for missing required fields
    const missingRequired = normalizedRequired.filter(req => 
        !normalizedHeaders.includes(req)
    );
    
    if (missingRequired.length > 0) {
        const originalMissing = missingRequired.map(missing => {
            const index = normalizedRequired.indexOf(missing);
            return requiredFields[index];
        });
        errors.push(`Missing required fields: ${originalMissing.join(', ')}`);
    }
    
    // Check for unexpected fields
    const allExpected = [...normalizedRequired, ...normalizedOptional];
    const unexpected = normalizedHeaders.filter(header => 
        header && !allExpected.includes(header)
    );
    
    if (unexpected.length > 0) {
        const originalUnexpected = unexpected.map(un => {
            const index = normalizedHeaders.indexOf(un);
            return headers[index];
        });
        warnings.push(`Unexpected fields will be ignored: ${originalUnexpected.join(', ')}`);
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Map CSV row to object based on headers
 */
export function mapRowToObject(
    row: string[], 
    headers: string[]
): Record<string, string> {
    const obj: Record<string, string> = {};
    
    headers.forEach((header, index) => {
        const normalizedHeader = header?.toLowerCase().replace(/\s+/g, '') || '';
        if (normalizedHeader) {
            obj[normalizedHeader] = row[index] || '';
        }
    });
    
    return obj;
}

/**
 * Process CSV rows with error handling and validation
 */
export function processCSVRows<T>(
    rows: string[][],
    headers: string[],
    processor: (rowData: Record<string, string>, rowIndex: number) => T
): {
    success: boolean;
    data: T[];
    errors: string[];
    totalRows: number;
    validRows: number;
} {
    const results: T[] = [];
    const errors: string[] = [];
    let validRowCount = 0;
    
    rows.forEach((row, index) => {
        try {
            // Skip empty rows
            if (!row || row.length === 0 || row.every(cell => cell.trim() === '')) {
                return;
            }
            
            // Map row to object
            const rowData = mapRowToObject(row, headers);
            
            // Process the row
            const result = processor(rowData, index + 1);
            results.push(result);
            validRowCount++;
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Row ${index + 1}: ${errorMessage}`);
        }
    });
    
    return {
        success: validRowCount > 0,
        data: results,
        errors,
        totalRows: rows.length,
        validRows: validRowCount
    };
}

/**
 * Read file content as text with encoding detection
 */
export function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const result = event.target?.result;
            if (typeof result === 'string') {
                // Remove BOM if present
                const content = result.replace(/^\uFEFF/, '');
                resolve(content);
            } else {
                reject(new Error('Failed to read file as text'));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        // Read as UTF-8 text
        reader.readAsText(file, 'UTF-8');
    });
}

/**
 * Validate file before processing
 */
export function validateCSVFile(file: File): { isValid: boolean; error?: string } {
    if (!file) {
        return { isValid: false, error: 'No file provided' };
    }
    
    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
        return { isValid: false, error: 'File must be a CSV file' };
    }
    
    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        return { isValid: false, error: 'File size too large (maximum 10MB)' };
    }
    
    if (file.size === 0) {
        return { isValid: false, error: 'File is empty' };
    }
    
    return { isValid: true };
}

/**
 * Import CSV file with full validation and error handling
 */
export async function importCSVFile<T>(
    file: File,
    config: {
        requiredFields: string[];
        optionalFields?: string[];
        processor: (rowData: Record<string, string>, rowIndex: number) => T;
        skipEmptyRows?: boolean;
    }
): Promise<{
    success: boolean;
    data: T[];
    errors: string[];
    warnings: string[];
    totalRows: number;
    validRows: number;
}> {
    try {
        // Validate file
        const fileValidation = validateCSVFile(file);
        if (!fileValidation.isValid) {
            return {
                success: false,
                data: [],
                errors: [fileValidation.error!],
                warnings: [],
                totalRows: 0,
                validRows: 0
            };
        }
        
        // Read file content
        const content = await readFileAsText(file);
        
        // Parse CSV
        const rows = parseCSVContent(content);
        
        if (rows.length === 0) {
            return {
                success: false,
                data: [],
                errors: ['CSV file is empty or contains no valid data'],
                warnings: [],
                totalRows: 0,
                validRows: 0
            };
        }
        
        // Extract headers and data rows
        const headers = rows[0];
        const dataRows = rows.slice(1);
        
        // Validate headers
        const headerValidation = validateCSVHeaders(
            headers,
            config.requiredFields,
            config.optionalFields || []
        );
        
        if (!headerValidation.isValid) {
            return {
                success: false,
                data: [],
                errors: headerValidation.errors,
                warnings: headerValidation.warnings,
                totalRows: dataRows.length,
                validRows: 0
            };
        }
        
        // Process data rows
        const result = processCSVRows(dataRows, headers, config.processor);
        
        return {
            success: result.success,
            data: result.data,
            errors: result.errors,
            warnings: headerValidation.warnings,
            totalRows: result.totalRows,
            validRows: result.validRows
        };
        
    } catch (error) {
        return {
            success: false,
            data: [],
            errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
            warnings: [],
            totalRows: 0,
            validRows: 0
        };
    }
}
