/**
 * Accounts-specific CSV Export
 * Specialized functions for exporting account data with proper formatting
 */

import { AccountInterface } from '../../types/accounts';
import { exportToCSV } from './csvExportCore';
import {
    formatStringField,
    formatCurrencyField,
    formatDateField,
    formatDateTimeField,
    formatArrayField,
    formatMultilineTextField,
    formatAccountNumberField,
    formatEmailField
} from './csvFieldFormatters';

/**
 * Fields to include in the account CSV export
 */
export const ACCOUNT_EXPORT_FIELDS: (keyof AccountInterface)[] = [
    'id',
    'holderName',
    'accountNumber',
    'branchCode',
    'bankName',
    'branchName',
    'bankAddress',
    'accountType',
    'mobileNumbers',
    'branchContacts',
    'swift',
    'bankEmail',
    'accountOpeningDate',
    'securityQuestion',
    'balance',
    'appUsername',
    'notes',
    'nickname',
    'createdAt',
    'updatedAt'
];

/**
 * Display names for account CSV headers
 */
export const ACCOUNT_HEADER_NAMES: Record<keyof AccountInterface, string> = {
    id: 'ID',
    holderName: 'Holder Name',
    accountNumber: 'Account Number',
    branchCode: 'Branch Code',
    bankName: 'Bank Name',
    branchName: 'Branch Name',
    bankAddress: 'Bank Address',
    accountType: 'Account Type',
    mobileNumbers: 'Mobile Numbers',
    branchContacts: 'Branch Contacts',
    swift: 'SWIFT Code',
    bankEmail: 'Bank Email',
    accountOpeningDate: 'Account Opening Date',
    securityQuestion: 'Security Questions',
    balance: 'Balance',
    appUsername: 'App Username',
    appPassword: 'App Password',
    appPin: 'App PIN',
    notes: 'Notes',
    nickname: 'Nickname',
    userId: 'User ID',
    createdAt: 'Created At',
    updatedAt: 'Updated At'
};

/**
 * Format account field values for CSV export
 */
function formatAccountField(
    value: any, 
    field: keyof AccountInterface, 
    account: AccountInterface
): string {
    switch (field) {
        case 'id':
        case 'userId':
            return String(value || '');
            
        case 'holderName':
        case 'bankName':
        case 'branchName':
        case 'bankAddress':
        case 'accountType':
        case 'swift':
        case 'appUsername':
        case 'nickname':
        case 'branchCode':
            return formatStringField(value);
            
        case 'accountNumber':
            return formatAccountNumberField(value);
            
        case 'bankEmail':
            return formatEmailField(value);
            
        case 'balance':
            return formatCurrencyField(value);
            
        case 'accountOpeningDate':
            return formatDateField(value);
            
        case 'createdAt':
        case 'updatedAt':
            return formatDateTimeField(value);
            
        case 'mobileNumbers':
        case 'branchContacts':
        case 'securityQuestion':
            return formatArrayField(value);
            
        case 'notes':
            return formatMultilineTextField(value);
            
        // Sensitive fields - exclude from export for security
        case 'appPassword':
        case 'appPin':
            return ''; // Don't export sensitive data
            
        default:
            return formatStringField(value);
    }
}

/**
 * Required fields for account validation during export
 */
const ACCOUNT_REQUIRED_FIELDS: (keyof AccountInterface)[] = [
    'id',
    'holderName',
    'accountNumber',
    'bankName',
    'branchName',
    'userId'
];

/**
 * Validate account data before export
 */
