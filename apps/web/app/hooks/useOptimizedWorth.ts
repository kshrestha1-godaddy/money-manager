"use client";

import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOptimizedAccounts } from './useOptimizedAccounts';
import { useOptimizedDebts } from './useOptimizedDebts';
import { useOptimizedInvestments } from '../(dashboard)/investments/hooks/useOptimizedInvestments';
import { getIncomes } from '../(dashboard)/incomes/actions/incomes';
import { getExpenses } from '../(dashboard)/expenses/actions/expenses';
import { calculateRemainingWithInterest } from '../utils/interestCalculation';
import { convertForDisplaySync } from '../utils/currencyDisplay';
import { useCurrency } from '../providers/CurrencyProvider';
import { getWithheldAmountsByBank } from '../(dashboard)/accounts/actions/accounts';
import { getNetWorthInclusions } from '../actions/net-worth-inclusions';

interface NetWorthStats {
    // Asset breakdown
    totalAccountBalance: number;
    totalInvestmentValue: number;
    totalMoneyLent: number;
    totalAssets: number;
    netWorth: number;
    
    // Monthly cash flow
    thisMonthIncome: number;
    thisMonthExpenses: number;
    thisMonthNetIncome: number;
    
    // Financial health metrics
    savingsRate: number;
    investmentAllocation: number;
    liquidityRatio: number;
    
    // Investment performance
    totalInvestmentGain: number;
    totalInvestmentGainPercentage: number;
    
    // Debt performance
    totalDebtPrincipal: number;
    totalInterestAccrued: number;
    totalRepaid: number;
    
    // Growth metrics
    monthlyGrowthRate: number;
    projectedYearlyGrowth: number;
}

interface WorthSection {
    key: string;
    title: string;
    value: number;
    percentage: number;
    color: string;
    items: any[];
    expanded: boolean;
}

interface ChartDataPoint {
    name: string;
    value: number;
    color: string;
    percentage: string;
}

const CHART_COLORS = {
    accounts: '#10b981',
    investments: '#3b82f6',
    moneyLent: '#ef4444',
    cash: '#8b5cf6'
} as const;

