"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Income, Expense } from "../../types/financial";
import { AccountInterface } from "../../types/accounts";
import { DebtInterface } from "../../types/debts";
import { InvestmentInterface } from "../../types/investments";
import { getIncomes } from "../../actions/incomes";
import { getExpenses } from "../../actions/expenses";
import { getUserAccounts } from "../../actions/accounts";
import { getUserDebts } from "../../actions/debts";
import { getUserInvestments } from "../../actions/investments";
import { useCurrency } from "../../providers/CurrencyProvider";
import { formatCurrency, getCurrencySymbol } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { calculateRemainingWithInterest } from "../../utils/interestCalculation";
import { useChartExpansion } from "../../utils/chartUtils";
import { ChartControls } from "../../components/ChartControls";

type SectionKey = 'accounts' | 'investments' | 'moneyLent';

interface FinancialData {
    accounts: AccountInterface[];
    investments: InvestmentInterface[];
    debts: DebtInterface[];
    incomes: Income[];
    expenses: Expense[];
}

interface NetWorthStats {
    totalAccountBalance: number;
    totalInvestmentValue: number;
    totalMoneyLent: number;
    totalAssets: number;
    netWorth: number;
    thisMonthIncome: number;
    thisMonthExpenses: number;
    thisMonthNetIncome: number;
    savingsRate: number;
    investmentAllocation: number;
}

// Stable query configuration
const QUERY_CONFIG = {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
} as const;

// Chart colors
const CHART_COLORS = {
    accounts: '#10b981',
    investments: '#3b82f6',
    moneyLent: '#ef4444'
} as const;

