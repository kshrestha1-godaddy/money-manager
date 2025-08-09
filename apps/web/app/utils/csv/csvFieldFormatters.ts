/**
 * CSV Field Formatters
 * Small, independent functions for formatting different data types for CSV export
 */

/**
 * Format a string field for CSV, handling quotes, commas, and newlines
 */
export function formatStringField(value: string | null | undefined): string {
    if (value === null || value === undefined) {
        return '';
    }
    
    const stringValue = String(value);
    
    // If the value contains comma, quote, newline, or carriage return, wrap in quotes
    if (stringValue.includes(',') || 
        stringValue.includes('"') || 
        stringValue.includes('\n') || 
        stringValue.includes('\r')) {
        // Escape internal quotes by doubling them
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
}

/**
 * Format a number field for CSV with proper locale handling
 */
export function formatNumberField(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) {
        return '';
    }
    
    // Use a consistent format that works across locales
    // Avoid locale-specific formatting to ensure import compatibility
    return value.toString();
}

/**
 * Format a currency/balance field for CSV
 */
export function formatCurrencyField(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) {
        return '0';
    }
    
    // Format with 2 decimal places, no thousands separators for CSV compatibility
    return value.toFixed(2);
}

/**
 * Format a date field for CSV in ISO format (YYYY-MM-DD)
 */
export function formatDateField(date: Date | string | null | undefined): string {
    if (!date) {
        return '';
    }
    
    let dateObj: Date;
    
    if (typeof date === 'string') {
        dateObj = new Date(date);
    } else {
        dateObj = date;
    }
    
    if (isNaN(dateObj.getTime())) {
        return '';
    }
    
    // Format in local timezone to avoid timezone issues
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Format a date-time field for CSV in ISO format
 */
export function formatDateTimeField(date: Date | string | null | undefined): string {
    if (!date) {
        return '';
    }
    
    let dateObj: Date;
    
    if (typeof date === 'string') {
        dateObj = new Date(date);
    } else {
        dateObj = date;
    }
    
    if (isNaN(dateObj.getTime())) {
        return '';
    }
    
    return dateObj.toISOString();
}

/**
 * Format an array field for CSV (using semicolon as separator)
 */
export function formatArrayField(values: string[] | null | undefined): string {
    if (!values || !Array.isArray(values) || values.length === 0) {
        return '';
    }
    
    // Filter out empty values and join with semicolon
    const cleanValues = values
        .filter(value => value && typeof value === 'string' && value.trim() !== '')
        .map(value => value.trim());
    
    if (cleanValues.length === 0) {
        return '';
    }
    
    // Join with semicolon and space for readability
    const joinedValue = cleanValues.join('; ');
    
    // Apply string formatting to handle quotes and commas
    return formatStringField(joinedValue);
}

/**
 * Format a boolean field for CSV
 */
export function formatBooleanField(value: boolean | null | undefined): string {
    if (value === null || value === undefined) {
        return '';
    }
    
    return value ? 'true' : 'false';
}

/**
 * Format a multiline text field for CSV (preserving line breaks)
 */
export function formatMultilineTextField(value: string | null | undefined): string {
    if (!value) {
        return '';
    }
    
    // Normalize line endings and preserve multiline content
    const normalizedValue = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    return formatStringField(normalizedValue);
}

/**
 * Format an account number for CSV (ensuring it's treated as text)
 */
export function formatAccountNumberField(value: string | null | undefined): string {
    if (!value) {
        return '';
    }
    
    // Always treat account numbers as strings to preserve leading zeros
    // Wrap in quotes to prevent Excel from treating as numbers
    return `"${value}"`;
}

/**
 * Format a phone number for CSV
 */
export function formatPhoneNumberField(value: string | null | undefined): string {
    if (!value) {
        return '';
    }
    
    // Clean the phone number but preserve it as a string
    const cleanedNumber = value.replace(/[^\d+\-\s()]/g, '').trim();
    
    if (cleanedNumber === '') {
        return '';
    }
    
    // Wrap in quotes to preserve formatting
    return `"${cleanedNumber}"`;
}

/**
 * Format email field for CSV
 */
export function formatEmailField(value: string | null | undefined): string {
    if (!value) {
        return '';
    }
    
    const trimmedEmail = value.trim().toLowerCase();
    
    if (trimmedEmail === '') {
        return '';
    }
    
    return formatStringField(trimmedEmail);
}
