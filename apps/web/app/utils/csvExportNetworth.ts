/**
 * Net Worth CSV Export Utilities
 * Handles exporting net worth data to CSV format
 */

import { formatDateForCSV } from './csvUtils';

interface NetWorthData {
    netWorth: number;
    totalAssets: number;
    totalAccountBalance: number;
    totalInvestmentValue: number;
    totalMoneyLent: number;
    totalDebtPrincipal: number;
    totalInterestAccrued: number;
    totalRepaid: number;
    thisMonthIncome: number;
    thisMonthExpenses: number;
    thisMonthNetIncome: number;
    savingsRate: number;
    investmentAllocation: number;
    liquidityRatio: number;
    monthlyGrowthRate: number;
    projectedYearlyGrowth: number;
    totalInvestmentGain: number;
    totalInvestmentGainPercentage: number;
    exportDate: Date;
}

/**
 * Convert net worth data to CSV format
 */
export function convertNetWorthToCSV(netWorthData: NetWorthData): string {
    // Define CSV headers
    const headers = [
        'Metric',
        'Value',
        'Percentage',
        'Category',
        'Export Date'
    ];

    const exportDateStr = formatDateForCSV(netWorthData.exportDate);

    // Convert data to CSV rows
    const rows = [
        // Core net worth metrics
        ['Total Net Worth', netWorthData.netWorth.toString(), '', 'Net Worth', exportDateStr],
        ['Total Assets', netWorthData.totalAssets.toString(), '', 'Assets', exportDateStr],
        
        // Asset breakdown
        ['Account Balance', netWorthData.totalAccountBalance.toString(), 
         netWorthData.totalAssets > 0 ? ((netWorthData.totalAccountBalance / netWorthData.totalAssets) * 100).toFixed(2) + '%' : '0%', 
         'Assets', exportDateStr],
        ['Investment Value', netWorthData.totalInvestmentValue.toString(), 
         netWorthData.totalAssets > 0 ? ((netWorthData.totalInvestmentValue / netWorthData.totalAssets) * 100).toFixed(2) + '%' : '0%', 
         'Assets', exportDateStr],
        ['Money Lent', netWorthData.totalMoneyLent.toString(), 
         netWorthData.totalAssets > 0 ? ((netWorthData.totalMoneyLent / netWorthData.totalAssets) * 100).toFixed(2) + '%' : '0%', 
         'Assets', exportDateStr],
        
        // Debt information
        ['Total Debt Principal', netWorthData.totalDebtPrincipal.toString(), '', 'Debt', exportDateStr],
        ['Total Interest Accrued', netWorthData.totalInterestAccrued.toString(), '', 'Debt', exportDateStr],
        ['Total Repaid', netWorthData.totalRepaid.toString(), '', 'Debt', exportDateStr],
        
        // Monthly cash flow
        ['This Month Income', netWorthData.thisMonthIncome.toString(), '', 'Cash Flow', exportDateStr],
        ['This Month Expenses', netWorthData.thisMonthExpenses.toString(), '', 'Cash Flow', exportDateStr],
        ['This Month Net Income', netWorthData.thisMonthNetIncome.toString(), '', 'Cash Flow', exportDateStr],
        
        // Financial ratios
        ['Savings Rate', netWorthData.savingsRate.toString(), netWorthData.savingsRate.toFixed(2) + '%', 'Ratios', exportDateStr],
        ['Investment Allocation', netWorthData.investmentAllocation.toString(), netWorthData.investmentAllocation.toFixed(2) + '%', 'Ratios', exportDateStr],
        ['Liquidity Ratio', netWorthData.liquidityRatio.toString(), netWorthData.liquidityRatio.toFixed(2) + '%', 'Ratios', exportDateStr],
        
        // Growth metrics
        ['Monthly Growth Rate', netWorthData.monthlyGrowthRate.toString(), netWorthData.monthlyGrowthRate.toFixed(2) + '%', 'Growth', exportDateStr],
        ['Projected Yearly Growth', netWorthData.projectedYearlyGrowth.toString(), netWorthData.projectedYearlyGrowth.toFixed(2) + '%', 'Growth', exportDateStr],
        
        // Investment performance
        ['Total Investment Gain', netWorthData.totalInvestmentGain.toString(), '', 'Investment Performance', exportDateStr],
        ['Investment Gain Percentage', netWorthData.totalInvestmentGainPercentage.toString(), netWorthData.totalInvestmentGainPercentage.toFixed(2) + '%', 'Investment Performance', exportDateStr]
    ];

    // Combine headers and rows
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');

    return csvContent;
}

/**
 * Download net worth data as CSV file
 */
export function exportNetWorthToCSV(netWorthData: NetWorthData, filename?: string): void {
    const csvContent = convertNetWorthToCSV(netWorthData);
    
    if (!csvContent) {
        alert('No net worth data to export');
        return;
    }

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename || `networth_${new Date().toISOString().split('T')[0]}.csv`);
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
