import { DebtInterface } from '../types/debts';
import { ImportResult } from '../types/bulkImport';

/**
 * Parse CSV content for debt import
 */
export interface ParsedDebtData {
    borrowerName: string;
    borrowerContact?: string;
    borrowerEmail?: string;
    amount: number;
    interestRate: number;
    dueDate?: Date;
    lentDate: Date;
    status: 'ACTIVE' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERDUE' | 'DEFAULTED';
    purpose?: string;
    notes?: string;
    accountId?: number;
    originalId?: number; // Used for matching repayments during import
}

/**
 * Parse CSV content for repayment import
 */
export interface ParsedRepaymentData {
    debtId: number;
    amount: number;
    repaymentDate: Date;
    notes?: string;
    accountId?: number;
    originalId?: number;
}

/**
 * Parse CSV string to array of arrays
 */
function parseCSV(csvContent: string): string[][] {
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    const result: string[][] = [];

    for (const line of lines) {
        const row: string[] = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"' && !inQuotes) {
                inQuotes = true;
            } else if (char === '"' && inQuotes) {
                if (nextChar === '"') {
                    current += '"';
                    i++; // skip next quote
                } else {
                    inQuotes = false;
                }
            } else if (char === ',' && !inQuotes) {
                row.push(current.trim());
                current = '';
            } else {
                current += char;
            }
            i++;
        }
        row.push(current.trim());
        result.push(row);
    }

    return result;
}

/**
 * Map headers to object keys
 */
function mapRowToObject(row: string[], headers: string[]): any {
    const obj: any = {};
    headers.forEach((header, index) => {
        const normalizedKey = header.toLowerCase().replace(/[\s\-_\/]/g, '').replace(/[()%]/g, '');
        obj[normalizedKey] = row[index]?.trim() || '';
    });
    return obj;
}

/**
 * Parse and validate date
 */
function parseDate(dateStr: string): Date {
    if (!dateStr) {
        return new Date();
    }
    
    // Try different date formats
    const formats = [
        // ISO format
        /^\d{4}-\d{2}-\d{2}$/,
        // US format
        /^\d{1,2}\/\d{1,2}\/\d{4}$/,
        // European format
        /^\d{1,2}-\d{1,2}-\d{4}$/
    ];

    for (const format of formats) {
        if (format.test(dateStr)) {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
    }
    
    throw new Error(`Invalid date format: ${dateStr}. Use YYYY-MM-DD, MM/DD/YYYY, or DD-MM-YYYY format.`);
}

/**
 * Parse debt status
 */
function parseDebtStatus(statusStr: string): 'ACTIVE' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERDUE' | 'DEFAULTED' {
    const normalizedStatus = statusStr.toUpperCase().replace(/[\s\-_]/g, '');
    
    const statusMap: Record<string, 'ACTIVE' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERDUE' | 'DEFAULTED'> = {
        'ACTIVE': 'ACTIVE',
        'PARTIALLYPAID': 'PARTIALLY_PAID',
        'PARTIALLY_PAID': 'PARTIALLY_PAID',
        'FULLYPAID': 'FULLY_PAID',
        'FULLY_PAID': 'FULLY_PAID',
        'PAID': 'FULLY_PAID',
        'OVERDUE': 'OVERDUE',
        'LATE': 'OVERDUE',
        'DEFAULTED': 'DEFAULTED',
        'DEFAULT': 'DEFAULTED'
    };
    
    return statusMap[normalizedStatus] || 'ACTIVE';
}

/**
 * Validate and convert CSV row to debt data
 */
