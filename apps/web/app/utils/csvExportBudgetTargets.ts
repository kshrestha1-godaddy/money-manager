import { BudgetTarget } from '../types/financial';
import { generateTimestampedFilename } from './csv/csvExportCore';
import { formatDateForExport, formatTimestampForExport } from './csvExportUtils';

/**
 * Convert budget targets data to CSV format
 */
export function convertBudgetTargetsToCSV(budgetTargets: (BudgetTarget & { categoryType?: string })[]): string {
    if (!budgetTargets || budgetTargets.length === 0) {
        return 'No budget targets to export';
    }

    const headers = [
        'ID',
        'Category Name',
        'Category Type',
        'Target Amount',
        'Current Amount',
        'Period',
        'Start Date',
        'End Date',
        'Status',
        'Progress (%)',
        'Variance',
        'Created At',
        'Updated At'
    ];

    const rows = budgetTargets.map(target => {
        const progress = target.targetAmount > 0 ? 
            ((target.currentAmount / target.targetAmount) * 100).toFixed(2) : '0.00';
        const variance = target.currentAmount - target.targetAmount;
        const status = target.isActive ? 'Active' : 'Inactive';

        return [
            target.id.toString(),
            target.name,
            target.categoryType || 'UNKNOWN',
            target.targetAmount.toFixed(2),
            target.currentAmount.toFixed(2),
            target.period,
            formatDateForExport(target.startDate),
            formatDateForExport(target.endDate),
            status,
            progress,
            variance.toFixed(2),
            formatTimestampForExport(target.createdAt),
            formatTimestampForExport(target.updatedAt)
        ];
    });

    // Combine headers and data rows
    const allRows = [headers, ...rows];
    
    // Convert to CSV string
    return allRows.map(row => 
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
}

/**
 * Export budget targets to CSV file
 */
export function exportBudgetTargetsToCSV(budgetTargets: (BudgetTarget & { categoryType?: string })[], filename?: string): void {
    try {
        if (!budgetTargets || budgetTargets.length === 0) {
            alert('No budget targets to export');
            return;
        }

        const csvContent = convertBudgetTargetsToCSV(budgetTargets);
        const csvFilename = filename || generateTimestampedFilename('budget_targets');
        
        // Create blob and download
        const blob = new Blob(['\uFEFF' + csvContent], {
            type: 'text/csv;charset=utf-8;'
        });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', csvFilename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Error exporting budget targets to CSV:', error);
        if (error instanceof Error) {
            alert(`Export failed: ${error.message}`);
        } else {
            alert('Failed to export budget targets. Please try again.');
        }
    }
}

/**
 * Get export statistics for budget targets
 */
export function getBudgetTargetExportStats(budgetTargets: (BudgetTarget & { categoryType?: string })[]): {
    totalTargets: number;
    activeTargets: number;
    totalTargetAmount: number;
    totalCurrentAmount: number;
    averageProgress: number;
    periodsCount: { [key: string]: number };
} {
    if (!budgetTargets || budgetTargets.length === 0) {
        return {
            totalTargets: 0,
            activeTargets: 0,
            totalTargetAmount: 0,
            totalCurrentAmount: 0,
            averageProgress: 0,
            periodsCount: {}
        };
    }

    const activeTargets = budgetTargets.filter(target => target.isActive);
    const totalTargetAmount = budgetTargets.reduce((sum, target) => sum + target.targetAmount, 0);
    const totalCurrentAmount = budgetTargets.reduce((sum, target) => sum + target.currentAmount, 0);
    
    const progressValues = budgetTargets
        .filter(target => target.targetAmount > 0)
        .map(target => (target.currentAmount / target.targetAmount) * 100);
    const averageProgress = progressValues.length > 0 ? 
        progressValues.reduce((sum, progress) => sum + progress, 0) / progressValues.length : 0;

    const periodsCount = budgetTargets.reduce((acc, target) => {
        acc[target.period] = (acc[target.period] || 0) + 1;
        return acc;
    }, {} as { [key: string]: number });

    return {
        totalTargets: budgetTargets.length,
        activeTargets: activeTargets.length,
        totalTargetAmount,
        totalCurrentAmount,
        averageProgress,
        periodsCount
    };
}
