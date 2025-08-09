/**
 * CSV Field Parsers
 * Small, independent functions for parsing different data types from CSV
 */

/**
 * Parse a string field from CSV, handling quoted values
 */
export function parseStringField(value: string | null | undefined): string {
    if (value === null || value === undefined) {
        return '';
    }
    
    let stringValue = String(value).trim();
    
    // Remove surrounding quotes if present
    if (stringValue.startsWith('"') && stringValue.endsWith('"')) {
        stringValue = stringValue.slice(1, -1);
        // Unescape double quotes
        stringValue = stringValue.replace(/""/g, '"');
    }
    
    return stringValue;
}

/**
 * Parse a number field from CSV with validation
 */
export function parseNumberField(value: string | null | undefined): number | null {
    if (!value || typeof value !== 'string') {
        return null;
    }
    
    const trimmedValue = value.trim();
    if (trimmedValue === '') {
        return null;
    }
    
    // Remove any quotes
    const cleanValue = parseStringField(trimmedValue);
    
    // Handle different number formats
    const numberValue = parseFloat(cleanValue.replace(/,/g, ''));
    
    if (isNaN(numberValue) || !isFinite(numberValue)) {
        throw new Error(`Invalid number format: ${value}`);
    }
    
    return numberValue;
}

/**
 * Parse a currency/balance field from CSV
 */
export function parseCurrencyField(value: string | null | undefined): number | null {
    if (!value || typeof value !== 'string') {
        return null;
    }
    
    const trimmedValue = value.trim();
    if (trimmedValue === '' || trimmedValue === '0' || trimmedValue === '0.00') {
        return 0;
    }
    
    // Remove quotes and currency symbols
    const cleanValue = parseStringField(trimmedValue)
        .replace(/[$€£¥₹]/g, '') // Remove common currency symbols
        .replace(/,/g, '') // Remove thousands separators
        .trim();
    
    if (cleanValue === '') {
        return 0;
    }
    
    const amount = parseFloat(cleanValue);
    
    if (isNaN(amount) || !isFinite(amount)) {
        throw new Error(`Invalid currency amount: ${value}`);
    }
    
    if (amount < 0) {
        throw new Error(`Currency amount cannot be negative: ${value}`);
    }
    
    return amount;
}

/**
 * Parse a date field from CSV in various formats
 */
export function parseDateField(value: string | null | undefined): Date | null {
    if (!value || typeof value !== 'string') {
        return null;
    }
    
    const cleanValue = parseStringField(value);
    if (cleanValue === '') {
        return null;
    }
    
    let parsedDate: Date;
    
    try {
                    // Handle common date formats
            if (cleanValue.includes('/')) {
                // MM/DD/YYYY, DD/MM/YYYY formats
                const parts = cleanValue.split('/');
                if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
                    let year = parseInt(parts[2]);
                    let month = parseInt(parts[0]) - 1; // JavaScript months are 0-based
                    let day = parseInt(parts[1]);
                    
                    // Check if it might be DD/MM/YYYY format
                    if (day > 12 && month <= 12) {
                        // Swap month and day
                        [month, day] = [day - 1, month + 1];
                    }
                    
                    parsedDate = new Date(year, month, day);
                } else {
                    parsedDate = new Date(cleanValue);
                }
            } else if (cleanValue.includes('-')) {
                // YYYY-MM-DD or DD-MM-YYYY formats
                const parts = cleanValue.split('-');
                if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
                    const first = parseInt(parts[0]);
                    const second = parseInt(parts[1]);
                    const third = parseInt(parts[2]);
                    
                    if (first > 31) {
                        // YYYY-MM-DD format
                        parsedDate = new Date(first, second - 1, third);
                    } else {
                        // DD-MM-YYYY format
                        parsedDate = new Date(third, second - 1, first);
                    }
                } else {
                    parsedDate = new Date(cleanValue);
                }
            } else {
                // Try direct parsing
                parsedDate = new Date(cleanValue);
            }
        
        if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid date');
        }
        
        // Validate reasonable date range (1900 to 2100)
        const year = parsedDate.getFullYear();
        if (year < 1900 || year > 2100) {
            throw new Error('Date out of reasonable range');
        }
        
    } catch (error) {
        throw new Error(`Invalid date format: ${value}`);
    }
    
    return parsedDate;
}

