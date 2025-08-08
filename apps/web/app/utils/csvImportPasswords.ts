import { PasswordFormData } from '../types/passwords';
import { ImportResult } from '../types/bulkImport';
import { parseCSV } from './csvUtils';
import { bulkImportPasswords as saveBulkPasswords } from '../(dashboard)/passwords/actions/passwords';

/**
 * Parse CSV content for password import
 */
export interface ParsedPasswordData {
    websiteName: string;
    description: string;
    username: string;
    password: string; // Plain text password to be encrypted or already encrypted hash
    transactionPin: string | null; // Plain text PIN to be encrypted or already encrypted hash
    validity?: Date;
    notes?: string;
    category?: string;
    tags: string[];
}

/**
 * Parse date from string
 */
function parseDate(dateString: string): Date | undefined {
    if (!dateString || dateString.trim() === '') {
        return undefined;
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateString}`);
    }
    
    return date;
}

/**
 * Parse tags from string
 */
function parseTags(tagsString: string): string[] {
    if (!tagsString || tagsString.trim() === '') {
        return [];
    }
    
    // Determine separator - prefer semicolon if found, otherwise use comma
    const separator = tagsString.includes(';') ? ';' : ',';
    
    return tagsString.split(separator)
        .map(tag => tag.trim())
        .filter(tag => tag !== '');
}

/**
 * Map headers to normalized keys
 */
function mapRowToObject(row: string[], headers: string[]): Record<string, string> {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
        // Normalize header keys by removing spaces, special chars, and converting to lowercase
        const normalizedKey = header.toLowerCase()
            .replace(/[\s\-_\/]/g, '')
            .replace(/[()%]/g, '');
        
        obj[normalizedKey] = row[index]?.trim() || '';
    });
    return obj;
}

/**
 * Validate and convert CSV row to password data
 */
function validateAndConvertRow(
    row: string[], 
    headers: string[], 
    rowIndex: number
): {
    isValid: boolean;
    data: ParsedPasswordData | null;
    errors: string[];
} {
    const errors: string[] = [];
    
    // Create object from row data
    const rowData = mapRowToObject(row, headers);

    // Validate required fields - now accepting either Password or Password Hash
    const requiredFields = ['websitename', 'username'];
    for (const field of requiredFields) {
        if (!rowData[field] || rowData[field].trim() === '') {
            errors.push(`Row ${rowIndex + 1}: Missing required field '${field}'`);
        }
    }

    // Check if either password or passwordhash is available
    if ((!rowData.password || rowData.password.trim() === '') && 
        (!rowData.passwordhash || rowData.passwordhash.trim() === '')) {
        errors.push(`Row ${rowIndex + 1}: Missing required field 'Password' or 'Password Hash'`);
    }

    // Parse validity date if provided
    let validityDate: Date | undefined;
    if (rowData.validity && rowData.validity.trim() !== '') {
        try {
            validityDate = parseDate(rowData.validity);
        } catch (error) {
            errors.push(`Row ${rowIndex + 1}: ${error instanceof Error ? error.message : 'Invalid validity date'}`);
        }
    }

    // Parse tags if provided
    let tags: string[] = [];
    if (rowData.tags && rowData.tags.trim() !== '') {
        tags = parseTags(rowData.tags);
    }

    if (errors.length > 0) {
        return { isValid: false, data: null, errors };
    }

    // At this point, we've already validated that required fields exist
    // Convert to ParsedPasswordData
    const passwordData: ParsedPasswordData = {
        websiteName: rowData.websitename || '',
        description: rowData.description || rowData.websitename || '',
        username: rowData.username || '',
        // Use password field if available, otherwise use password hash
        // Important: The password field is what will be encrypted, so if we're using
        // a previously exported hash, we need to make sure it's treated as a raw password
        password: rowData.password || rowData.passwordhash || '',
        // Use transaction pin if available, otherwise use transaction pin hash
        transactionPin: rowData.transactionpin || rowData.transactionpinhash || null,
        validity: validityDate,
        notes: rowData.notes || undefined,
        category: rowData.category || undefined,
        tags: tags
    };

    console.log('Parsed password data:', {
        websiteName: passwordData.websiteName,
        username: passwordData.username,
        hasPassword: !!passwordData.password,
        hasTransactionPin: !!passwordData.transactionPin
    });

    return { isValid: true, data: passwordData, errors: [] };
}

/**
 * Parse and validate CSV content for password import
 */
export function parsePasswordsCSV(csvContent: string): ImportResult & { data?: ParsedPasswordData[] } {
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

        // Define required headers - now accepting export format headers
        const requiredHeaders = ['Website Name', 'Username'];
        const passwordHeaders = ['Password', 'Password Hash']; // Either one is required
        
        const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[\s\-_]/g, ''));
        const normalizedRequired = requiredHeaders.map(h => h.toLowerCase().replace(/[\s\-_]/g, ''));
        const normalizedPasswordHeaders = passwordHeaders.map(h => h.toLowerCase().replace(/[\s\-_]/g, ''));
        
        // Check for required headers
        const missingRequiredHeaders = normalizedRequired.filter(
            req => !normalizedHeaders.includes(req)
        );
        
        // Check if at least one password header exists
        const hasPasswordHeader = normalizedPasswordHeaders.some(
            header => normalizedHeaders.includes(header)
        );

        if (missingRequiredHeaders.length > 0 || !hasPasswordHeader) {
            const allRequiredHeaders = [...requiredHeaders];
            if (!hasPasswordHeader) {
                allRequiredHeaders.push('Password or Password Hash');
            }
            
            return {
                success: false,
                importedCount: 0,
                errors: [{ 
                    row: 0, 
                    error: `Missing required headers: ${missingRequiredHeaders.join(', ')}${!hasPasswordHeader ? (missingRequiredHeaders.length > 0 ? ', ' : '') + 'Password or Password Hash' : ''}. Required headers: ${allRequiredHeaders.join(', ')}`
                }],
                skippedCount: 0
            };
        }

        const validPasswords: ParsedPasswordData[] = [];
        const allErrors: Array<{ row: number; error: string; data?: any }> = [];

        // Process each data row
        dataRows.forEach((row, index) => {
            const result = validateAndConvertRow(row, headers, index + 1);
            
            if (result.isValid && result.data) {
                validPasswords.push(result.data);
            } else {
                result.errors.forEach(error => {
                    allErrors.push({
                        row: index + 2, // +2 because headers are row 1 and we're 0-indexed
                        error,
                        data: row
                    });
                });
            }
        });

        return {
            success: validPasswords.length > 0,
            importedCount: validPasswords.length,
            errors: allErrors,
            skippedCount: dataRows.length - validPasswords.length,
            data: validPasswords
        };

    } catch (error) {
        return {
            success: false,
            importedCount: 0,
            errors: [{ 
                row: 0, 
                error: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }],
            skippedCount: 0
        };
    }
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Bulk import passwords from CSV
 */
export async function bulkImportPasswords(
    file: File,
    secretKey: string
): Promise<ImportResult> {
    try {
        console.log('Starting password import process');
        const fileContent = await readFileAsText(file);
        console.log('File read successfully, parsing CSV content');
        
        const parseResult = parsePasswordsCSV(fileContent);
        console.log('CSV parsing result:', {
            success: parseResult.success,
            dataCount: parseResult.data?.length || 0,
            errorCount: parseResult.errors.length,
            skippedCount: parseResult.skippedCount
        });
        
        if (!parseResult.success || !parseResult.data || parseResult.data.length === 0) {
            console.log('CSV parsing failed or no valid data found');
            return parseResult;
        }
        
        // Log sample data (without showing actual passwords)
        if (parseResult.data.length > 0) {
            const sampleData = { ...parseResult.data[0] };
            sampleData.password = '[REDACTED]';
            if (sampleData.transactionPin) sampleData.transactionPin = '[REDACTED]';
            console.log('Sample parsed data (first row):', sampleData);
        }
        
        console.log(`Attempting to save ${parseResult.data.length} passwords to database`);
        
        // Call the server action to save passwords to the database
        const result = await saveBulkPasswords(parseResult.data, secretKey);
        console.log('Import result:', result);
        
        return {
            success: result.success > 0,
            importedCount: result.success,
            errors: result.failed > 0 ? [{ 
                row: 0, 
                error: `Failed to import ${result.failed} password(s)` 
            }] : [],
            skippedCount: result.failed
        };
    } catch (error) {
        console.error('Error in bulkImportPasswords:', error);
        return {
            success: false,
            importedCount: 0,
            errors: [{ 
                row: 0, 
                error: `Failed to import passwords: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }],
            skippedCount: 0
        };
    }
} 