export function useOptimizedWorth() {
    const queryClient = useQueryClient();
    const { currency } = useCurrency();

    // ==================== DATA SOURCES ====================
    
    // Leverage optimized hooks from other tabs
    const {
        accounts,
        loading: accountsLoading,
        error: accountsError,
        freeBalance: totalAccountBalance // Use freeBalance to avoid double-counting withheld amounts
    } = useOptimizedAccounts();

    const {
        investments,
        loading: investmentsLoading,
        error: investmentsError,
        totalInvested,
        totalCurrentValue: totalInvestmentValue,
        totalGainLoss: totalInvestmentGain,
        totalGainLossPercentage: totalInvestmentGainPercentage
    } = useOptimizedInvestments();

    const {
        debts,
        loading: debtsLoading,
        error: debtsError,
        financialSummary: debtSummary
    } = useOptimizedDebts();

    // Income and expense data
    const { 
        data: incomes = [], 
        isLoading: incomesLoading,
        error: incomesError 
    } = useQuery({
        queryKey: ['incomes'],
        queryFn: getIncomes,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000, // 15 minutes
    });

    const { 
        data: expenses = [], 
        isLoading: expensesLoading,
        error: expensesError 
    } = useQuery({
        queryKey: ['expenses'],
        queryFn: getExpenses,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000, // 15 minutes
    });

    // Fetch withheld amounts by bank
    const { data: withheldAmounts = {} } = useQuery({
        queryKey: ['withheld-amounts'],
        queryFn: getWithheldAmountsByBank,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000, // 15 minutes
    });

    // Fetch net worth inclusions
    const { data: inclusionsResponse, isLoading: inclusionsLoading } = useQuery({
        queryKey: ['net-worth-inclusions'],
        queryFn: getNetWorthInclusions,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000, // 15 minutes
    });

    // Create inclusion maps for quick lookups
    const inclusionMaps = useMemo(() => {
        if (!inclusionsResponse?.success || !inclusionsResponse?.data) {
            return {
                accounts: new Map<number, boolean>(),
                investments: new Map<number, boolean>(),
                debts: new Map<number, boolean>(),
            };
        }

        const maps = {
            accounts: new Map<number, boolean>(),
            investments: new Map<number, boolean>(),
            debts: new Map<number, boolean>(),
        };

        inclusionsResponse.data.forEach((inclusion: any) => {
            switch (inclusion.entityType) {
                case 'ACCOUNT':
                    maps.accounts.set(inclusion.entityId, inclusion.includeInNetWorth);
                    break;
                case 'INVESTMENT':
                    maps.investments.set(inclusion.entityId, inclusion.includeInNetWorth);
                    break;
                case 'DEBT':
                    maps.debts.set(inclusion.entityId, inclusion.includeInNetWorth);
                    break;
            }
        });

        return maps;
    }, [inclusionsResponse]);

    // ==================== LOADING & ERROR STATES ====================

    const loading = accountsLoading || investmentsLoading || debtsLoading || incomesLoading || expensesLoading || inclusionsLoading;
    const error = accountsError || investmentsError || debtsError || incomesError || expensesError;

    // ==================== COMPUTED VALUES ====================

    // Filter accounts based on net worth inclusions
    const includedAccounts = useMemo(() => {
        return accounts.filter(account => {
            // If no explicit inclusion exists, default to included (true)
            const isIncluded = inclusionMaps.accounts.get(account.id);
            return isIncluded === undefined ? true : isIncluded;
        });
    }, [accounts, inclusionMaps]);

    // Filter investments based on net worth inclusions
    const includedInvestments = useMemo(() => {
        return investments.filter(investment => {
            // If no explicit inclusion exists, default to included (true)
            const isIncluded = inclusionMaps.investments.get(investment.id);
            return isIncluded === undefined ? true : isIncluded;
        });
    }, [investments, inclusionMaps]);

    // Filter debts based on net worth inclusions
    const includedDebts = useMemo(() => {
        return debts.filter(debt => {
            // If no explicit inclusion exists, default to included (true)
            const isIncluded = inclusionMaps.debts.get(debt.id);
            return isIncluded === undefined ? true : isIncluded;
        });
    }, [debts, inclusionMaps]);

    // Calculate free balances for ALL accounts (excluding withheld amounts)
    // This is used for displaying account balances in the UI
    const allAccountsWithFreeBalance = useMemo(() => {
        if (accounts.length === 0) return [];

        // Group accounts by bank name to calculate proportional withheld amounts
        const bankGroups = new Map<string, typeof accounts>();
        accounts.forEach(account => {
            const bankName = account.bankName;
            if (!bankGroups.has(bankName)) {
                bankGroups.set(bankName, []);
            }
            bankGroups.get(bankName)!.push(account);
        });

        // Calculate free balance for each account
        return accounts.map(account => {
            const bankName = account.bankName;
            const withheldAmountForBank = withheldAmounts[bankName] || 0;
            
            // If there's no withheld amount for this bank, return account as-is
            if (withheldAmountForBank === 0) {
                return account;
            }

            // Calculate total balance for all accounts in this bank
            const accountsInBank = bankGroups.get(bankName) || [];
            const totalBankBalance = accountsInBank.reduce((sum, acc) => sum + (acc.balance || 0), 0);

            // Calculate proportional withheld amount for this account
            const accountProportion = totalBankBalance > 0 ? (account.balance || 0) / totalBankBalance : 0;
            const accountWithheldAmount = withheldAmountForBank * accountProportion;

            // Calculate free balance (ensure non-negative)
            const freeBalance = Math.max(0, (account.balance || 0) - accountWithheldAmount);

            // Return modified account with free balance
            return {
                ...account,
                balance: freeBalance
            };
        });
    }, [accounts, withheldAmounts]);

    // Filter accounts with free balances based on inclusions - for net worth calculations
    const accountsWithFreeBalance = useMemo(() => {
        return allAccountsWithFreeBalance.filter(account => {
            // If no explicit inclusion exists, default to included (true)
            const isIncluded = inclusionMaps.accounts.get(account.id);
            return isIncluded === undefined ? true : isIncluded;
        });
    }, [allAccountsWithFreeBalance, inclusionMaps]);

    // Recalculate total values based on included items
    const includedTotalAccountBalance = useMemo(() => {
        return accountsWithFreeBalance.reduce((sum, account) => sum + (account.balance || 0), 0);
    }, [accountsWithFreeBalance]);

    const includedTotalInvestmentValue = useMemo(() => {
        return includedInvestments.reduce((sum, investment) => {
            return sum + (investment.quantity * investment.currentPrice);
        }, 0);
    }, [includedInvestments]);

    // Calculate investment gain/loss based on included investments only
    const includedInvestmentGainStats = useMemo(() => {
        const totalInvested = includedInvestments.reduce((sum, investment) => {
            return sum + (investment.quantity * investment.purchasePrice);
        }, 0);

        const totalCurrentValue = includedTotalInvestmentValue;
        const totalGain = totalCurrentValue - totalInvested;
        const totalGainPercentage = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

        return {
            totalInvested,
            totalCurrentValue,
            totalGain,
            totalGainPercentage
        };
    }, [includedInvestments, includedTotalInvestmentValue]);

    // Monthly cash flow analysis (with currency conversion)
    const monthlyCashFlow = useMemo(() => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const thisMonthIncome = incomes
            .filter(income => {
                const incomeDate = income.date instanceof Date ? income.date : new Date(income.date);
                return incomeDate.getMonth() === currentMonth && incomeDate.getFullYear() === currentYear;
            })
            .reduce((sum, income) => {
                const convertedAmount = convertForDisplaySync(income.amount, income.currency, currency);
                return sum + convertedAmount;
            }, 0);

        const thisMonthExpenses = expenses
            .filter(expense => {
                const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
                return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
            })
            .reduce((sum, expense) => {
                const convertedAmount = convertForDisplaySync(expense.amount, expense.currency, currency);
                return sum + convertedAmount;
            }, 0);

        const thisMonthNetIncome = thisMonthIncome - thisMonthExpenses;

        return {
            thisMonthIncome,
            thisMonthExpenses,
            thisMonthNetIncome
        };
    }, [incomes, expenses, currency]);

    // Money lent calculations using debt data - using included debts only
    const moneyLentStats = useMemo(() => {
        const totalMoneyLent = includedDebts
            .filter(debt => debt.status === 'ACTIVE' || debt.status === 'PARTIALLY_PAID')
            .reduce((sum, debt) => {
                const remainingWithInterest = calculateRemainingWithInterest(
                    debt.amount,
                    debt.interestRate,
                    debt.lentDate,
                    debt.dueDate,
                    debt.repayments || [],
                    new Date(),
                    debt.status
                );
                return sum + Math.max(0, remainingWithInterest.remainingAmount);
            }, 0);

        return {
            totalMoneyLent,
            totalDebtPrincipal: debtSummary?.totalPrincipal || 0,
            totalInterestAccrued: debtSummary?.totalInterestAccrued || 0,
            totalRepaid: debtSummary?.totalRepaid || 0
        };
    }, [includedDebts, debtSummary]);

    // Comprehensive net worth statistics
    const netWorthStats = useMemo((): NetWorthStats => {
        const totalAssets = includedTotalAccountBalance + includedTotalInvestmentValue + moneyLentStats.totalMoneyLent;
        const netWorth = totalAssets; // No liabilities in this model

        const savingsRate = monthlyCashFlow.thisMonthIncome > 0 
            ? (monthlyCashFlow.thisMonthNetIncome / monthlyCashFlow.thisMonthIncome) * 100 
            : 0;

        const investmentAllocation = totalAssets > 0 
            ? (includedTotalInvestmentValue / totalAssets) * 100 
            : 0;

        const liquidityRatio = totalAssets > 0
            ? (includedTotalAccountBalance / totalAssets) * 100
            : 0;

        // Monthly growth calculation (simplified)
        const monthlyGrowthRate = monthlyCashFlow.thisMonthIncome > 0
            ? (monthlyCashFlow.thisMonthNetIncome / totalAssets) * 100
            : 0;

        const projectedYearlyGrowth = monthlyGrowthRate * 12;

        return {
            // Asset breakdown
            totalAccountBalance: includedTotalAccountBalance,
            totalInvestmentValue: includedTotalInvestmentValue,
            totalMoneyLent: moneyLentStats.totalMoneyLent,
            totalAssets,
            netWorth,
            
            // Monthly cash flow
            thisMonthIncome: monthlyCashFlow.thisMonthIncome,
            thisMonthExpenses: monthlyCashFlow.thisMonthExpenses,
            thisMonthNetIncome: monthlyCashFlow.thisMonthNetIncome,
            
            // Financial health metrics
            savingsRate,
            investmentAllocation,
            liquidityRatio,
            
            // Investment performance (based on included investments only)
            totalInvestmentGain: includedInvestmentGainStats.totalGain,
            totalInvestmentGainPercentage: includedInvestmentGainStats.totalGainPercentage,
            
            // Debt performance
            totalDebtPrincipal: moneyLentStats.totalDebtPrincipal,
            totalInterestAccrued: moneyLentStats.totalInterestAccrued,
            totalRepaid: moneyLentStats.totalRepaid,
            
            // Growth metrics
            monthlyGrowthRate,
            projectedYearlyGrowth
        };
    }, [
        includedTotalAccountBalance, 
        includedTotalInvestmentValue, 
        moneyLentStats, 
        monthlyCashFlow,
        includedInvestmentGainStats
    ]);

    // Chart data for visualizations
    const chartData = useMemo((): ChartDataPoint[] => {
        const data = [
            {
                name: 'Bank Balance',
                value: netWorthStats.totalAccountBalance,
                color: CHART_COLORS.accounts,
                percentage: netWorthStats.totalAssets > 0 
                    ? ((netWorthStats.totalAccountBalance / netWorthStats.totalAssets) * 100).toFixed(1) 
                    : '0'
            },
            {
                name: 'Investments',
                value: netWorthStats.totalInvestmentValue,
                color: CHART_COLORS.investments,
                percentage: netWorthStats.totalAssets > 0 
                    ? ((netWorthStats.totalInvestmentValue / netWorthStats.totalAssets) * 100).toFixed(1) 
                    : '0'
            },
            {
                name: 'Money Lent',
                value: netWorthStats.totalMoneyLent,
                color: CHART_COLORS.moneyLent,
                percentage: netWorthStats.totalAssets > 0 
                    ? ((netWorthStats.totalMoneyLent / netWorthStats.totalAssets) * 100).toFixed(1) 
                    : '0'
            }
        ];

        // Always return all data - don't filter out zero values
        return data;
    }, [netWorthStats]);

    // Section data for detailed breakdowns
    const sections = useMemo((): WorthSection[] => {
        // Calculate total counts (including excluded items)
        const totalAccountsCount = allAccountsWithFreeBalance.length;
        const totalInvestmentsCount = investments.length;
        const totalDebtsCount = debts.filter(debt => debt.status === 'ACTIVE' || debt.status === 'PARTIALLY_PAID').length;
        
        // Calculate included counts
        const includedAccountsCount = accountsWithFreeBalance.length;
        const includedInvestmentsCount = includedInvestments.length;
        const includedDebtsCount = includedDebts.filter(debt => debt.status === 'ACTIVE' || debt.status === 'PARTIALLY_PAID').length;
        
        return [
            {
                key: 'accounts',
                title: `Bank Accounts (${includedAccountsCount}/${totalAccountsCount})`,
                value: netWorthStats.totalAccountBalance,
                percentage: netWorthStats.totalAssets > 0 
                    ? (netWorthStats.totalAccountBalance / netWorthStats.totalAssets) * 100 
                    : 0,
                color: CHART_COLORS.accounts,
                items: accountsWithFreeBalance,
                expanded: false
            },
            {
                key: 'investments',
                title: `Investments (${includedInvestmentsCount}/${totalInvestmentsCount})`,
                value: netWorthStats.totalInvestmentValue,
                percentage: netWorthStats.totalAssets > 0 
                    ? (netWorthStats.totalInvestmentValue / netWorthStats.totalAssets) * 100 
                    : 0,
                color: CHART_COLORS.investments,
                items: includedInvestments,
                expanded: false
            },
            {
                key: 'debts',
                title: `Money Lent (${includedDebtsCount}/${totalDebtsCount})`,
                value: netWorthStats.totalMoneyLent,
                percentage: netWorthStats.totalAssets > 0 
                    ? (netWorthStats.totalMoneyLent / netWorthStats.totalAssets) * 100 
                    : 0,
                color: CHART_COLORS.moneyLent,
                items: includedDebts.filter(debt => {
                    // Show active and partially paid debts
                    return debt.status === 'ACTIVE' || debt.status === 'PARTIALLY_PAID';
                }),
                expanded: false
            }
        ];
        // Removed the filter - always show all sections regardless of value
    }, [accountsWithFreeBalance, includedInvestments, includedDebts, netWorthStats, allAccountsWithFreeBalance, investments, debts]);

    // ==================== EXPORT FUNCTIONALITY ====================

    const exportData = useMemo(() => {
        return [
            ['Metric', 'Value', 'Percentage'],
            ['Bank Balance', netWorthStats.totalAccountBalance.toString(), `${((netWorthStats.totalAccountBalance / netWorthStats.totalAssets) * 100).toFixed(1)}%`],
            ['Investments', netWorthStats.totalInvestmentValue.toString(), `${((netWorthStats.totalInvestmentValue / netWorthStats.totalAssets) * 100).toFixed(1)}%`],
            ['Money Lent', netWorthStats.totalMoneyLent.toString(), `${((netWorthStats.totalMoneyLent / netWorthStats.totalAssets) * 100).toFixed(1)}%`],
            ['Total Assets', netWorthStats.totalAssets.toString(), '100.0%'],
            ['Net Worth', netWorthStats.netWorth.toString(), ''],
            ['Savings Rate', `${netWorthStats.savingsRate.toFixed(1)}%`, ''],
            ['Investment Allocation', `${netWorthStats.investmentAllocation.toFixed(1)}%`, ''],
            ['Liquidity Ratio', `${netWorthStats.liquidityRatio.toFixed(1)}%`, ''],
            ['Monthly Growth Rate', `${netWorthStats.monthlyGrowthRate.toFixed(1)}%`, ''],
            ['Projected Yearly Growth', `${netWorthStats.projectedYearlyGrowth.toFixed(1)}%`, ''],
        ];
    }, [netWorthStats]);

    // ==================== HANDLERS ====================

    const handleExportCSV = useCallback(() => {
        if (exportData.length <= 1) {
            alert("No net worth data to export");
            return;
        }
        
        const csvContent = exportData
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `net_worth_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [exportData]);

    const refreshData = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['investments'] });
        queryClient.invalidateQueries({ queryKey: ['debts'] });
        queryClient.invalidateQueries({ queryKey: ['incomes'] });
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['net-worth-inclusions'] });
    }, [queryClient]);

    // ==================== RETURN ====================

    return {
        // Data
        netWorthStats,
        chartData,
        sections,
        accounts: accountsWithFreeBalance, // Return filtered accounts with free balances
        investments: includedInvestments, // Return filtered investments
        debts: includedDebts, // Return filtered debts
        incomes,
        expenses,
        
        // Raw data (all items, for UI toggle functionality)
        allAccounts: allAccountsWithFreeBalance, // Return ALL accounts with free balances (not just included)
        allInvestments: investments,
        allDebts: debts,
        
        // Inclusion maps for UI state management
        inclusionMaps,
        
        // Loading and error states
        loading,
        error,
        
        // Handlers
        handleExportCSV,
        refreshData,
        
        // Export data
        exportData,
        
        // Chart colors
        chartColors: CHART_COLORS,
    };
} 