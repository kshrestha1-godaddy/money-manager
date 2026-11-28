import { InvestmentInterface } from '../types/investments';
import { ImportResult } from '../types/bulkImport';
import { assertCurrencyCode, type CurrencyCode } from './currency';
import { parseCSV } from './csvUtils';

/**
 * Parse CSV content for investment import
 */
export interface ParsedInvestmentData {
    name: string;
    type: 'SIP' | 'STOCKS' | 'CRYPTO' | 'MUTUAL_FUNDS' | 'BONDS' | 'REAL_ESTATE' | 'GOLD' | 'SILVER' | 'FIXED_DEPOSIT' | 'PROVIDENT_FUNDS' | 'SAFE_KEEPINGS' | 'EMERGENCY_FUND' | 'MARRIAGE' | 'VACATION' | 'OTHER';
    symbol?: string;
    quantity: number;
    purchasePrice: number;
    currentPrice: number;
    priceCurrency?: CurrencyCode;
    purchaseDate: Date;
    accountId?: number;
    investmentTargetId?: number;
    deductFromAccount?: boolean;
    notes?: string;
    interestRate?: number;
    maturityDate?: Date;
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
function parseInvestmentType(typeStr: string): 'SIP' | 'STOCKS' | 'CRYPTO' | 'MUTUAL_FUNDS' | 'BONDS' | 'REAL_ESTATE' | 'GOLD' | 'SILVER' | 'FIXED_DEPOSIT' | 'PROVIDENT_FUNDS' | 'SAFE_KEEPINGS' | 'EMERGENCY_FUND' | 'MARRIAGE' | 'VACATION' | 'OTHER' {
    const normalizedType = typeStr.toUpperCase().replace(/[\s\-_]/g, '');
    
    const typeMap: Record<string, 'SIP' | 'STOCKS' | 'CRYPTO' | 'MUTUAL_FUNDS' | 'BONDS' | 'REAL_ESTATE' | 'GOLD' | 'SILVER' | 'FIXED_DEPOSIT' | 'PROVIDENT_FUNDS' | 'SAFE_KEEPINGS' | 'EMERGENCY_FUND' | 'MARRIAGE' | 'VACATION' | 'OTHER'> = {
        'SIP': 'SIP',
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
        'SILVER': 'SILVER',
        'FIXEDDEPOSIT': 'FIXED_DEPOSIT',
        'FD': 'FIXED_DEPOSIT',
        'DEPOSIT': 'FIXED_DEPOSIT',
        'PROVIDENTFUNDS': 'PROVIDENT_FUNDS',
        'PROVIDENTFUND': 'PROVIDENT_FUNDS',
        'PF': 'PROVIDENT_FUNDS',
        'EPF': 'PROVIDENT_FUNDS',
        'SAFEKEEPINGS': 'SAFE_KEEPINGS',
        'SAFEKEEPING': 'SAFE_KEEPINGS',
        'SAFETY': 'SAFE_KEEPINGS',
        'VAULT': 'SAFE_KEEPINGS',
        'EMERGENCYFUND': 'EMERGENCY_FUND',
        'EMERGENCY': 'EMERGENCY_FUND',
        'EMERGENCYF': 'EMERGENCY_FUND',
        'MARRIAGE': 'MARRIAGE',
        'MARRIAGEFUND': 'MARRIAGE',
        'WEDDING': 'MARRIAGE',
        'VACATION': 'VACATION',
        'VACATIONFUND': 'VACATION',
        'HOLIDAY': 'VACATION',
        'TRAVEL': 'VACATION',
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
    let priceCurrency: CurrencyCode | undefined;
    if (rowData.pricecurrency || rowData.currency) {
        try {
            priceCurrency = assertCurrencyCode(
                rowData.pricecurrency || rowData.currency
            );
        } catch (error) {
            errors.push(
                `Row ${rowIndex + 1}: ${error instanceof Error ? error.message : 'Invalid price currency'}`
            );
        }
    }

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
        if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
            errors.push(`Row ${rowIndex + 1}: Invalid purchase price value (${rowData.purchaseprice}). Must be zero or greater.`);
        }
    } catch {
        errors.push(`Row ${rowIndex + 1}: Invalid purchase price format (${rowData.purchaseprice})`);
    }

    try {
        currentPrice = parseFloat(rowData.currentprice);
        if (!Number.isFinite(currentPrice) || currentPrice < 0) {
            errors.push(`Row ${rowIndex + 1}: Invalid current price value (${rowData.currentprice}). Must be zero or greater.`);
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
    let investmentType: 'SIP' | 'STOCKS' | 'CRYPTO' | 'MUTUAL_FUNDS' | 'BONDS' | 'REAL_ESTATE' | 'GOLD' | 'SILVER' | 'FIXED_DEPOSIT' | 'PROVIDENT_FUNDS' | 'SAFE_KEEPINGS' | 'EMERGENCY_FUND' | 'MARRIAGE' | 'VACATION' | 'OTHER';
    try {
        investmentType = parseInvestmentType(rowData.type);
    } catch {
        errors.push(`Row ${rowIndex + 1}: Invalid investment type (${rowData.type})`);
        investmentType = 'OTHER';
    }

    const rawTargetId = rowData.investmenttargetid;
    const investmentTargetId = rawTargetId ? Number(rawTargetId) : undefined;
    if (investmentTargetId !== undefined && (!Number.isSafeInteger(investmentTargetId) || investmentTargetId <= 0)) {
        errors.push(`Row ${rowIndex + 1}: Invalid investment target ID`);
    }
    const withheld = rowData.withheld?.toLowerCase();
    if (withheld && withheld !== "yes" && withheld !== "no") {
        errors.push(`Row ${rowIndex + 1}: Withheld must be Yes or No`);
    }
    const deductFromAccount = withheld ? withheld === "yes" : undefined;

    // Find account by account name or bank name (optional)
    let accountId: number | undefined;
    const accountName = rowData.account || rowData.bankname || '';
    const accountNumber = rowData.accountnumber;
    if (accountNumber || accountName) {
        const normalized = String(accountNumber || accountName).toLowerCase();
        const matches = accounts.filter(account => {
            const number = account.accountNumber?.toLowerCase();
            if (accountNumber) return number === normalized;
            const exportedName = `${account.holderName} - ${account.bankName}`.toLowerCase();
            return exportedName === normalized || number === normalized ||
                account.bankName?.toLowerCase().includes(normalized) ||
                account.holderName?.toLowerCase().includes(normalized);
        });
        if (matches.length === 1) {
            accountId = matches[0].id;
        } else {
            const reason = matches.length > 1 ? "Multiple accounts match" : "Account not found";
            errors.push(`Row ${rowIndex + 1}: ${reason} (${accountNumber || accountName})`);
        }
    }

    // Account information is now optional - investments can be tracked independently

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
        priceCurrency,
        purchaseDate: purchaseDate!,
        accountId,
        investmentTargetId,
        deductFromAccount,
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