function validateAndConvertRow(
    row: string[], 
    headers: string[], 
    rowIndex: number,
    accounts: any[]
): {
    isValid: boolean;
    data: ParsedDebtData | null;
    errors: string[];
} {
    const errors: string[] = [];
    
    // Create object from row data
    const rowData = mapRowToObject(row, headers);

    // Validate required fields
    const requiredFields = ['borrowername', 'amount', 'interestrate', 'lentdate'];
    for (const field of requiredFields) {
        if (!rowData[field] || rowData[field].trim() === '') {
            errors.push(`Row ${rowIndex + 1}: Missing required field '${field}'`);
        }
    }

    // Parse and validate numeric fields
    let amount: number;
    let interestRate: number;

    try {
        amount = parseFloat(rowData.amount);
        if (isNaN(amount) || amount <= 0) {
            errors.push(`Row ${rowIndex + 1}: Invalid amount value (${rowData.amount}). Must be a positive number.`);
        }
    } catch {
        errors.push(`Row ${rowIndex + 1}: Invalid amount format (${rowData.amount})`);
    }

    try {
        interestRate = parseFloat(rowData.interestrate);
        if (isNaN(interestRate) || interestRate < 0) {
            errors.push(`Row ${rowIndex + 1}: Invalid interest rate value (${rowData.interestrate}). Must be a non-negative number.`);
        }
    } catch {
        errors.push(`Row ${rowIndex + 1}: Invalid interest rate format (${rowData.interestrate})`);
    }

    // Parse and validate dates
    let lentDate: Date;
    let dueDate: Date | undefined;

    try {
        lentDate = parseDate(rowData.lentdate);
    } catch (error) {
        errors.push(`Row ${rowIndex + 1}: ${error instanceof Error ? error.message : 'Invalid lent date'}`);
    }

    if (rowData.duedate && rowData.duedate.trim() !== '') {
        try {
            dueDate = parseDate(rowData.duedate);
            // Validate that due date is after lent date
            if (lentDate! && dueDate <= lentDate!) {
                errors.push(`Row ${rowIndex + 1}: Due date must be after lent date`);
            }
        } catch (error) {
            errors.push(`Row ${rowIndex + 1}: Invalid due date - ${error instanceof Error ? error.message : 'Invalid date format'}`);
        }
    }

    // Parse debt status
    let debtStatus: 'ACTIVE' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERDUE' | 'DEFAULTED';
    try {
        debtStatus = parseDebtStatus(rowData.status || 'ACTIVE');
    } catch {
        errors.push(`Row ${rowIndex + 1}: Invalid debt status (${rowData.status})`);
        debtStatus = 'ACTIVE';
    }

    // Find account (optional for debts)
    let accountId: number | undefined;
    const accountName = rowData.account || rowData.bankname || '';
    
    if (accountName) {
        const account = accounts.find(a => {
            if (!accountName) return false;
            
            // Try to match against the exported format: "holderName - bankName"
            const exportedFormat = `${a.holderName} - ${a.bankName}`;
            if (exportedFormat.toLowerCase() === accountName.toLowerCase()) {
                return true;
            }
            
            // Fallback: Match against individual components
            const holderNameMatch = a.holderName && a.holderName.toLowerCase().includes(accountName.toLowerCase());
            const bankNameMatch = a.bankName && a.bankName.toLowerCase().includes(accountName.toLowerCase());
            const accountNumberMatch = a.accountNumber && a.accountNumber.toLowerCase() === accountName.toLowerCase();
            
            return holderNameMatch || bankNameMatch || accountNumberMatch;
        });
        
        if (account) {
            accountId = account.id;
        }
        // Note: We don't throw an error if account is not found for debts, as account is optional
    }

    // Validate email format if provided
    const email = rowData.borroweremail;
    if (email && email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errors.push(`Row ${rowIndex + 1}: Invalid email format (${email})`);
        }
    }

    if (errors.length > 0) {
        return { isValid: false, data: null, errors };
    }

    // Convert to ParsedDebtData
    const debtData: ParsedDebtData = {
        borrowerName: rowData.borrowername,
        borrowerContact: rowData.borrowercontact || undefined,
        borrowerEmail: rowData.borroweremail || undefined,
        amount: amount!,
        interestRate: interestRate!,
        dueDate: dueDate,
        lentDate: lentDate!,
        status: debtStatus,
        purpose: rowData.purpose || undefined,
        notes: rowData.notes || undefined,
        accountId: accountId,
        originalId: rowData.id ? parseInt(rowData.id, 10) : undefined
    };

    return { isValid: true, data: debtData, errors: [] };
}

/**
 * Validate and convert CSV row to repayment data
 */