function validateAccountsForExport(accounts: AccountInterface[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!Array.isArray(accounts)) {
        errors.push('Data must be an array');
        return { isValid: false, errors };
    }
    
    if (accounts.length === 0) {
        errors.push('No accounts to export');
        return { isValid: false, errors };
    }
    
    // Validate only required fields for each account
    accounts.forEach((account, index) => {
        ACCOUNT_REQUIRED_FIELDS.forEach(field => {
            const value = account[field];
            if (value === null || value === undefined || 
                (typeof value === 'string' && value.trim() === '')) {
                errors.push(`Account ${index + 1}: Missing required field '${String(field)}'`);
            }
        });
    });
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Export accounts to CSV with proper formatting
 */
export function exportAccountsToCSV(
    accounts: AccountInterface[], 
    filename?: string
): { success: boolean; error?: string } {
    // Custom validation for accounts
    const validation = validateAccountsForExport(accounts);
    if (!validation.isValid) {
        return {
            success: false,
            error: validation.errors.join('; ')
        };
    }
    
    const exportFilename = filename || `accounts_export_${new Date().toISOString().split('T')[0]}`;
    
    return exportToCSV(accounts, {
        filename: exportFilename,
        fields: ACCOUNT_EXPORT_FIELDS,
        headers: ACCOUNT_EXPORT_FIELDS.map(field => ACCOUNT_HEADER_NAMES[field]),
        formatter: formatAccountField,
        includeBOM: true, // For Excel compatibility
        validate: false // Use our custom validation instead
    });
}

/**
 * Export a subset of account fields for privacy
 */
export function exportAccountsBasicInfo(
    accounts: AccountInterface[], 
    filename?: string
): { success: boolean; error?: string } {
    const basicFields: (keyof AccountInterface)[] = [
        'holderName',
        'bankName',
        'accountType',
        'balance',
        'accountOpeningDate'
    ];
    
    const exportFilename = filename || `accounts_basic_${new Date().toISOString().split('T')[0]}`;
    
    return exportToCSV(accounts, {
        filename: exportFilename,
        fields: basicFields,
        headers: basicFields.map(field => ACCOUNT_HEADER_NAMES[field]),
        formatter: formatAccountField,
        includeBOM: true,
        validate: false // Use custom validation for accounts
    });
}

/**
 * Export accounts for specific bank
 */
export function exportAccountsByBank(
    accounts: AccountInterface[], 
    bankName: string,
    filename?: string
): { success: boolean; error?: string } {
    const filteredAccounts = accounts.filter(account => 
        account.bankName.toLowerCase() === bankName.toLowerCase()
    );
    
    if (filteredAccounts.length === 0) {
        return {
            success: false,
            error: `No accounts found for bank: ${bankName}`
        };
    }
    
    const bankSlug = bankName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const exportFilename = filename || `accounts_${bankSlug}_${new Date().toISOString().split('T')[0]}`;
    
    return exportAccountsToCSV(filteredAccounts, exportFilename);
}

/**
 * Create a CSV template for account import
 */
export function createAccountImportTemplate(): { success: boolean; error?: string } {
    // Create sample data for the template
    const templateData: Partial<AccountInterface>[] = [{
        holderName: 'John Doe',
        accountNumber: '1234567890',
        branchCode: 'BANK0001',
        bankName: 'Sample Bank',
        branchName: 'Main Branch',
        bankAddress: '123 Bank Street, City, State 12345',
        accountType: 'Savings',
        mobileNumbers: ['555-1234'],
        branchContacts: ['555-BANK'],
        swift: 'BANKUS33',
        bankEmail: 'branch@samplebank.com',
        accountOpeningDate: new Date('2024-01-15'),
        securityQuestion: ['What is your favorite color?'],
        balance: 1000.00,
        appUsername: 'johndoe123',
        notes: 'Sample account for template',
        nickname: 'My Main Account'
    }];
    
    // Use only import-relevant fields
    const importFields: (keyof AccountInterface)[] = [
        'holderName',
        'accountNumber',
        'branchCode',
        'bankName',
        'branchName',
        'bankAddress',
        'accountType',
        'mobileNumbers',
        'branchContacts',
        'swift',
        'bankEmail',
        'accountOpeningDate',
        'securityQuestion',
        'balance',
        'appUsername',
        'notes',
        'nickname'
    ];
    
    return exportToCSV(templateData as AccountInterface[], {
        filename: 'account_import_template',
        fields: importFields,
        headers: importFields.map(field => ACCOUNT_HEADER_NAMES[field]),
        formatter: formatAccountField,
        includeBOM: true,
        validate: false // Template data doesn't need validation
    });
}
