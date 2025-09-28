import { generateTimestampedFilename } from './csv/csvExportCore';

/**
 * Download a CSV template for budget targets import
 */
export function downloadBudgetTargetsImportTemplate(): void {
    const headers = [
        'Category Name',
        'Category Type',
        'Target Amount',
        'Period',
        'Start Date',
        'End Date'
    ];

    const sampleData = [
        ['Emergency Funds', 'EXPENSE', '5000.00', 'MONTHLY', '2025-01-01', '2025-01-31'],
        ['BOSCH Salary', 'INCOME', '75000.00', 'MONTHLY', '2025-01-01', '2025-01-31'],
        ['Food (Restaurants, Orders)', 'EXPENSE', '3000.00', 'MONTHLY', '2025-01-01', '2025-01-31'],
        ['Family', 'EXPENSE', '20000.00', 'MONTHLY', '2025-01-01', '2025-01-31'],
        ['DevSquare - Shankar K.', 'INCOME', '100000.00', 'MONTHLY', '2025-01-01', '2025-01-31']
    ];

    // Combine headers and sample data
    const allRows = [headers, ...sampleData];
    
    // Convert to CSV string
    const csvContent = allRows.map(row => 
        row.map(cell => {
            const stringCell = String(cell);
            // Escape quotes and wrap in quotes if necessary
            if (stringCell.includes(',') || 
                stringCell.includes('"') || 
                stringCell.includes('\n') || 
                stringCell.includes('\r')) {
                return `"${stringCell.replace(/"/g, '""')}"`;
            }
            return stringCell;
        }).join(',')
    ).join('\n');

    // Create blob and download
    const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;'
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const filename = generateTimestampedFilename('budget_targets_template');
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Get the required fields for budget targets import
 */
export function getBudgetTargetsImportRequiredFields(): string[] {
    return ['Category Name', 'Category Type', 'Target Amount', 'Period'];
}

/**
 * Get the optional fields for budget targets import
 */
export function getBudgetTargetsImportOptionalFields(): string[] {
    return ['Start Date', 'End Date'];
}
