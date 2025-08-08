import { AccountInterface } from '../types/accounts';
import { formatDateForCSV } from './csvUtils';

/**
 * Convert accounts data to CSV format
 */
export function convertAccountsToCSV(accounts: AccountInterface[]): string {
    if (accounts.length === 0) {
        return '';
    }

    // Define CSV headers (excluding sensitive information like passwords)
    const headers = [
        'ID',
        'Holder Name',
        'Account Number',
        'Branch Code',
        'Bank Name',
        'Branch Name',
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
        'Nickname',
        'Created At',
        'Updated At'
    ];

    // Convert accounts to CSV rows
    const csvRows = accounts.map(account => [
        account.id.toString(),
        account.holderName,
        account.accountNumber,
        account.branchCode,
        account.bankName,
        account.branchName,
        account.bankAddress,
        account.accountType,
        account.mobileNumbers.join('; '),
        account.branchContacts.join('; '),
        account.swift,
        account.bankEmail,
        formatDateForCSV(account.accountOpeningDate),
        account.securityQuestion.join('; '),
        account.balance?.toString() || '0',
        account.appUsername || '',
        account.notes || '',
        account.nickname || '',
        account.createdAt.toISOString(),
        account.updatedAt.toISOString()
    ]);

    // Combine headers and rows
    const allRows = [headers, ...csvRows];

    // Convert to CSV string
    return allRows.map(row => 
        row.map(field => {
            // Escape quotes and wrap in quotes if necessary
            const stringField = String(field);
            if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
        }).join(',')
    ).join('\n');
}

/**
 * Download CSV file to user's device
 */
export function downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

/**
 * Export accounts to CSV file
 */
export function exportAccountsToCSV(accounts: AccountInterface[], filename?: string): void {
    const csvContent = convertAccountsToCSV(accounts);
    if (csvContent) {
        const defaultFilename = `accounts_export_${new Date().toISOString().split('T')[0]}.csv`;
        downloadCSV(csvContent, filename || defaultFilename);
    } else {
        alert('No accounts to export');
    }
} 