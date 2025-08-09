/**
 * Accounts-specific CSV Import
 * Specialized functions for importing account data with validation
 */

import { importCSVFile } from './csvImportCore';
import {
    parseRequiredStringField,
    parseStringField,
    parseAccountNumberField,
    parseCurrencyField,
    parseDateField,
    parseArrayField,
    parseMultilineTextField,
    parseEmailField
} from './csvFieldParsers';

/**
 * Interface for parsed account data from CSV
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

/**
 * Required fields for account import
 */
export const ACCOUNT_REQUIRED_FIELDS = [
    'Holder Name',
    'Account Number',
    'Bank Name',
    'Branch Name'
];

/**
 * Optional fields for account import
 */
export const ACCOUNT_OPTIONAL_FIELDS = [
    'Branch Code',
    'Bank Address',
    'Account Type',
    'Mobile Numbers',
    'Branch Contacts',
    'SWIFT Code',
    'Bank Email',
    'Account Opening Date',
    'Security Questions',
    'Balance',
    'App Username',
    'Notes',
    'Nickname'
];

/**
 * Field name mappings for flexible header matching
 */
export const FIELD_MAPPINGS: Record<string, string[]> = {
    'holdername': ['holder name', 'account holder', 'customer name', 'name'],
    'accountnumber': ['account number', 'account no', 'acc number', 'acc no', 'account'],
    'branchcode': ['branch code', 'ifsc', 'ifsc code', 'routing number', 'sort code'],
    'bankname': ['bank name', 'bank', 'financial institution'],
    'branchname': ['branch name', 'branch', 'office name'],
    'bankaddress': ['bank address', 'branch address', 'address'],
    'accounttype': ['account type', 'type', 'account category'],
    'mobilenumbers': ['mobile numbers', 'phone numbers', 'contact numbers', 'mobile', 'phone'],
    'branchcontacts': ['branch contacts', 'branch phone', 'branch numbers'],
    'swiftcode': ['swift code', 'swift', 'bic', 'bic code'],
    'bankemail': ['bank email', 'branch email', 'email'],
    'accountopeningdate': ['account opening date', 'opening date', 'date opened', 'created date'],
    'securityquestions': ['security questions', 'security question', 'secret questions'],
    'balance': ['balance', 'current balance', 'amount'],
    'appusername': ['app username', 'username', 'login', 'user id'],
    'notes': ['notes', 'comments', 'remarks', 'description'],
    'nickname': ['nickname', 'alias', 'display name', 'account name']
};

/**
 * Normalize field name for mapping
 */
