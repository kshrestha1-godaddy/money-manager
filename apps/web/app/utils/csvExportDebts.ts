import { DebtInterface, DebtRepaymentInterface } from '../types/debts';

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
 * Convert repayments data to CSV format
 */
export function convertRepaymentsToCSV(repayments: DebtRepaymentInterface[], debtIdMap: Record<number, string>): string {
    if (repayments.length === 0) {
        return '';
    }

    // Define CSV headers
    const headers = [
        'ID',
        'Debt ID',
        'Debt Borrower',
        'Amount',
        'Repayment Date',
        'Notes',
        'Account ID',
        'Created At',
        'Updated At'
    ];

    // Convert data to CSV rows
    const rows = repayments.map(repayment => {
        return [
            repayment.id.toString(),
            repayment.debtId.toString(),
            debtIdMap[repayment.debtId] || '',
            repayment.amount.toString(),
            repayment.repaymentDate.toISOString().split('T')[0], // YYYY-MM-DD format
            repayment.notes || '',
            repayment.accountId?.toString() || '',
            repayment.createdAt.toISOString(),
            repayment.updatedAt.toISOString()
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
    
    // Export repayments if they exist
    const allRepayments: DebtRepaymentInterface[] = [];
    const debtIdToBorrowerMap: Record<number, string> = {};
    
    debts.forEach(debt => {
        debtIdToBorrowerMap[debt.id] = debt.borrowerName;
        if (debt.repayments && debt.repayments.length > 0) {
            allRepayments.push(...debt.repayments);
        }
    });
    
    if (allRepayments.length > 0) {
        const repaymentsCsvContent = convertRepaymentsToCSV(allRepayments, debtIdToBorrowerMap);
        const repaymentsBlob = new Blob([repaymentsCsvContent], { type: 'text/csv;charset=utf-8;' });
        
        // Create a small delay to prevent browser from blocking multiple downloads
        setTimeout(() => {
            const repaymentLink = document.createElement('a');
            if (repaymentLink.download !== undefined) {
                const repaymentUrl = URL.createObjectURL(repaymentsBlob);
                repaymentLink.setAttribute('href', repaymentUrl);
                repaymentLink.setAttribute('download', filename ? filename.replace('.csv', '_repayments.csv') : `debts_repayments_${new Date().toISOString().split('T')[0]}.csv`);
                repaymentLink.style.visibility = 'hidden';
                document.body.appendChild(repaymentLink);
                repaymentLink.click();
                document.body.removeChild(repaymentLink);
                URL.revokeObjectURL(repaymentUrl);
            } else {
                // Fallback for older browsers
                const repaymentsCsvData = 'data:text/csv;charset=utf-8,' + encodeURIComponent(repaymentsCsvContent);
                window.open(repaymentsCsvData);
            }
        }, 500);
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