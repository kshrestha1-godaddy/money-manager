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
        totalBalance: totalAccountBalance
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

    // ==================== LOADING & ERROR STATES ====================

    const loading = accountsLoading || investmentsLoading || debtsLoading || incomesLoading || expensesLoading;
    const error = accountsError || investmentsError || debtsError || incomesError || expensesError;

    // ==================== COMPUTED VALUES ====================

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

    // Money lent calculations using debt data
    const moneyLentStats = useMemo(() => {
        const totalMoneyLent = debts
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
    }, [debts, debtSummary]);

    // Comprehensive net worth statistics
    const netWorthStats = useMemo((): NetWorthStats => {
        const totalAssets = totalAccountBalance + totalInvestmentValue + moneyLentStats.totalMoneyLent;
        const netWorth = totalAssets; // No liabilities in this model

        const savingsRate = monthlyCashFlow.thisMonthIncome > 0 
            ? (monthlyCashFlow.thisMonthNetIncome / monthlyCashFlow.thisMonthIncome) * 100 
            : 0;

        const investmentAllocation = totalAssets > 0 
            ? (totalInvestmentValue / totalAssets) * 100 
            : 0;

        const liquidityRatio = totalAssets > 0
            ? (totalAccountBalance / totalAssets) * 100
            : 0;

        // Monthly growth calculation (simplified)
        const monthlyGrowthRate = monthlyCashFlow.thisMonthIncome > 0
            ? (monthlyCashFlow.thisMonthNetIncome / totalAssets) * 100
            : 0;

        const projectedYearlyGrowth = monthlyGrowthRate * 12;

        return {
            // Asset breakdown
            totalAccountBalance,
            totalInvestmentValue,
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
            
            // Investment performance
            totalInvestmentGain,
            totalInvestmentGainPercentage,
            
            // Debt performance
            totalDebtPrincipal: moneyLentStats.totalDebtPrincipal,
            totalInterestAccrued: moneyLentStats.totalInterestAccrued,
            totalRepaid: moneyLentStats.totalRepaid,
            
            // Growth metrics
            monthlyGrowthRate,
            projectedYearlyGrowth
        };
    }, [
        totalAccountBalance, 
        totalInvestmentValue, 
        moneyLentStats, 
        monthlyCashFlow,
        totalInvestmentGain,
        totalInvestmentGainPercentage
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

        return data.filter(item => item.value > 0);
    }, [netWorthStats]);

    // Section data for detailed breakdowns
    const sections = useMemo((): WorthSection[] => {
        return [
            {
                key: 'accounts',
                title: `Bank Accounts (${accounts.length})`,
                value: netWorthStats.totalAccountBalance,
                percentage: netWorthStats.totalAssets > 0 
                    ? (netWorthStats.totalAccountBalance / netWorthStats.totalAssets) * 100 
                    : 0,
                color: CHART_COLORS.accounts,
                items: accounts,
                expanded: false
            },
            {
                key: 'investments',
                title: `Investments (${investments.length})`,
                value: netWorthStats.totalInvestmentValue,
                percentage: netWorthStats.totalAssets > 0 
                    ? (netWorthStats.totalInvestmentValue / netWorthStats.totalAssets) * 100 
                    : 0,
                color: CHART_COLORS.investments,
                items: investments,
                expanded: false
            },
            {
                key: 'debts',
                title: `Money Lent (${debts.filter(debt => debt.status === 'ACTIVE' || debt.status === 'PARTIALLY_PAID').length})`,
                value: netWorthStats.totalMoneyLent,
                percentage: netWorthStats.totalAssets > 0 
                    ? (netWorthStats.totalMoneyLent / netWorthStats.totalAssets) * 100 
                    : 0,
                color: CHART_COLORS.moneyLent,
                items: debts.filter(debt => {
                    // Show active and partially paid debts
                    return debt.status === 'ACTIVE' || debt.status === 'PARTIALLY_PAID';
                }),
                expanded: false
            }
        ].filter(section => section.value > 0);
    }, [accounts, investments, debts, netWorthStats]);

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
    }, [queryClient]);

    // ==================== RETURN ====================

    return {
        // Data
        netWorthStats,
        chartData,
        sections,
        accounts,
        investments,
        debts,
        incomes,
        expenses,
        
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