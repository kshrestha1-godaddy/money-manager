import { InvestmentInterface } from '../types/investments';
import { formatDateForCSV } from './csvUtils';
import { convertForDisplaySync } from './currencyDisplay';

function csvQuoteCell(value: string | number | undefined | null): string {
    const s = String(value ?? "");
    return `"${s.replace(/"/g, '""')}"`;
}

function formatAmountCsvPlain(n: number): string {
    return (Math.round(n * 100) / 100).toFixed(2);
}

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
            formatDateForCSV(investment.purchaseDate),
            investment.account ? `${investment.account.holderName} - ${investment.account.bankName}` : '',
            investment.account?.bankName || '',
            investment.account?.accountNumber || '',
            investment.interestRate?.toString() || '',
            investment.maturityDate ? formatDateForCSV(investment.maturityDate) : '',
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
 * Same columns as {@link convertInvestmentsToCSV}, with monetary fields converted to `displayCurrency`.
 * Amounts in the app are stored in `storedCurrency` (user profile currency).
 */
export function convertInvestmentsToCSVWithDisplayCurrency(
    investments: InvestmentInterface[],
    storedCurrency: string,
    displayCurrency: string
): string {
    if (investments.length === 0) {
        return "";
    }

    const stored = (storedCurrency || "USD").trim();
    const display = (displayCurrency || stored).trim();
    const dc = display.toUpperCase();
    const sc = stored.toUpperCase();

    const headers = [
        "ID",
        "Name",
        "Type",
        "Symbol",
        "Quantity",
        `Purchase Price (per unit, ${dc})`,
        `Current Price (per unit, ${dc})`,
        `Total Value (${dc})`,
        `Gain/Loss (${dc})`,
        "Gain/Loss %",
        "Purchase Date",
        "Account",
        "Bank Name",
        "Account Number",
        "Interest Rate",
        "Maturity Date",
        "Notes",
        "Created At",
        "Updated At",
        `Conversion note`,
    ];

    const lines: string[][] = [headers];

    investments.forEach((investment) => {
        const pp = convertForDisplaySync(investment.purchasePrice, stored, display);
        const cp = convertForDisplaySync(investment.currentPrice, stored, display);
        const totalValue = convertForDisplaySync(
            investment.quantity * investment.currentPrice,
            stored,
            display
        );
        const totalPurchaseValue = convertForDisplaySync(
            investment.quantity * investment.purchasePrice,
            stored,
            display
        );
        const gainLoss = totalValue - totalPurchaseValue;
        const gainLossPercentage =
            totalPurchaseValue !== 0 ? (gainLoss / totalPurchaseValue) * 100 : 0;

        lines.push([
            investment.id.toString(),
            investment.name,
            investment.type,
            investment.symbol || "",
            investment.quantity.toString(),
            formatAmountCsvPlain(pp),
            formatAmountCsvPlain(cp),
            formatAmountCsvPlain(totalValue),
            formatAmountCsvPlain(gainLoss),
            gainLossPercentage.toFixed(2) + "%",
            formatDateForCSV(investment.purchaseDate),
            investment.account
                ? `${investment.account.holderName} - ${investment.account.bankName}`
                : "",
            investment.account?.bankName || "",
            investment.account?.accountNumber || "",
            investment.interestRate?.toString() || "",
            investment.maturityDate ? formatDateForCSV(investment.maturityDate) : "",
            investment.notes || "",
            investment.createdAt.toISOString(),
            investment.updatedAt.toISOString(),
            sc === dc ? "Native currency" : `Converted from ${sc} to ${dc}`,
        ]);
    });

    return lines.map((line) => line.map((cell) => csvQuoteCell(cell)).join(",")).join("\r\n");
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
 * Download investments CSV with amounts shown in the chosen display currency.
 */
export function exportInvestmentsToCSVWithDisplayCurrency(
    investments: InvestmentInterface[],
    storedCurrency: string,
    displayCurrency: string,
    filename?: string
): void {
    const csvContent = convertInvestmentsToCSVWithDisplayCurrency(
        investments,
        storedCurrency,
        displayCurrency
    );

    if (!csvContent) {
        alert("No investment data to export");
        return;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const dc = (displayCurrency || "USD").trim().toUpperCase();
        const date = new Date().toISOString().split("T")[0];
        link.setAttribute("href", url);
        link.setAttribute(
            "download",
            filename || `investments_${date}_${dc}.csv`
        );
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        const csvData = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
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