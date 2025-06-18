import { InvestmentInterface } from '../types/investments';
import { ImportResult } from '../types/bulkImport';

/**
 * Parse CSV content for investment import
 */
export interface ParsedInvestmentData {
    name: string;
    type: 'STOCKS' | 'CRYPTO' | 'MUTUAL_FUNDS' | 'BONDS' | 'REAL_ESTATE' | 'GOLD' | 'FIXED_DEPOSIT' | 'OTHER';
    symbol?: string;
    quantity: number;
    purchasePrice: number;
    currentPrice: number;
    purchaseDate: Date;
    accountId: number;
    notes?: string;
    interestRate?: number;
    maturityDate?: Date;
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
 * Parse investment type
 */
function parseInvestmentType(typeStr: string): 'STOCKS' | 'CRYPTO' | 'MUTUAL_FUNDS' | 'BONDS' | 'REAL_ESTATE' | 'GOLD' | 'FIXED_DEPOSIT' | 'OTHER' {
    const normalizedType = typeStr.toUpperCase().replace(/[\s\-_]/g, '');
    
    const typeMap: Record<string, 'STOCKS' | 'CRYPTO' | 'MUTUAL_FUNDS' | 'BONDS' | 'REAL_ESTATE' | 'GOLD' | 'FIXED_DEPOSIT' | 'OTHER'> = {
        'STOCKS': 'STOCKS',
        'STOCK': 'STOCKS',
        'EQUITY': 'STOCKS',
        'CRYPTO': 'CRYPTO',
        'CRYPTOCURRENCY': 'CRYPTO',
        'BITCOIN': 'CRYPTO',
        'MUTUALFUNDS': 'MUTUAL_FUNDS',
        'MUTUALFUND': 'MUTUAL_FUNDS',
        'MF': 'MUTUAL_FUNDS',
        'BONDS': 'BONDS',
        'BOND': 'BONDS',
        'REALESTATE': 'REAL_ESTATE',
        'PROPERTY': 'REAL_ESTATE',
        'GOLD': 'GOLD',
        'FIXEDDEPOSIT': 'FIXED_DEPOSIT',
        'FD': 'FIXED_DEPOSIT',
        'DEPOSIT': 'FIXED_DEPOSIT',
        'OTHER': 'OTHER'
    };
    
    return typeMap[normalizedType] || 'OTHER';
}

/**
 * Validate and convert CSV row to investment data
 */
function validateAndConvertRow(
    row: string[], 
    headers: string[], 
    rowIndex: number,
    accounts: any[]
): {
    isValid: boolean;
    data: ParsedInvestmentData | null;
    errors: string[];
} {
    const errors: string[] = [];
    
    // Create object from row data
    const rowData = mapRowToObject(row, headers);

    // Validate required fields
    const requiredFields = ['name', 'type', 'quantity', 'purchaseprice', 'currentprice', 'purchasedate'];
    for (const field of requiredFields) {
        if (!rowData[field] || rowData[field].trim() === '') {
            errors.push(`Row ${rowIndex + 1}: Missing required field '${field}'`);
        }
    }

    // Parse and validate numeric fields
    let quantity: number;
    let purchasePrice: number;
    let currentPrice: number;
    let interestRate: number | undefined;

    try {
        quantity = parseFloat(rowData.quantity);
        if (isNaN(quantity) || quantity <= 0) {
            errors.push(`Row ${rowIndex + 1}: Invalid quantity value (${rowData.quantity}). Must be a positive number.`);
        }
    } catch {
        errors.push(`Row ${rowIndex + 1}: Invalid quantity format (${rowData.quantity})`);
    }

    try {
        purchasePrice = parseFloat(rowData.purchaseprice);
        if (isNaN(purchasePrice) || purchasePrice <= 0) {
            errors.push(`Row ${rowIndex + 1}: Invalid purchase price value (${rowData.purchaseprice}). Must be a positive number.`);
        }
    } catch {
        errors.push(`Row ${rowIndex + 1}: Invalid purchase price format (${rowData.purchaseprice})`);
    }

    try {
        currentPrice = parseFloat(rowData.currentprice);
        if (isNaN(currentPrice) || currentPrice <= 0) {
            errors.push(`Row ${rowIndex + 1}: Invalid current price value (${rowData.currentprice}). Must be a positive number.`);
        }
    } catch {
        errors.push(`Row ${rowIndex + 1}: Invalid current price format (${rowData.currentprice})`);
    }

    // Parse optional interest rate for fixed deposits
    if (rowData.interestrate && rowData.interestrate.trim() !== '') {
        try {
            interestRate = parseFloat(rowData.interestrate);
            if (isNaN(interestRate) || interestRate < 0) {
                errors.push(`Row ${rowIndex + 1}: Invalid interest rate value (${rowData.interestrate}). Must be a non-negative number.`);
            }
        } catch {
            errors.push(`Row ${rowIndex + 1}: Invalid interest rate format (${rowData.interestrate})`);
        }
    }

    // Parse and validate dates
    let purchaseDate: Date;
    let maturityDate: Date | undefined;

    try {
        purchaseDate = parseDate(rowData.purchasedate);
    } catch (error) {
        errors.push(`Row ${rowIndex + 1}: ${error instanceof Error ? error.message : 'Invalid purchase date'}`);
    }

    if (rowData.maturitydate && rowData.maturitydate.trim() !== '') {
        try {
            maturityDate = parseDate(rowData.maturitydate);
        } catch (error) {
            errors.push(`Row ${rowIndex + 1}: Invalid maturity date - ${error instanceof Error ? error.message : 'Invalid date format'}`);
        }
    }

    // Parse investment type
    let investmentType: 'STOCKS' | 'CRYPTO' | 'MUTUAL_FUNDS' | 'BONDS' | 'REAL_ESTATE' | 'GOLD' | 'FIXED_DEPOSIT' | 'OTHER';
    try {
        investmentType = parseInvestmentType(rowData.type);
    } catch {
        errors.push(`Row ${rowIndex + 1}: Invalid investment type (${rowData.type})`);
        investmentType = 'OTHER';
    }

    // Find account by account name or bank name
    let accountId: number;
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
        } else {
            errors.push(`Row ${rowIndex + 1}: Account not found (${accountName}). Please ensure the account exists or matches the exported format.`);
        }
    } else {
        errors.push(`Row ${rowIndex + 1}: Account information is required`);
    }

    if (errors.length > 0) {
        return { isValid: false, data: null, errors };
    }

    // Convert to ParsedInvestmentData
    const investmentData: ParsedInvestmentData = {
        name: rowData.name,
        type: investmentType,
        symbol: rowData.symbol || undefined,
        quantity: quantity!,
        purchasePrice: purchasePrice!,
        currentPrice: currentPrice!,
        purchaseDate: purchaseDate!,
        accountId: accountId!,
        notes: rowData.notes || undefined,
        interestRate: interestRate,
        maturityDate: maturityDate,
    };

    return { isValid: true, data: investmentData, errors: [] };
}

/**
 * Parse and validate CSV content for investment import
 */
export function parseInvestmentsCSV(csvContent: string, accounts: any[]): ImportResult {
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
        const requiredHeaders = ['Name', 'Type', 'Quantity', 'Purchase Price', 'Current Price', 'Purchase Date'];
        const missingRequiredHeaders = requiredHeaders.filter(header => 
            !headers.some(h => h.toLowerCase().replace(/[\s\-_]/g, '') === header.toLowerCase().replace(/[\s\-_]/g, ''))
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

        const validInvestments: ParsedInvestmentData[] = [];
        const allErrors: Array<{ row: number; error: string; data?: any }> = [];

        // Process each data row
        dataRows.forEach((row, index) => {
            const result = validateAndConvertRow(row, headers, index + 1, accounts);
            
            if (result.isValid && result.data) {
                validInvestments.push(result.data);
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
            success: validInvestments.length > 0,
            importedCount: 0, // Will be set after actual import
            errors: allErrors,
            skippedCount: dataRows.length - validInvestments.length,
            data: validInvestments
        } as ImportResult & { data: ParsedInvestmentData[] };

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