export default function NetWorthPage() {
    const session = useSession();
    const { currency } = useCurrency();
    const { isExpanded: isChartExpanded, toggleExpanded: toggleChartExpansion } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
        accounts: false,
        investments: false,
        moneyLent: false
    });

    // Data queries with consistent configuration
    const { data: incomes = [], isLoading: incomesLoading } = useQuery({
        queryKey: ['incomes'],
        queryFn: getIncomes,
        ...QUERY_CONFIG,
    });

    const { data: expenses = [], isLoading: expensesLoading } = useQuery({
        queryKey: ['expenses'],
        queryFn: getExpenses,
        ...QUERY_CONFIG,
    });

    const { data: accounts = [], isLoading: accountsLoading } = useQuery({
        queryKey: ['accounts'],
        queryFn: async () => {
            const result = await getUserAccounts();
            return ('error' in result) ? [] : result;
        },
        ...QUERY_CONFIG,
    });

    const { data: debts = [], isLoading: debtsLoading } = useQuery({
        queryKey: ['debts'],
        queryFn: getUserDebts,
        ...QUERY_CONFIG,
        select: (data) => ('error' in data) ? [] : data.data || []
    });

    const { data: investments = [], isLoading: investmentsLoading } = useQuery({
        queryKey: ['investments'],
        queryFn: getUserInvestments,
        ...QUERY_CONFIG,
        select: (data) => ('error' in data) ? [] : data.data || []
    });

    const loading = incomesLoading || expensesLoading || accountsLoading || debtsLoading || investmentsLoading;

    // Stable section toggle handler
    const toggleSection = useCallback((section: SectionKey) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    }, []);

    // Memoized financial calculations
    const netWorthStats = useMemo((): NetWorthStats => {
        // Calculate assets
        const totalAccountBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
        
        const totalInvestmentValue = investments.reduce((sum, investment) => 
            sum + (investment.quantity * investment.currentPrice), 0
        );
        
        const totalMoneyLent = debts.reduce((sum: number, debt: DebtInterface) => {
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
        
        const totalAssets = totalAccountBalance + totalInvestmentValue + totalMoneyLent;
        const netWorth = totalAssets; // No liabilities in this model

        // Calculate monthly stats
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const thisMonthIncome = incomes
            .filter(income => {
                const incomeDate = income.date instanceof Date ? income.date : new Date(income.date);
                return incomeDate.getMonth() === currentMonth && incomeDate.getFullYear() === currentYear;
            })
            .reduce((sum, income) => sum + income.amount, 0);

        const thisMonthExpenses = expenses
            .filter(expense => {
                const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
                return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
            })
            .reduce((sum, expense) => sum + expense.amount, 0);

        const thisMonthNetIncome = thisMonthIncome - thisMonthExpenses;
        const savingsRate = thisMonthIncome > 0 ? (thisMonthNetIncome / thisMonthIncome) * 100 : 0;
        const investmentAllocation = totalAssets > 0 ? (totalInvestmentValue / totalAssets) * 100 : 0;

        return {
            totalAccountBalance,
            totalInvestmentValue,
            totalMoneyLent,
            totalAssets,
            netWorth,
            thisMonthIncome,
            thisMonthExpenses,
            thisMonthNetIncome,
            savingsRate,
            investmentAllocation
        };
    }, [accounts, investments, debts, incomes, expenses]);

    // Memoized chart data
    const chartData = useMemo(() => [
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
    ], [netWorthStats]);

    // Prepare CSV data for chart controls
    const csvData = useMemo(() => [
        ['Category', 'Amount', 'Percentage'],
        ['Bank Balance', netWorthStats.totalAccountBalance.toString(), `${((netWorthStats.totalAccountBalance / netWorthStats.totalAssets) * 100).toFixed(1)}%`],
        ['Investments', netWorthStats.totalInvestmentValue.toString(), `${((netWorthStats.totalInvestmentValue / netWorthStats.totalAssets) * 100).toFixed(1)}%`],
        ['Money Lent', netWorthStats.totalMoneyLent.toString(), `${((netWorthStats.totalMoneyLent / netWorthStats.totalAssets) * 100).toFixed(1)}%`],
        ['Total Assets', netWorthStats.totalAssets.toString(), '100.0%'],
        ['Net Worth', netWorthStats.netWorth.toString(), ''],
        ['Savings Rate', `${netWorthStats.savingsRate.toFixed(1)}%`, ''],
        ['Investment Allocation', `${netWorthStats.investmentAllocation.toFixed(1)}%`, '']
    ], [netWorthStats]);

    // Memoized outstanding debts
    const outstandingDebts = useMemo(() => {
        return debts.filter(debt => {
            const remainingWithInterest = calculateRemainingWithInterest(
                debt.amount,
                debt.interestRate,
                debt.lentDate,
                debt.dueDate,
                debt.repayments || [],
                new Date(),
                debt.status
            );
            return remainingWithInterest.remainingAmount > 0;
        });
    }, [debts]);

    // Helper functions
    const formatCurrencyAbbreviated = useCallback((amount: number) => {
        if (amount >= 1000000) {
            return `${getCurrencySymbol(currency)}${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
            return `${getCurrencySymbol(currency)}${(amount / 1000).toFixed(1)}K`;
        }
        return formatCurrency(amount, currency);
    }, [currency]);

    // Data label formatter with 3 decimal precision
    const formatDataLabel = useCallback((amount: number) => {
        if (amount >= 1000000) {
            return `${getCurrencySymbol(currency)}${(amount / 1000000).toFixed(3)}M`;
        } else if (amount >= 1000) {
            return `${getCurrencySymbol(currency)}${(amount / 1000).toFixed(3)}K`;
        }
        return formatCurrency(amount, currency);
    }, [currency]);



    const getStatusColor = useCallback((status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-800';
            case 'OVERDUE':
                return 'bg-red-100 text-red-800';
            case 'PAID':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }, []);

    // Loading state
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">Net Worth</h1>
                    <div className="text-sm text-gray-500">
                        Welcome back, {session.data?.user?.name || 'User'}
                    </div>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading net worth data...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-full min-w-0">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Net Worth</h1>
                    <p className="text-gray-600 mt-1">Track your overall financial position</p>
                </div>
                <div className="text-sm text-gray-500">
                    Welcome back, {session.data?.user?.name || 'User'}
                </div>
            </div>

            {/* Net Worth Overview */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-8 text-white">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-2">Total Net Worth</h2>
                    <p className="text-5xl font-bold mb-4">{formatCurrency(netWorthStats.netWorth, currency)}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                        <div className="text-center">
                            <h3 className="text-lg font-medium mb-2">Total Assets</h3>
                            <p className="text-2xl font-semibold text-green-200">{formatCurrency(netWorthStats.totalAssets, currency)}</p>
                            <div className="text-sm text-green-100 mt-1">
                                Accounts: {formatCurrency(netWorthStats.totalAccountBalance, currency)} | 
                                Investments: {formatCurrency(netWorthStats.totalInvestmentValue, currency)} | 
                                Money Lent: {formatCurrency(netWorthStats.totalMoneyLent, currency)}
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-medium mb-2">Total Liabilities</h3>
                            <p className="text-2xl font-semibold text-red-200">{formatCurrency(0, currency)}</p>
                            <div className="text-sm text-red-100 mt-1">
                                Debt-free! 🎉
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Health Indicators */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Health</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-700 mb-2">Savings Rate (This Month)</h4>
                        <p className="text-2xl font-bold text-blue-600">
                            {netWorthStats.savingsRate.toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            {netWorthStats.thisMonthNetIncome >= 0 ? 'You are saving money this month! 🎉' : 'You are spending more than earning this month 📉'}
                        </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-700 mb-2">Asset Allocation</h4>
                        <p className="text-2xl font-bold text-purple-600">
                            {netWorthStats.investmentAllocation.toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            Percentage in investments
                        </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 sm:col-span-2 lg:col-span-1">
                        <h4 className="font-medium text-gray-700 mb-2">Debt to Asset Ratio</h4>
                        <p className="text-2xl font-bold text-green-600">0.0%</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Debt-free! 🎉
                        </p>
                    </div>
                </div>
            </div>

            {/* Asset Breakdown Chart */}
            <div 
                className={`bg-white rounded-lg shadow p-3 sm:p-6 ${isChartExpanded ? 'fixed inset-4 z-50 overflow-auto' : ''}`}
                role="region"
                aria-label="Asset Breakdown Chart"
                data-chart-type="asset-breakdown"
            >
                <ChartControls
                    chartRef={chartRef}
                    isExpanded={isChartExpanded}
                    onToggleExpanded={toggleChartExpansion}
                    fileName="asset-breakdown-chart"
                    csvData={csvData}
                    csvFileName="asset-breakdown-data"
                    title="Asset Breakdown"
                />

                <div 
                    ref={chartRef}
                    className={`${isChartExpanded ? 'h-[60vh] w-full' : 'h-[24rem] sm:h-[32rem] w-full'}`}
                    role="img"
                    aria-label={`Asset breakdown chart showing bank balance of ${formatCurrency(netWorthStats.totalAccountBalance, currency)}, investments of ${formatCurrency(netWorthStats.totalInvestmentValue, currency)}, and money lent of ${formatCurrency(netWorthStats.totalMoneyLent, currency)}`}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 40, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={formatCurrencyAbbreviated} />
                            <Tooltip 
                                formatter={(value: number) => [formatCurrency(value, currency), 'Amount']}
                                labelStyle={{ color: '#374151' }}
                                contentStyle={{ 
                                    backgroundColor: '#f9fafb', 
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px'
                                }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                                <LabelList 
                                    dataKey="value" 
                                    position="top" 
                                    formatter={formatDataLabel}
                                    style={{ 
                                        fill: '#374151',
                                        fontSize: '12px',
                                        fontWeight: '600'
                                    }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                
                {/* Chart Legend */}
                <div className="mt-4 flex justify-center space-x-6">
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Bank Balance</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Investments</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Money Lent</span>
                    </div>
                </div>
            </div>

            {/* Account Breakdown */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div 
                    className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleSection('accounts')}
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Bank Accounts ({accounts.length})
                        </h3>
                        <div className="flex items-center space-x-4">
                            <span className="text-lg font-bold text-green-600">
                                {formatCurrency(netWorthStats.totalAccountBalance, currency)}
                            </span>
                            <svg 
                                className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.accounts ? 'rotate-180' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
                {expandedSections.accounts && (
                    <div className="p-6">
                        {accounts.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-gray-400 text-4xl mb-4">🏦</div>
                                <h4 className="text-lg font-medium text-gray-600 mb-2">No Accounts Found</h4>
                                <p className="text-gray-500">Add your bank accounts to track your net worth accurately.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full">
                                <table className="w-full min-w-0 divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Account Details
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Bank
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Type
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Balance
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {accounts.map((account) => (
                                            <tr key={account.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {account.holderName}
                                                        </div>
                                                        <div className="text-sm text-gray-500 font-mono">
                                                            {account.accountNumber}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{account.bankName}</div>
                                                        <div className="text-sm text-gray-500">{account.branchName}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {account.accountType}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                                    {account.balance !== undefined ? (
                                                        <span className="text-green-600">
                                                            {formatCurrency(account.balance, currency)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Investment Breakdown */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div 
                    className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleSection('investments')}
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Investments ({investments.length})
                        </h3>
                        <div className="flex items-center space-x-4">
                            <span className="text-lg font-bold text-blue-600">
                                {formatCurrency(netWorthStats.totalInvestmentValue, currency)}
                            </span>
                            <svg 
                                className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.investments ? 'rotate-180' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
                {expandedSections.investments && (
                    <div className="p-6">
                        {investments.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-gray-400 text-4xl mb-4">📈</div>
                                <h4 className="text-lg font-medium text-gray-600 mb-2">No Investments Found</h4>
                                <p className="text-gray-500">Add your investments to track your portfolio value.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full">
                                <table className="w-full min-w-0 divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Investment
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Type
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Quantity
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Current Value
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Gain/Loss
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {investments.map((investment) => {
                                            const currentValue = investment.quantity * investment.currentPrice;
                                            const investedValue = investment.quantity * investment.purchasePrice;
                                            const gainLoss = currentValue - investedValue;
                                            const gainLossPercent = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;
                                            
                                            return (
                                                <tr key={investment.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {investment.name}
                                                            </div>
                                                            {investment.symbol && (
                                                                <div className="text-sm text-gray-500">
                                                                    {investment.symbol}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {investment.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                        {investment.quantity.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                                        <span className="text-blue-600">
                                                            {formatCurrency(currentValue, currency)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                                        <span className={gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                            {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss, currency)}
                                                            <div className="text-xs">
                                                                ({gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%)
                                                            </div>
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Money Lent Breakdown */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div 
                    className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleSection('moneyLent')}
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Money Lent ({outstandingDebts.length})
                        </h3>
                        <div className="flex items-center space-x-4">
                            <span className="text-lg font-bold text-red-600">
                                {formatCurrency(netWorthStats.totalMoneyLent, currency)}
                            </span>
                            <svg 
                                className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.moneyLent ? 'rotate-180' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
                {expandedSections.moneyLent && (
                    <div className="p-6">
                        {outstandingDebts.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-gray-400 text-4xl mb-4">💰</div>
                                <h4 className="text-lg font-medium text-gray-600 mb-2">No Outstanding Debts</h4>
                                <p className="text-gray-500">All your loans have been repaid or you haven't lent any money yet.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full">
                                <table className="w-full min-w-0 divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Borrower
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Purpose
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Outstanding
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Due Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {outstandingDebts.map((debt) => {
                                            const remainingWithInterest = calculateRemainingWithInterest(
                                                debt.amount,
                                                debt.interestRate,
                                                debt.lentDate,
                                                debt.dueDate,
                                                debt.repayments || [],
                                                new Date(),
                                                debt.status
                                            );
                                            const remainingAmount = remainingWithInterest.remainingAmount;
                                            const isOverdue = debt.dueDate && new Date(debt.dueDate) < new Date();
                                            
                                            return (
                                                <tr key={debt.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {debt.borrowerName}
                                                            </div>
                                                            {debt.borrowerContact && (
                                                                <div className="text-sm text-gray-500">
                                                                    {debt.borrowerContact}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {debt.purpose || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-red-600">
                                                        {formatCurrency(remainingAmount, currency)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {debt.dueDate ? (
                                                            <span className={isOverdue ? 'text-red-600' : ''}>
                                                                {formatDate(debt.dueDate)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">No due date</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(debt.status)}`}>
                                                            {debt.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
} 