/**
 * CSV Utility Functions
 * Centralized CSV parsing and generation utilities
 */

// Helper function to parse CSV with proper quote handling and multi-line support
export function parseCSV(csvText: string): string[][] {
    if (!csvText || typeof csvText !== 'string') {
        return [];
    }
    
    const rows: string[][] = [];
    let i = 0;
    const chars = csvText.split('');
    
    while (i < chars.length) {
        const row: string[] = [];
        
        // Parse each cell in the row
        while (i < chars.length) {
            let cell = '';
            let inQuotes = false;
            let startedWithQuote = false;
            
            // Skip leading whitespace
            while (i < chars.length && (chars[i] === ' ' || chars[i] === '\t')) {
                i++;
            }
            
            // Check if cell starts with quote
            if (i < chars.length && chars[i] === '"') {
                startedWithQuote = true;
                inQuotes = true;
                i++; // Skip opening quote
            }
            
            // Parse cell content
            while (i < chars.length) {
                const char = chars[i];
                
                if (inQuotes) {
                    if (char === '"') {
                        // Check for escaped quote (double quote)
                        if (i + 1 < chars.length && chars[i + 1] === '"') {
                            cell += '"'; // Add single quote to cell
                            i += 2; // Skip both quotes
                        } else {
                            // End of quoted field
                            inQuotes = false;
                            i++; // Skip closing quote
                            break;
                        }
                    } else {
                        // Add character to cell (including newlines)
                        cell += char;
                        i++;
                    }
                } else {
                    if (char === ',' && !inQuotes) {
                        // End of cell
                        break;
                    } else if ((char === '\n' || char === '\r') && !startedWithQuote) {
                        // End of row (only if not in quotes)
                        break;
                    } else if (char === '"' && !startedWithQuote) {
                        // Quote in middle of unquoted field - treat as regular character
                        cell += char;
                        i++;
                    } else if (char === '\r') {
                        // Skip carriage return
                        i++;
                    } else {
                        cell += char;
                        i++;
                    }
                }
            }
            
            // Clean up cell content
            row.push(cell.trim());
            
            // Skip comma if present
            if (i < chars.length && chars[i] === ',') {
                i++;
            } else {
                // End of row
                break;
            }
        }
        
        // Skip end-of-line characters
        while (i < chars.length && (chars[i] === '\n' || chars[i] === '\r')) {
            i++;
        }
        
        // Only add non-empty rows
        if (row.length > 0 && row.some(cell => cell.length > 0)) {
            rows.push(row);
        }
    }
    
    return rows;
}

// Generate CSV content from 2D array
export function generateCSV(data: (string | number)[][]): string {
    return data.map(row => 
        row.map(cell => {
            const stringCell = String(cell);
            // Escape quotes and wrap in quotes if contains comma or quote
            if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
                return '"' + stringCell.replace(/"/g, '""') + '"';
            }
            return stringCell;
        }).join(',')
    ).join('\n');
}

// Download CSV file
export function downloadCSV(data: (string | number)[][], filename: string): void {
    const csvContent = generateCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// Validate CSV headers
export function validateCSVHeaders(
    headers: string[], 
    requiredHeaders: string[], 
    optionalHeaders: string[] = []
): { isValid: boolean; missing: string[]; extra: string[] } {
    const normalizedHeaders = headers.map(h => h?.toLowerCase().replace(/\s+/g, '') || '');
    const normalizedRequired = requiredHeaders.map(h => h?.toLowerCase().replace(/\s+/g, '') || '');
    const normalizedOptional = optionalHeaders.map(h => h?.toLowerCase().replace(/\s+/g, '') || '');
    
    const missing = normalizedRequired.filter(req => req && !normalizedHeaders.includes(req));
    const allowedHeaders = [...normalizedRequired, ...normalizedOptional];
    const extra = normalizedHeaders.filter(header => header && !allowedHeaders.includes(header));
    
    return {
        isValid: missing.length === 0,
        missing,
        extra
    };
}

// Parse date from various formats
export function parseDate(dateString: string): Date {
    if (!dateString || typeof dateString !== 'string') {
        throw new Error('Date is required');
    }
    
    let parsedDate: Date;
    
    try {
        // Try different date formats
        if (dateString.includes('/')) {
            // MM/DD/YYYY or DD/MM/YYYY format
            parsedDate = new Date(dateString);
        } else if (dateString.includes('-')) {
            // YYYY-MM-DD format
            parsedDate = new Date(dateString);
        } else {
            throw new Error('Invalid date format');
        }
        
        if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid date');
        }
    } catch (error) {
        throw new Error(`Invalid date format: ${dateString}`);
    }
    
    return parsedDate;
}

// Parse and validate amount
export function parseAmount(amountString: string): number {
    if (!amountString || typeof amountString !== 'string') {
        throw new Error('Amount is required');
    }
    
    const amount = parseFloat(amountString);
    if (isNaN(amount) || !isFinite(amount)) {
        throw new Error('Valid amount is required');
    }
    
    if (amount < 0) {
        throw new Error('Amount must be 0 or greater');
    }
    
    return amount;
}

// Parse tags from comma or semicolon-separated string
export function parseTags(tagsString: string): string[] {
    if (!tagsString || typeof tagsString !== 'string') return [];
    
    // Determine separator - prefer semicolon if found, otherwise use comma
    const separator = tagsString.includes(';') ? ';' : ',';
    
    return tagsString
        .split(separator)
        .map(tag => tag?.trim() || '')
        .filter(Boolean);
}

// Parse locations from comma or semicolon-separated string
export function parseLocations(locationsString: string): string[] {
    if (!locationsString || typeof locationsString !== 'string') return [];
    
    // Determine separator - prefer semicolon if found, otherwise use comma
    const separator = locationsString.includes(';') ? ';' : ',';
    
    return locationsString
        .split(separator)
        .map(location => location?.trim() || '')
        .filter(Boolean);
}

// Map CSV row to object based on headers
export function mapRowToObject(row: string[], headers: string[]): Record<string, string> {
    const rowData: Record<string, string> = {};
    
    headers.forEach((header, index) => {
        const cellValue = row[index];
        const normalizedHeader = header?.toLowerCase().replace(/\s+/g, '') || '';
        
        // Safely handle undefined/null cell values
        if (normalizedHeader) {
            rowData[normalizedHeader] = (cellValue && typeof cellValue === 'string') ? cellValue.trim() : '';
        }
    });
    
    return rowData;
} 
