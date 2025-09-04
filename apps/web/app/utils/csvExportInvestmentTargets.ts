import { InvestmentTargetProgress } from '../types/investments';
import { formatDateForCSV } from './csvUtils';

/**
 * Convert investment targets progress data to CSV format
 */
export function convertInvestmentTargetsToCSV(targets: InvestmentTargetProgress[]): string {
    if (targets.length === 0) {
        return '';
    }

    // Define CSV headers
    const headers = [
        'Investment Type',
        'Nickname',
        'Target Amount',
        'Current Amount',
        'Progress (%)',
        'Remaining Amount',
        'Target Completion Date',
        'Days Remaining',
        'Status',
        'Is Complete',
        'Is Overdue'
    ];

    // Convert data to CSV rows
    const rows = targets.map(target => {
        const remainingAmount = Math.max(0, target.targetAmount - target.currentAmount);
        const status = target.isComplete 
            ? 'Complete' 
            : target.isOverdue 
                ? 'Overdue' 
                : 'In Progress';

        return [
            target.investmentType,
            target.nickname || '',
            target.targetAmount.toString(),
            target.currentAmount.toString(),
            target.progress.toFixed(2),
            remainingAmount.toString(),
            target.targetCompletionDate ? formatDateForCSV(target.targetCompletionDate) : '',
            target.daysRemaining?.toString() || '',
            status,
            target.isComplete ? 'Yes' : 'No',
            target.isOverdue ? 'Yes' : 'No'
        ];
    });

    // Combine headers and rows
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');

    return csvContent;
}

/**
 * Download investment targets progress data as CSV file
 */
export function exportInvestmentTargetsToCSV(targets: InvestmentTargetProgress[], filename?: string): void {
    const csvContent = convertInvestmentTargetsToCSV(targets);
    
    if (!csvContent) {
        alert('No investment target data to export');
        return;
    }

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename || `investment_targets_${new Date().toISOString().split('T')[0]}.csv`);
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
 * Get export statistics for investment targets
 */
export function getInvestmentTargetsExportStats(targets: InvestmentTargetProgress[]): {
    totalTargets: number;
    completedTargets: number;
    totalTargetAmount: number;
    totalCurrentAmount: number;
    totalRemainingAmount: number;
    averageProgress: number;
    overdueTargets: number;
    targetsWithDeadlines: number;
} {
    if (targets.length === 0) {
        return {
            totalTargets: 0,
            completedTargets: 0,
            totalTargetAmount: 0,
            totalCurrentAmount: 0,
            totalRemainingAmount: 0,
            averageProgress: 0,
            overdueTargets: 0,
            targetsWithDeadlines: 0
        };
    }

    const completedTargets = targets.filter(target => target.isComplete).length;
    const overdueTargets = targets.filter(target => target.isOverdue).length;
    const targetsWithDeadlines = targets.filter(target => target.targetCompletionDate).length;
    
    const totalTargetAmount = targets.reduce((sum, target) => sum + target.targetAmount, 0);
    const totalCurrentAmount = targets.reduce((sum, target) => sum + target.currentAmount, 0);
    const totalRemainingAmount = targets.reduce((sum, target) => 
        sum + Math.max(0, target.targetAmount - target.currentAmount), 0);
    
    const averageProgress = targets.reduce((sum, target) => sum + target.progress, 0) / targets.length;

    return {
        totalTargets: targets.length,
        completedTargets,
        totalTargetAmount,
        totalCurrentAmount,
        totalRemainingAmount,
        averageProgress: Number(averageProgress.toFixed(2)),
        overdueTargets,
        targetsWithDeadlines
    };
}
