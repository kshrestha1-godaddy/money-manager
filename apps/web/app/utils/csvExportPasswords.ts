import { PasswordInterface } from '../types/passwords';
import { formatDateForCSV } from './csvUtils';

/**
 * Convert passwords data to CSV format
 */
export function convertPasswordsToCSV(passwords: PasswordInterface[]): string {
    if (passwords.length === 0) {
        return '';
    }

    // Define CSV headers
    const headers = [
        'ID',
        'Website Name',
        'Description',
        'Username',
        'Password Hash',
        'Transaction PIN Hash',
        'Category',
        'Tags',
        'Validity',
        'Notes',
        'Created At',
        'Updated At'
    ];

    // Convert data to CSV rows - Include password and transaction PIN hashes
    const rows = passwords.map(password => [
        password.id.toString(),
        password.websiteName,
        password.description || '',
        password.username,
        password.passwordHash,
        password.transactionPin || '',
        password.category || '',
        password.tags.join('; '), // Join multiple tags with semicolon
        password.validity ? formatDateForCSV(password.validity) : '',
        password.notes || '',
        password.createdAt.toISOString(),
        password.updatedAt.toISOString()
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');

    return csvContent;
}

/**
 * Download passwords data as CSV file
 */
export function exportPasswordsToCSV(passwords: PasswordInterface[], filename?: string): void {
    const csvContent = convertPasswordsToCSV(passwords);
    
    if (!csvContent) {
        alert('No password data to export');
        return;
    }

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename || `passwords_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        // Fallback for older browsers
        const csvData = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
        window.open(csvData);
    }
}

/**
 * Get export statistics
 */
export function getPasswordExportStats(passwords: PasswordInterface[]): {
    totalPasswords: number;
    validityStats: { valid: number; expired: number; noExpiry: number };
    categoriesCount: number;
} {
    if (passwords.length === 0) {
        return {
            totalPasswords: 0,
            validityStats: { valid: 0, expired: 0, noExpiry: 0 },
            categoriesCount: 0
        };
    }

    const now = new Date();
    const validPasswords = passwords.filter(p => p.validity && p.validity > now).length;
    const expiredPasswords = passwords.filter(p => p.validity && p.validity <= now).length;
    const noExpiryPasswords = passwords.filter(p => !p.validity).length;
    
    const uniqueCategories = new Set(passwords.map(p => p.category).filter(Boolean));

    return {
        totalPasswords: passwords.length,
        validityStats: {
            valid: validPasswords,
            expired: expiredPasswords,
            noExpiry: noExpiryPasswords
        },
        categoriesCount: uniqueCategories.size
    };
} 