import { DebtInterface } from '../types/debts';

/**
 * Convert debts data to CSV format
 */
export function convertDebtsToCSV(debts: DebtInterface[]): string {
    if (debts.length === 0) {
        return '';
    }

    // Define CSV headers
    const headers = [
        'ID',
        'Borrower Name',
        'Borrower Contact',
        'Borrower Email',
        'Amount',
        'Interest Rate (%)',
        'Interest Amount',
        'Total Amount Due',
        'Amount Repaid',
        'Outstanding Amount',
        'Lent Date',
        'Due Date',
        'Status',
        'Purpose',
        'Notes',
        'Account',
        'Bank Name',
        'Account Number',
        'Repayments Count',
        'Created At',
        'Updated At'
    ];

    // Convert data to CSV rows
    const rows = debts.map(debt => {
        const interestAmount = (debt.amount * debt.interestRate) / 100;
        const totalAmountDue = debt.amount + interestAmount;
        const amountRepaid = debt.repayments?.reduce((sum, repayment) => sum + repayment.amount, 0) || 0;
        const outstandingAmount = totalAmountDue - amountRepaid;

        return [
            debt.id.toString(),
            debt.borrowerName,
            debt.borrowerContact || '',
            debt.borrowerEmail || '',
            debt.amount.toString(),
            debt.interestRate.toString(),
            interestAmount.toString(),
            totalAmountDue.toString(),
            amountRepaid.toString(),
            outstandingAmount.toString(),
            debt.lentDate.toISOString().split('T')[0], // YYYY-MM-DD format
            debt.dueDate?.toISOString().split('T')[0] || '',
            debt.status,
            debt.purpose || '',
            debt.notes || '',
            debt.accountId ? 'Yes' : 'No', // Simplified for CSV
            '', // Bank name would need account data
            '', // Account number would need account data
            debt.repayments?.length.toString() || '0',
            debt.createdAt.toISOString(),
            debt.updatedAt.toISOString()
        ];
    });

    // Combine headers and rows
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');

    return csvContent;
}

/**
 * Download debts data as CSV file
 */
export function exportDebtsToCSV(debts: DebtInterface[], filename?: string): void {
    const csvContent = convertDebtsToCSV(debts);
    
    if (!csvContent) {
        alert('No debt data to export');
        return;
    }

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename || `debts_${new Date().toISOString().split('T')[0]}.csv`);
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
export function getDebtExportStats(debts: DebtInterface[]): {
    totalDebts: number;
    totalAmount: number;
    totalAmountDue: number;
    totalAmountRepaid: number;
    totalOutstanding: number;
    dateRange: { start: Date | null; end: Date | null };
    statusCounts: Record<string, number>;
    averageInterestRate: number;
} {
    if (debts.length === 0) {
        return {
            totalDebts: 0,
            totalAmount: 0,
            totalAmountDue: 0,
            totalAmountRepaid: 0,
            totalOutstanding: 0,
            dateRange: { start: null, end: null },
            statusCounts: {},
            averageInterestRate: 0
        };
    }

    const totalAmount = debts.reduce((sum, debt) => sum + debt.amount, 0);
    const totalAmountDue = debts.reduce((sum, debt) => {
        const interestAmount = (debt.amount * debt.interestRate) / 100;
        return sum + debt.amount + interestAmount;
    }, 0);
    const totalAmountRepaid = debts.reduce((sum, debt) => {
        return sum + (debt.repayments?.reduce((repaySum, repayment) => repaySum + repayment.amount, 0) || 0);
    }, 0);
    const totalOutstanding = totalAmountDue - totalAmountRepaid;
    
    const dates = debts.map(debt => debt.lentDate).sort((a, b) => a.getTime() - b.getTime());
    const statusCounts = debts.reduce((counts, debt) => {
        counts[debt.status] = (counts[debt.status] || 0) + 1;
        return counts;
    }, {} as Record<string, number>);
    
    const averageInterestRate = debts.reduce((sum, debt) => sum + debt.interestRate, 0) / debts.length;

    return {
        totalDebts: debts.length,
        totalAmount,
        totalAmountDue,
        totalAmountRepaid,
        totalOutstanding,
        dateRange: { 
            start: dates[0] || null, 
            end: dates[dates.length - 1] || null 
        },
        statusCounts,
        averageInterestRate
    };
} 