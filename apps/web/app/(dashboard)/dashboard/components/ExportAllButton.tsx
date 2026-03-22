"use client";

import { useState } from 'react';
import { exportAccountsToCSV } from '../../../utils/csvExport';
import { exportDebtsToCSV, exportDebtRepaymentsToCSV } from '../../../utils/csvExportDebts';
import { exportExpensesToCSV } from '../../../utils/csvExportExpenses';
import { exportIncomesToCSV } from '../../../utils/csvExportIncomes';
import { exportInvestmentsToCSV } from '../../../utils/csvExportInvestments';
import { exportInvestmentTargetsToCSV } from '../../../utils/csvExportInvestmentTargets';
import { exportPasswordsToCSV } from '../../../utils/csvExportPasswords';
import { exportCategoriesToCsv } from '../../../utils/csvExportCategories';
import { exportNetWorthToCSV } from '../../../utils/csvExportNetworth';
import { getUserAccounts } from '../../accounts/actions/accounts';
import { getUserDebts, getUserDebtRepayments } from '../../debts/actions/debts';
import { getExpenses } from '../../expenses/actions/expenses';
import { getIncomes } from '../../incomes/actions/incomes';
import { getUserInvestments } from '../../investments/actions/investments';
import { getInvestmentTargetProgress } from '../../investments/actions/investment-targets';
import { getPasswords } from '../../passwords/actions/passwords';
import { getCategories } from '../../../actions/categories';
import { useOptimizedWorth } from '../../../hooks/useOptimizedWorth';
import { SUPPLEMENTAL_EXPORT_PIECES } from '../../../actions/supplemental-export-pieces.shared';
import { fetchSupplementalExportPiece } from '../../../actions/supplemental-export-pieces';
import { downloadCSVFile } from '../../../utils/csv/csvExportCore';
import { sanitizeExportDateStrForFilename } from '../../../utils/exportFilename';

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ExportAllButton() {
    const [isExporting, setIsExporting] = useState(false);
    const { netWorthStats } = useOptimizedWorth();

    const handleExportAll = async () => {
        try {
            setIsExporting(true);

            // Every server action below resolves the user from the session only (no client-supplied user id).
            // Rows are always scoped with where: { userId } (or equivalent) on the server.
            // Fetch logged-in user's data
            const accountsResponse = await getUserAccounts();
            const accounts = Array.isArray(accountsResponse) ? accountsResponse : [];
            const debtsResponse = await getUserDebts();
            const debtRepayments = await getUserDebtRepayments();
            const expenses = await getExpenses();
            const incomes = await getIncomes();
            const investmentsResponse = await getUserInvestments();
            const investmentTargetsResponse = await getInvestmentTargetProgress();
            const passwords = await getPasswords();
            const allCategories = await getCategories();
            const incomeCategories = await getCategories('INCOME');
            const expenseCategories = await getCategories('EXPENSE');

            // Extract data from responses
            const debts = debtsResponse.data || [];
            const investments = investmentsResponse.data || [];
            const investmentTargets = investmentTargetsResponse.data || [];

            const dateStr = sanitizeExportDateStrForFilename(
                new Date().toISOString().slice(0, 10)
            );

            const supplementalFailures: string[] = [];
            for (const piece of SUPPLEMENTAL_EXPORT_PIECES) {
                const res = await fetchSupplementalExportPiece(piece, dateStr);
                if ('csv' in res) {
                    downloadCSVFile(res.csv, res.filename);
                    await delay(160);
                } else {
                    supplementalFailures.push(`${piece}: ${res.error}`);
                }
            }
            if (supplementalFailures.length > 0) {
                console.warn('Some supplemental exports failed:', supplementalFailures);
            }

            // Export each type of data (stagger downloads so the browser does not block them)
            if (accounts.length > 0) {
                exportAccountsToCSV(accounts, `accounts_${dateStr}.csv`);
                await delay(160);
            }
            if (debts.length > 0) {
                exportDebtsToCSV(debts, `debts_${dateStr}.csv`);
                await delay(160);
            }
            if (debtRepayments.length > 0) {
                exportDebtRepaymentsToCSV(debtRepayments, `debt_repayments_${dateStr}.csv`);
                await delay(160);
            }
            if (expenses.length > 0) {
                exportExpensesToCSV(expenses, `expenses_${dateStr}.csv`);
                await delay(160);
            }
            if (incomes.length > 0) {
                exportIncomesToCSV(incomes, `incomes_${dateStr}.csv`);
                await delay(160);
            }
            if (investments.length > 0) {
                exportInvestmentsToCSV(investments, `investments_${dateStr}.csv`);
                await delay(160);
            }
            if (investmentTargets.length > 0) {
                exportInvestmentTargetsToCSV(investmentTargets, `investment_targets_${dateStr}.csv`);
                await delay(160);
            }
            if (passwords.length > 0) {
                exportPasswordsToCSV(passwords, `passwords_${dateStr}.csv`);
                await delay(160);
            }
            if (allCategories.length > 0) {
                exportCategoriesToCsv(allCategories, `all_categories_${dateStr}.csv`);
                await delay(160);
            }
            if (incomeCategories.length > 0) {
                exportCategoriesToCsv(incomeCategories, `income_categories_${dateStr}.csv`);
                await delay(160);
            }
            if (expenseCategories.length > 0) {
                exportCategoriesToCsv(expenseCategories, `expense_categories_${dateStr}.csv`);
                await delay(160);
            }
            
            // Export net worth data
            if (netWorthStats) {
                const netWorthData = {
                    ...netWorthStats,
                    exportDate: new Date()
                };
                exportNetWorthToCSV(netWorthData, `networth_${dateStr}.csv`);
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Failed to export some data. Please check the console for details and try again.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={handleExportAll}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isExporting ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting...
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export All Data
                </>
            )}
        </button>
    );
} 