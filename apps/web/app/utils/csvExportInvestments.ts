import { InvestmentInterface } from '../types/investments';

/**
 * Convert investments data to CSV format
 */
export function convertInvestmentsToCSV(investments: InvestmentInterface[]): string {
    if (investments.length === 0) {
        return '';
    }

    // Define CSV headers
    const headers = [
        'ID',
        'Name',
        'Type',
        'Symbol',
        'Quantity',
        'Purchase Price',
        'Current Price',
        'Total Value',
        'Gain/Loss',
        'Gain/Loss %',
        'Purchase Date',
        'Account',
        'Bank Name',
        'Account Number',
        'Interest Rate',
        'Maturity Date',
        'Notes',
        'Created At',
        'Updated At'
    ];

    // Convert data to CSV rows
    const rows = investments.map(investment => {
        const totalValue = investment.quantity * investment.currentPrice;
        const totalPurchaseValue = investment.quantity * investment.purchasePrice;
        const gainLoss = totalValue - totalPurchaseValue;
        const gainLossPercentage = totalPurchaseValue !== 0 ? ((gainLoss / totalPurchaseValue) * 100) : 0;

        return [
            investment.id.toString(),
            investment.name,
            investment.type,
            investment.symbol || '',
            investment.quantity.toString(),
            investment.purchasePrice.toString(),
            investment.currentPrice.toString(),
            totalValue.toString(),
            gainLoss.toString(),
            gainLossPercentage.toFixed(2) + '%',
            investment.purchaseDate.toISOString().split('T')[0], // YYYY-MM-DD format
            investment.account ? `${investment.account.holderName} - ${investment.account.bankName}` : '',
            investment.account?.bankName || '',
            investment.account?.accountNumber || '',
            investment.interestRate?.toString() || '',
            investment.maturityDate?.toISOString().split('T')[0] || '',
            investment.notes || '',
            investment.createdAt.toISOString(),
            investment.updatedAt.toISOString()
        ];
    });

    // Combine headers and rows
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');

    return csvContent;
}

/**
 * Download investments data as CSV file
 */
export function exportInvestmentsToCSV(investments: InvestmentInterface[], filename?: string): void {
    const csvContent = convertInvestmentsToCSV(investments);
    
    if (!csvContent) {
        alert('No investment data to export');
        return;
    }

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename || `investments_${new Date().toISOString().split('T')[0]}.csv`);
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
export function getInvestmentExportStats(investments: InvestmentInterface[]): {
    totalInvestments: number;
    totalCurrentValue: number;
    totalPurchaseValue: number;
    totalGainLoss: number;
    dateRange: { start: Date | null; end: Date | null };
    typesCount: number;
    accountsCount: number;
} {
    if (investments.length === 0) {
        return {
            totalInvestments: 0,
            totalCurrentValue: 0,
            totalPurchaseValue: 0,
            totalGainLoss: 0,
            dateRange: { start: null, end: null },
            typesCount: 0,
            accountsCount: 0
        };
    }

    const totalCurrentValue = investments.reduce((sum, investment) => 
        sum + (investment.quantity * investment.currentPrice), 0);
    const totalPurchaseValue = investments.reduce((sum, investment) => 
        sum + (investment.quantity * investment.purchasePrice), 0);
    const totalGainLoss = totalCurrentValue - totalPurchaseValue;
    
    const dates = investments.map(investment => investment.purchaseDate).sort((a, b) => a.getTime() - b.getTime());
    const uniqueTypes = new Set(investments.map(investment => investment.type));
    const uniqueAccounts = new Set(investments.map(investment => investment.accountId).filter(Boolean));

    return {
        totalInvestments: investments.length,
        totalCurrentValue,
        totalPurchaseValue,
        totalGainLoss,
        dateRange: { 
            start: dates[0] || null, 
            end: dates[dates.length - 1] || null 
        },
        typesCount: uniqueTypes.size,
        accountsCount: uniqueAccounts.size
    };
} 