/**
 * Parse a datetime field from CSV in ISO format
 */
export function parseDateTimeField(value: string | null | undefined): Date | null {
    if (!value || typeof value !== 'string') {
        return null;
    }
    
    const cleanValue = parseStringField(value);
    if (cleanValue === '') {
        return null;
    }
    
    try {
        const parsedDate = new Date(cleanValue);
        
        if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid datetime');
        }
        
        return parsedDate;
    } catch (error) {
        throw new Error(`Invalid datetime format: ${value}`);
    }
}

/**
 * Parse an array field from CSV (semicolon or comma separated)
 */
export function parseArrayField(value: string | null | undefined): string[] {
    if (!value || typeof value !== 'string') {
        return [];
    }
    
    const cleanValue = parseStringField(value);
    if (cleanValue === '') {
        return [];
    }
    
    // Try semicolon first, then comma
    let separator = ';';
    if (!cleanValue.includes(';') && cleanValue.includes(',')) {
        separator = ',';
    }
    
    return cleanValue
        .split(separator)
        .map(item => item.trim())
        .filter(item => item !== '');
}

/**
 * Parse a boolean field from CSV
 */
export function parseBooleanField(value: string | null | undefined): boolean | null {
    if (!value || typeof value !== 'string') {
        return null;
    }
    
    const cleanValue = parseStringField(value).toLowerCase();
    
    if (cleanValue === '') {
        return null;
    }
    
    if (['true', '1', 'yes', 'y', 'on'].includes(cleanValue)) {
        return true;
    }
    
    if (['false', '0', 'no', 'n', 'off'].includes(cleanValue)) {
        return false;
    }
    
    throw new Error(`Invalid boolean value: ${value}`);
}

/**
 * Parse a multiline text field from CSV
 */
export function parseMultilineTextField(value: string | null | undefined): string {
    if (!value || typeof value !== 'string') {
        return '';
    }
    
    // Parse as string field to handle quotes properly
    const cleanValue = parseStringField(value);
    
    // Normalize line endings
    return cleanValue.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Parse an account number from CSV (preserving leading zeros)
 */
export function parseAccountNumberField(value: string | null | undefined): string {
    if (!value || typeof value !== 'string') {
        throw new Error('Account number is required');
    }
    
    const cleanValue = parseStringField(value);
    if (cleanValue === '') {
        throw new Error('Account number cannot be empty');
    }
    
    // Validate account number format (alphanumeric, dashes, spaces allowed)
    if (!/^[a-zA-Z0-9\s\-]+$/.test(cleanValue)) {
        throw new Error(`Invalid account number format: ${value}`);
    }
    
    return cleanValue;
}

/**
 * Parse a phone number from CSV
 */
export function parsePhoneNumberField(value: string | null | undefined): string {
    if (!value || typeof value !== 'string') {
        return '';
    }
    
    const cleanValue = parseStringField(value);
    if (cleanValue === '') {
        return '';
    }
    
    // Basic phone number validation
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(cleanValue)) {
        throw new Error(`Invalid phone number format: ${value}`);
    }
    
    return cleanValue;
}

/**
 * Parse an email field from CSV with validation
 */
export function parseEmailField(value: string | null | undefined): string {
    if (!value || typeof value !== 'string') {
        return '';
    }
    
    const cleanValue = parseStringField(value).toLowerCase();
    if (cleanValue === '') {
        return '';
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanValue)) {
        throw new Error(`Invalid email format: ${value}`);
    }
    
    return cleanValue;
}

/**
 * Parse a required string field with validation
 */
export function parseRequiredStringField(value: string | null | undefined, fieldName: string): string {
    const cleanValue = parseStringField(value);
    
    if (cleanValue === '') {
        throw new Error(`${fieldName} is required`);
    }
    
    return cleanValue;
}
