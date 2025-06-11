import { AccountInterface } from '../types/accounts';

/**
 * Parse CSV content and convert to account objects
 */
export interface ParsedAccountData {
    holderName: string;
    accountNumber: string;
    branchCode: string;
    bankName: string;
    branchName: string;
    bankAddress: string;
    accountType: string;
    mobileNumbers: string[];
    branchContacts: string[];
    swift: string;
    bankEmail: string;
    accountOpeningDate: Date;
    securityQuestion: string[];
    balance?: number;
    appUsername?: string;
    notes?: string;
    nickname?: string;
}

export interface ImportResult {
    success: boolean;
    data: ParsedAccountData[];
    errors: string[];
    totalRows: number;
    validRows: number;
}

/**
 * Parse CSV string to array of objects
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
 * Validate and convert CSV row to account data
 */
function validateAndConvertRow(row: string[], headers: string[], rowIndex: number): {
    isValid: boolean;
    data: ParsedAccountData | null;
    errors: string[];
} {
    const errors: string[] = [];
    
    // Create object from row data
    const rowData: any = {};
    headers.forEach((header, index) => {
        rowData[header] = (row[index] && row[index].trim() !== '') ? row[index].trim() : '';
    });

    // Define required fields (core bank account information only)
    const requiredFields = [
        'Holder Name', 
        'Account Number', 
        'Bank Name', 
        'Branch Name', 
    ];
    
    // Validate only required fields
    for (const field of requiredFields) {
        if (!rowData[field] || rowData[field].trim() === '') {
            errors.push(`Row ${rowIndex + 1}: Missing required field '${field}'`);
        }
    }

    // Validate account opening date format
    let parsedDate: Date;
    const dateStr = rowData['Account Opening Date'];
    if (dateStr) {
        parsedDate = new Date(dateStr);
        if (isNaN(parsedDate.getTime())) {
            errors.push(`Row ${rowIndex + 1}: Invalid date format for 'Account Opening Date' (${dateStr}). Use YYYY-MM-DD format.`);
        }
    } else {
        parsedDate = new Date(); // Default to current date if not provided
    }

    // Validate balance if provided (optional field)
    let balance: number | undefined;
    if (rowData['Balance'] && rowData['Balance'].trim() !== '') {
        balance = parseFloat(rowData['Balance']);
        if (isNaN(balance)) {
            errors.push(`Row ${rowIndex + 1}: Invalid balance value (${rowData['Balance']}). Must be a number.`);
        }
    }

    if (errors.length > 0) {
        return { isValid: false, data: null, errors };
    }

    // Convert to ParsedAccountData with optional fields handled gracefully
    const accountData: ParsedAccountData = {
        // Required fields
        holderName: rowData['Holder Name'],
        accountNumber: rowData['Account Number'],
        branchCode: rowData['Branch Code'],
        bankName: rowData['Bank Name'],
        branchName: rowData['Branch Name'],
        bankAddress: rowData['Bank Address'],
        accountType: rowData['Account Type'],
        swift: rowData['SWIFT Code'],
        accountOpeningDate: parsedDate,
        
        // Optional contact information fields
        mobileNumbers: rowData['Mobile Numbers'] ? 
            rowData['Mobile Numbers'].split(';').map((num: string) => num.trim()).filter((num: string) => num !== '') : [],
        branchContacts: rowData['Branch Contacts'] ? 
            rowData['Branch Contacts'].split(';').map((contact: string) => contact.trim()).filter((contact: string) => contact !== '') : [],
        bankEmail: rowData['Bank Email'] || '',
        
        // Optional security information fields
        securityQuestion: rowData['Security Questions'] ? 
            rowData['Security Questions'].split(';').map((q: string) => q.trim()).filter((q: string) => q !== '') : [],
        
        // Optional additional information fields
        balance: balance,
        appUsername: rowData['App Username'] && rowData['App Username'].trim() !== '' ? rowData['App Username'].trim() : undefined,
        notes: rowData['Notes'] && rowData['Notes'].trim() !== '' ? rowData['Notes'].trim() : undefined,
        nickname: rowData['Nickname'] && rowData['Nickname'].trim() !== '' ? rowData['Nickname'].trim() : undefined,
    };

    return { isValid: true, data: accountData, errors: [] };
}

/**
 * Parse and validate CSV content for account import
 */
export function parseAccountsCSV(csvContent: string): ImportResult {
    try {
        const rows = parseCSV(csvContent);
        
        if (rows.length === 0) {
            return {
                success: false,
                data: [],
                errors: ['CSV file is empty'],
                totalRows: 0,
                validRows: 0
            };
        }

        const headers = rows[0];
        const dataRows = rows.slice(1);
        
        if (!headers || headers.length === 0) {
            return {
                success: false,
                data: [],
                errors: ['CSV file has no headers'],
                totalRows: 0,
                validRows: 0
            };
        }
        
        // Define minimum required headers (core bank account fields only)
        const requiredHeaders = [
            'Holder Name', 
            'Account Number', 
            'Branch Code', 
            'Bank Name', 
            'Branch Name', 
            'Bank Address', 
            'Account Type', 
            'SWIFT Code', 
            'Account Opening Date'
        ];

        // Optional headers that can be present but are not required
        const optionalHeaders = [
            'ID', 'Mobile Numbers', 'Branch Contacts', 'Bank Email', 
            'Security Questions', 'Balance', 'App Username', 'Notes', 
            'Nickname', 'Created At', 'Updated At'
        ];

        // Check for missing required headers
        const missingRequiredHeaders = requiredHeaders.filter(header => !headers.includes(header));
        if (missingRequiredHeaders.length > 0) {
            return {
                success: false,
                data: [],
                errors: [
                    `Missing required headers: ${missingRequiredHeaders.join(', ')}`,
                    `Required headers: ${requiredHeaders.join(', ')}`,
                    `Optional headers: ${optionalHeaders.join(', ')}`
                ],
                totalRows: dataRows.length,
                validRows: 0
            };
        }

        const validAccounts: ParsedAccountData[] = [];
        const allErrors: string[] = [];

        // Process each data row
        dataRows.forEach((row, index) => {
            const result = validateAndConvertRow(row, headers, index + 1); // +1 because headers are row 0
            
            if (result.isValid && result.data) {
                validAccounts.push(result.data);
            } else {
                allErrors.push(...result.errors);
            }
        });

        return {
            success: validAccounts.length > 0,
            data: validAccounts,
            errors: allErrors,
            totalRows: dataRows.length,
            validRows: validAccounts.length
        };

    } catch (error) {
        return {
            success: false,
            data: [],
            errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`],
            totalRows: 0,
            validRows: 0
        };
    }
}

/**
 * Read file content as text
 */
export function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result;
            if (typeof result === 'string') {
                resolve(result);
            } else {
                reject(new Error('Failed to read file as text'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
} 