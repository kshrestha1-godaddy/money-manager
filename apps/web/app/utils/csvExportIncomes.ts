import { Income } from '../types/financial';

/**
 * Convert incomes data to CSV format
 */
export function convertIncomesToCSV(incomes: Income[]): string {
    if (incomes.length === 0) {
        return '';
    }

    // Define CSV headers
    const headers = [
        'ID',
        'Title',
        'Description',
        'Amount',
        'Date',
        'Category',
        'Category Color',
        'Account',
        'Bank Name',
        'Account Type',
        'Account Number',
        'Tags',
        'Notes',
        'Is Recurring',
        'Recurring Frequency',
        'Created At',
        'Updated At'
    ];

    // Convert data to CSV rows
    const rows = incomes.map(income => [
        income.id.toString(),
        income.title,
        income.description || '',
        income.amount.toString(),
        income.date.toISOString().split('T')[0], // YYYY-MM-DD format
        income.category.name,
        income.category.color,
        income.account ? `${income.account.holderName} - ${income.account.bankName}` : '',
        income.account?.bankName || '',
        income.account?.accountType || '',
        income.account?.accountNumber || '',
        income.tags.join('; '), // Join multiple tags with semicolon
        income.notes || '',
        income.isRecurring ? 'Yes' : 'No',
        income.recurringFrequency || '',
        income.createdAt.toISOString(),
        income.updatedAt.toISOString()
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');

    return csvContent;
}

/**
 * Download incomes data as CSV file
 */
export function exportIncomesToCSV(incomes: Income[], filename?: string): void {
    const csvContent = convertIncomesToCSV(incomes);
    
    if (!csvContent) {
        alert('No income data to export');
        return;
    }

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename || `incomes_${new Date().toISOString().split('T')[0]}.csv`);
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
export function getIncomeExportStats(incomes: Income[]): {
    totalIncomes: number;
    totalAmount: number;
    dateRange: { start: Date | null; end: Date | null };
    categoriesCount: number;
    accountsCount: number;
} {
    if (incomes.length === 0) {
        return {
            totalIncomes: 0,
            totalAmount: 0,
            dateRange: { start: null, end: null },
            categoriesCount: 0,
            accountsCount: 0
        };
    }

    const totalAmount = incomes.reduce((sum, income) => sum + income.amount, 0);
    const dates = incomes.map(income => income.date).sort((a, b) => a.getTime() - b.getTime());
    const uniqueCategories = new Set(incomes.map(income => income.category.id));
    const uniqueAccounts = new Set(incomes.map(income => income.account?.id).filter(Boolean));

    return {
        totalIncomes: incomes.length,
        totalAmount,
        dateRange: { 
            start: dates[0] || null, 
            end: dates[dates.length - 1] || null 
        },
        categoriesCount: uniqueCategories.size,
        accountsCount: uniqueAccounts.size
    };
} 