function normalizeFieldName(fieldName: string): string {
    return fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Get mapped field name
 */
function getMappedFieldName(csvFieldName: string): string | null {
    const normalized = normalizeFieldName(csvFieldName);
    
    for (const [standardField, variations] of Object.entries(FIELD_MAPPINGS)) {
        if (variations.some(variation => normalizeFieldName(variation) === normalized)) {
            return standardField;
        }
    }
    
    return null;
}

/**
 * Process a single CSV row to account data
 */
function processAccountRow(rowData: Record<string, string>, rowIndex: number): ParsedAccountData {
    // Create a mapped version of rowData with standardized field names
    const mappedData: Record<string, string> = {};
    
    for (const [csvField, value] of Object.entries(rowData)) {
        const mappedField = getMappedFieldName(csvField);
        if (mappedField) {
            mappedData[mappedField] = value;
        }
    }
    
    try {
        // Parse required fields
        const holderName = parseRequiredStringField(mappedData.holdername, 'Holder Name');
        const accountNumber = parseAccountNumberField(mappedData.accountnumber);
        const bankName = parseRequiredStringField(mappedData.bankname, 'Bank Name');
        const branchName = parseRequiredStringField(mappedData.branchname, 'Branch Name');
        
        // Parse optional fields with defaults
        const branchCode = parseStringField(mappedData.branchcode) || '';
        const bankAddress = parseStringField(mappedData.bankaddress) || '';
        const accountType = parseStringField(mappedData.accounttype) || '';
        const swift = parseStringField(mappedData.swiftcode) || '';
        const bankEmail = mappedData.bankemail ? parseEmailField(mappedData.bankemail) : '';
        
        // Parse array fields
        const mobileNumbers = parseArrayField(mappedData.mobilenumbers);
        const branchContacts = parseArrayField(mappedData.branchcontacts);
        const securityQuestion = parseArrayField(mappedData.securityquestions);
        
        // Parse date field
        let accountOpeningDate: Date;
        if (mappedData.accountopeningdate) {
            const parsedDate = parseDateField(mappedData.accountopeningdate);
            accountOpeningDate = parsedDate || new Date();
        } else {
            accountOpeningDate = new Date(); // Default to today
        }
        
        // Parse optional fields
        const balance = mappedData.balance ? parseCurrencyField(mappedData.balance) : undefined;
        const appUsername = parseStringField(mappedData.appusername) || undefined;
        const notes = parseMultilineTextField(mappedData.notes) || undefined;
        const nickname = parseStringField(mappedData.nickname) || undefined;
        
        return {
            holderName,
            accountNumber,
            branchCode,
            bankName,
            branchName,
            bankAddress,
            accountType,
            mobileNumbers,
            branchContacts,
            swift,
            bankEmail,
            accountOpeningDate,
            securityQuestion,
            balance,
            appUsername,
            notes,
            nickname
        };
        
    } catch (error) {
        throw new Error(`${error instanceof Error ? error.message : 'Unknown validation error'}`);
    }
}

/**
 * Import accounts from CSV file
 */
export async function importAccountsFromCSV(file: File): Promise<{
    success: boolean;
    data: ParsedAccountData[];
    errors: string[];
    warnings: string[];
    totalRows: number;
    validRows: number;
}> {
    return importCSVFile(file, {
        requiredFields: ACCOUNT_REQUIRED_FIELDS,
        optionalFields: ACCOUNT_OPTIONAL_FIELDS,
        processor: processAccountRow,
        skipEmptyRows: true
    });
}

/**
 * Validate account data for duplicates and business rules
 */
export function validateAccountData(accounts: ParsedAccountData[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (accounts.length === 0) {
        errors.push('No valid accounts to import');
        return { isValid: false, errors, warnings };
    }
    
    // Check for duplicate account numbers
    const accountNumbers = new Set<string>();
    const duplicates = new Set<string>();
    
    accounts.forEach((account, index) => {
        if (accountNumbers.has(account.accountNumber)) {
            duplicates.add(account.accountNumber);
            errors.push(`Duplicate account number found: ${account.accountNumber} (first seen in row ${index + 1})`);
        } else {
            accountNumbers.add(account.accountNumber);
        }
    });
    
    // Check for missing critical information
    accounts.forEach((account, index) => {
        if (!account.branchCode && !account.swift) {
            warnings.push(`Row ${index + 1}: Neither Branch Code nor SWIFT Code provided for account ${account.accountNumber}`);
        }
        
        if (!account.accountType) {
            warnings.push(`Row ${index + 1}: Account type not specified for account ${account.accountNumber}`);
        }
        
        if (account.mobileNumbers.length === 0 && !account.bankEmail) {
            warnings.push(`Row ${index + 1}: No contact information provided for account ${account.accountNumber}`);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Process imported accounts with validation
 */
export async function processAccountImport(file: File): Promise<{
    success: boolean;
    data: ParsedAccountData[];
    errors: string[];
    warnings: string[];
    totalRows: number;
    validRows: number;
    validatedData?: ParsedAccountData[];
}> {
    // Import accounts from CSV
    const importResult = await importAccountsFromCSV(file);
    
    if (!importResult.success) {
        return importResult;
    }
    
    // Validate imported data
    const validation = validateAccountData(importResult.data);
    
    // Combine warnings
    const allWarnings = [...importResult.warnings, ...validation.warnings];
    
    if (!validation.isValid) {
        return {
            ...importResult,
            success: false,
            errors: [...importResult.errors, ...validation.errors],
            warnings: allWarnings
        };
    }
    
    return {
        ...importResult,
        warnings: allWarnings,
        validatedData: importResult.data
    };
}
