import { Expense } from '../types/financial';

/**
 * Convert expenses data to CSV format
 */
export function convertExpensesToCSV(expenses: Expense[]): string {
    if (expenses.length === 0) {
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
        'Receipt',
        'Notes',
        'Is Recurring',
        'Recurring Frequency',
        'Created At',
        'Updated At'
    ];

    // Convert data to CSV rows
    const rows = expenses.map(expense => [
        expense.id.toString(),
        expense.title,
        expense.description || '',
        expense.amount.toString(),
        expense.date.toISOString().split('T')[0], // YYYY-MM-DD format
        expense.category.name,
        expense.category.color,
        expense.account ? `${expense.account.holderName} - ${expense.account.bankName}` : '',
        expense.account?.bankName || '',
        expense.account?.accountType || '',
        expense.account?.accountNumber || '',
        expense.tags.join('; '), // Join multiple tags with semicolon
        expense.receipt || '',
        expense.notes || '',
        expense.isRecurring ? 'Yes' : 'No',
        expense.recurringFrequency || '',
        expense.createdAt.toISOString(),
        expense.updatedAt.toISOString()
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');

    return csvContent;
}

/**
 * Download expenses data as CSV file
 */
export function exportExpensesToCSV(expenses: Expense[], filename?: string): void {
    const csvContent = convertExpensesToCSV(expenses);
    
    if (!csvContent) {
        alert('No expense data to export');
        return;
    }

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename || `expenses_${new Date().toISOString().split('T')[0]}.csv`);
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
export function getExpenseExportStats(expenses: Expense[]): {
    totalExpenses: number;
    totalAmount: number;
    dateRange: { start: Date | null; end: Date | null };
    categoriesCount: number;
    accountsCount: number;
} {
    if (expenses.length === 0) {
        return {
            totalExpenses: 0,
            totalAmount: 0,
            dateRange: { start: null, end: null },
            categoriesCount: 0,
            accountsCount: 0
        };
    }

    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const dates = expenses.map(expense => expense.date).sort((a, b) => a.getTime() - b.getTime());
    const uniqueCategories = new Set(expenses.map(expense => expense.category.id));
    const uniqueAccounts = new Set(expenses.map(expense => expense.account?.id).filter(Boolean));

    return {
        totalExpenses: expenses.length,
        totalAmount,
        dateRange: { 
            start: dates[0] || null, 
            end: dates[dates.length - 1] || null 
        },
        categoriesCount: uniqueCategories.size,
        accountsCount: uniqueAccounts.size
    };
} 