/**
 * Enhanced CSV Export Utilities
 * Modular, clean functions for handling CSV export with proper edge case handling
 */

// Helper to format dates consistently in local timezone
export function formatDateForExport(date: Date): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }
    
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
}

// Helper to format timestamps consistently in local timezone  
export function formatTimestampForExport(date: Date): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }
    
    // Format as YYYY-MM-DD HH:mm:ss in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Helper to format arrays (tags, locations) consistently
export function formatArrayForExport(arr: string[]): string {
    if (!arr || !Array.isArray(arr) || arr.length === 0) {
        return '';
    }
    
    // Clean and filter out empty values, then join with comma for consistency with forms and importer
    return arr
        .map(item => String(item || '').trim())
        .filter(Boolean)
        .join(',');
}

// Helper to safely convert value to string and handle nulls/undefined
export function safeStringify(value: any): string {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value);
}

// Enhanced CSV cell escaping - only quote when necessary
export function escapeCsvCell(value: any): string {
    const stringValue = safeStringify(value);
    
    if (stringValue === '') {
        return '';
    }
    
    // Only wrap in quotes if the value contains special characters
    if (stringValue.includes(',') || 
        stringValue.includes('"') || 
        stringValue.includes('\n') || 
        stringValue.includes('\r') ||
        stringValue.startsWith(' ') ||
        stringValue.endsWith(' ')) {
        // Escape quotes by doubling them and wrap in quotes
        return '"' + stringValue.replace(/"/g, '""') + '"';
    }
    
    return stringValue;
}

// Generate CSV content from headers and rows with proper escaping
export function generateCsvContent(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
    if (!headers || headers.length === 0) {
        throw new Error('Headers are required for CSV generation');
    }
    
    // Escape headers
    const escapedHeaders = headers.map(header => escapeCsvCell(header));
    
    // Escape all row data
    const escapedRows = rows.map(row => 
        row.map(cell => escapeCsvCell(cell))
    );
    
    // Combine headers and rows
    const allRows = [escapedHeaders, ...escapedRows];
    
    // Join with newlines and add UTF-8 BOM for better compatibility
    const csvContent = allRows.map(row => row.join(',')).join('\n');
    
    // Add UTF-8 BOM to handle special characters properly
    return '\uFEFF' + csvContent;
}

// Download CSV file with proper MIME type and error handling
export function downloadCsvFile(content: string, filename: string): void {
    try {
        // Ensure filename has .csv extension
        const csvFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
        
        // Create blob with proper MIME type and encoding
        const blob = new Blob([content], { 
            type: 'text/csv;charset=utf-8;' 
        });
        
        // Create download link
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            // Modern browser approach
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', csvFilename);
            link.style.visibility = 'hidden';
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            URL.revokeObjectURL(url);
        } else {
            // Fallback for older browsers
            const csvData = 'data:text/csv;charset=utf-8,' + encodeURIComponent(content);
            window.open(csvData);
        }
    } catch (error) {
        console.error('Error downloading CSV file:', error);
        throw new Error('Failed to download CSV file. Please try again.');
    }
}

// Generate filename with current date
export function generateCsvFilename(prefix: string, includeTime: boolean = false): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    let datePart = `${year}-${month}-${day}`;
    
    if (includeTime) {
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        datePart += `_${hours}-${minutes}`;
    }
    
    return `${prefix}_${datePart}.csv`;
}

// Validate data before export
export function validateExportData<T>(data: T[], dataType: string): void {
    if (!Array.isArray(data)) {
        throw new Error(`${dataType} data must be an array`);
    }
    
    if (data.length === 0) {
        throw new Error(`No ${dataType.toLowerCase()} data to export`);
    }
}

// Get export statistics for any financial data
export function getExportStatistics<T extends { amount: number; date: Date; category: { id: number }; account?: { id: number } | null }>(
    data: T[],
    dataType: string
): {
    totalItems: number;
    totalAmount: number;
    dateRange: { start: Date | null; end: Date | null };
    categoriesCount: number;
    accountsCount: number;
} {
    if (data.length === 0) {
        return {
            totalItems: 0,
            totalAmount: 0,
            dateRange: { start: null, end: null },
            categoriesCount: 0,
            accountsCount: 0
        };
    }

    const totalAmount = data.reduce((sum, item) => sum + (item.amount || 0), 0);
    const dates = data
        .map(item => item.date)
        .filter(date => date && !isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
    
    const uniqueCategories = new Set(
        data.map(item => item.category?.id).filter(Boolean)
    );
    
    const uniqueAccounts = new Set(
        data.map(item => item.account?.id).filter(Boolean)
    );

    return {
        totalItems: data.length,
        totalAmount,
        dateRange: { 
            start: dates[0] || null, 
            end: dates[dates.length - 1] || null 
        },
        categoriesCount: uniqueCategories.size,
        accountsCount: uniqueAccounts.size
    };
}