function validateAndConvertRepaymentRow(
    row: string[], 
    headers: string[], 
    rowIndex: number,
    accounts: any[]
): {
    isValid: boolean;
    data: ParsedRepaymentData | null;
    errors: string[];
} {
    const errors: string[] = [];
    
    // Create object from row data
    const rowData = mapRowToObject(row, headers);

    // Validate required fields
    const requiredFields = ['debtid', 'amount', 'repaymentdate'];
    for (const field of requiredFields) {
        if (!rowData[field] || rowData[field].trim() === '') {
            errors.push(`Row ${rowIndex + 1}: Missing required field '${field}'`);
        }
    }

    // Parse and validate numeric fields
    let amount: number;
    let debtId: number;

    try {
        amount = parseFloat(rowData.amount);
        if (isNaN(amount) || amount <= 0) {
            errors.push(`Row ${rowIndex + 1}: Invalid amount value (${rowData.amount}). Must be a positive number.`);
        }
    } catch {
        errors.push(`Row ${rowIndex + 1}: Invalid amount format (${rowData.amount})`);
    }

    try {
        debtId = parseInt(rowData.debtid, 10);
        if (isNaN(debtId) || debtId <= 0) {
            errors.push(`Row ${rowIndex + 1}: Invalid debt ID value (${rowData.debtid}). Must be a positive number.`);
        }
    } catch {
        errors.push(`Row ${rowIndex + 1}: Invalid debt ID format (${rowData.debtid})`);
    }

    // Parse and validate dates
    let repaymentDate: Date;

    try {
        repaymentDate = parseDate(rowData.repaymentdate);
    } catch (error) {
        errors.push(`Row ${rowIndex + 1}: ${error instanceof Error ? error.message : 'Invalid repayment date'}`);
    }

    // Find account (optional for repayments)
    let accountId: number | undefined;
    if (rowData.accountid && rowData.accountid.trim() !== '') {
        try {
            accountId = parseInt(rowData.accountid, 10);
            const accountExists = accounts.some(a => a.id === accountId);
            if (!accountExists) {
                // We don't make this a hard error, just a warning
                console.warn(`Row ${rowIndex + 1}: Account ID ${accountId} not found in user accounts`);
            }
        } catch {
            errors.push(`Row ${rowIndex + 1}: Invalid account ID format (${rowData.accountid})`);
        }
    }

    if (errors.length > 0) {
        return { isValid: false, data: null, errors };
    }

    // Convert to ParsedRepaymentData
    const repaymentData: ParsedRepaymentData = {
        debtId: debtId!,
        amount: amount!,
        repaymentDate: repaymentDate!,
        notes: rowData.notes || undefined,
        accountId: accountId,
        originalId: rowData.id ? parseInt(rowData.id, 10) : undefined
    };

    return { isValid: true, data: repaymentData, errors: [] };
}

/**
 * Parse and validate CSV content for debt import
 */
export function parseDebtsCSV(csvContent: string, accounts: any[]): ImportResult {
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
        const requiredHeaders = ['Borrower Name', 'Amount', 'Interest Rate (%)', 'Lent Date'];
        const missingRequiredHeaders = requiredHeaders.filter(header => 
            !headers.some(h => h.toLowerCase().replace(/[\s\-_()%]/g, '') === header.toLowerCase().replace(/[\s\-_()%]/g, ''))
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

        const validDebts: ParsedDebtData[] = [];
        const allErrors: Array<{ row: number; error: string; data?: any }> = [];

        // Process each data row
        dataRows.forEach((row, index) => {
            const result = validateAndConvertRow(row, headers, index + 1, accounts);
            
            if (result.isValid && result.data) {
                validDebts.push(result.data);
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
            success: validDebts.length > 0,
            importedCount: 0, // Will be set after actual import
            errors: allErrors,
            skippedCount: dataRows.length - validDebts.length,
            data: validDebts
        } as ImportResult & { data: ParsedDebtData[] };

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
 * Parse and validate CSV content for repayment import
 */
export function parseRepaymentsCSV(csvContent: string, accounts: any[]): ImportResult {
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
        const requiredHeaders = ['Debt ID', 'Amount', 'Repayment Date'];
        const missingRequiredHeaders = requiredHeaders.filter(header => 
            !headers.some(h => h.toLowerCase().replace(/[\s\-_()%]/g, '') === header.toLowerCase().replace(/[\s\-_()%]/g, ''))
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

        const validRepayments: ParsedRepaymentData[] = [];
        const allErrors: Array<{ row: number; error: string; data?: any }> = [];

        // Process each data row
        dataRows.forEach((row, index) => {
            const result = validateAndConvertRepaymentRow(row, headers, index + 1, accounts);
            
            if (result.isValid && result.data) {
                validRepayments.push(result.data);
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
            success: validRepayments.length > 0,
            importedCount: 0, // Will be set after actual import
            errors: allErrors,
            skippedCount: dataRows.length - validRepayments.length,
            data: validRepayments
        } as ImportResult & { data: ParsedRepaymentData[] };

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