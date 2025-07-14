"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, Treemap } from 'recharts';
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
import { ChartControls } from "../../components/ChartControls";
import { useChartExpansion } from "../../utils/chartUtils";
import { calculateRemainingWithInterest } from "../../utils/interestCalculation";

export default function NetWorthPage() {
    const session = useSession();
    const { currency } = useCurrency();
    const [expandedSections, setExpandedSections] = useState({
        accounts: false,
        investments: false,
        moneyLent: false
    });
    const { isExpanded: isChartExpanded, toggleExpanded: toggleChartExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);

    // Query keys for caching
    const QUERY_KEYS = {
        incomes: ['incomes'] as const,
        expenses: ['expenses'] as const,
        accounts: ['accounts'] as const,
        debts: ['debts'] as const,
        investments: ['investments'] as const,
    };

    // Cached data queries with optimized stale times
    const { data: incomes = [], isLoading: incomesLoading } = useQuery({
        queryKey: QUERY_KEYS.incomes,
        queryFn: getIncomes,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    const { data: expenses = [], isLoading: expensesLoading } = useQuery({
        queryKey: QUERY_KEYS.expenses,
        queryFn: getExpenses,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    const { data: accounts = [], isLoading: accountsLoading } = useQuery({
        queryKey: QUERY_KEYS.accounts,
        queryFn: async () => {
            const result = await getUserAccounts();
            return ('error' in result) ? [] : result;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes (accounts change less frequently)
        gcTime: 15 * 60 * 1000, // 15 minutes
    });

    const { data: debts = [], isLoading: debtsLoading } = useQuery({
        queryKey: QUERY_KEYS.debts,
        queryFn: getUserDebts,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000, // 15 minutes
        select: (data) => {
            if (data && !('error' in data)) {
                return data.data || [];
            }
            return [];
        }
    });

    const { data: investments = [], isLoading: investmentsLoading } = useQuery({
        queryKey: QUERY_KEYS.investments,
        queryFn: getUserInvestments,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000, // 15 minutes
        select: (data) => {
            if (data && !('error' in data)) {
                return data.data || [];
            }
            return [];
        }
    });

    const loading = incomesLoading || expensesLoading || accountsLoading || debtsLoading || investmentsLoading;

    // Memoized section toggle handler
    const toggleSection = useCallback((section: 'accounts' | 'investments' | 'moneyLent') => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    }, []);

    // Memoized calculations for better performance
    const financialCalculations = useMemo(() => {
        // Calculate total assets based on your rules:
        // 1. Sum of balances in bank accounts
        const totalAccountBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
        
        // 2. Total investments money invested (current value)
        const totalInvestmentValue = investments.reduce((sum, investment) => 
            sum + (investment.quantity * investment.currentPrice), 0
        );
        
        // 3. Total money lent from debts tab (outstanding amounts owed to you including interest)
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
            return sum + Math.max(0, remainingWithInterest.remainingAmount); // Only count positive remaining amounts
        }, 0);
        
        const totalAssets = totalAccountBalance + totalInvestmentValue + totalMoneyLent;

        // No liabilities in this calculation model
        const totalLiabilities = 0;

        // Calculate net worth
        const netWorth = totalAssets - totalLiabilities;

        // Calculate investment gains/losses
        const totalInvested = investments.reduce((sum: number, investment: InvestmentInterface) => 
            sum + (investment.quantity * investment.purchasePrice), 0
        );
        const totalInvestmentGain = totalInvestmentValue - totalInvested;

        return {
            totalAccountBalance,
            totalInvestmentValue,
            totalMoneyLent,
            totalAssets,
            totalLiabilities,
            netWorth,
            totalInvested,
            totalInvestmentGain
        };
    }, [accounts, investments, debts]);

    // Memoized monthly calculations
    const monthlyCalculations = useMemo(() => {
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

        return {
            thisMonthIncome,
            thisMonthExpenses,
            thisMonthNetIncome
        };
    }, [incomes, expenses]);

    // Memoized CSV data for chart controls
    const csvData = useMemo(() => {
        const { totalAccountBalance, totalInvestmentValue, totalMoneyLent, totalAssets, netWorth } = financialCalculations;
        
        return [
            ['Category', 'Amount', 'Percentage of Net Worth'],
            ['Bank Balance', totalAccountBalance.toString(), totalAssets > 0 ? ((totalAccountBalance / totalAssets) * 100).toFixed(2) + '%' : '0%'],
            ['Investments', totalInvestmentValue.toString(), totalAssets > 0 ? ((totalInvestmentValue / totalAssets) * 100).toFixed(2) + '%' : '0%'],
            ['Money Lent', totalMoneyLent.toString(), totalAssets > 0 ? ((totalMoneyLent / totalAssets) * 100).toFixed(2) + '%' : '0%'],
            ['Total Assets', totalAssets.toString(), '100%'],
            ['Net Worth', netWorth.toString(), '']
        ];
    }, [financialCalculations]);

    // Memoized chart data
    const chartData = useMemo(() => {
        const { totalAccountBalance, totalInvestmentValue, totalMoneyLent, totalAssets } = financialCalculations;
        
        return [
            {
                name: 'Bank Balance',
                value: totalAccountBalance,
                color: '#10b981',
                percentage: totalAssets > 0 ? ((totalAccountBalance / totalAssets) * 100).toFixed(1) : '0'
            },
            {
                name: 'Investments',
                value: totalInvestmentValue,
                color: '#3b82f6',
                percentage: totalAssets > 0 ? ((totalInvestmentValue / totalAssets) * 100).toFixed(1) : '0'
            },
            {
                name: 'Money Lent',
                value: totalMoneyLent,
                color: '#ef4444',
                percentage: totalAssets > 0 ? ((totalMoneyLent / totalAssets) * 100).toFixed(1) : '0'
            }
        ];
    }, [financialCalculations]);

    // Treemap data with enhanced colors and labels
    const treemapData = useMemo(() => {
        const { totalAccountBalance, totalInvestmentValue, totalMoneyLent, totalAssets } = financialCalculations;
        
        const data = [
            {
                name: 'Bank Balance',
                value: totalAccountBalance,
                color: '#059669',
                size: totalAccountBalance,
                percentage: totalAssets > 0 ? ((totalAccountBalance / totalAssets) * 100).toFixed(1) : '0'
            },
            {
                name: 'Investments',
                value: totalInvestmentValue,
                color: '#2563eb',
                size: totalInvestmentValue,
                percentage: totalAssets > 0 ? ((totalInvestmentValue / totalAssets) * 100).toFixed(1) : '0'
            },
            {
                name: 'Money Lent',
                value: totalMoneyLent,
                color: '#dc2626',
                size: totalMoneyLent,
                percentage: totalAssets > 0 ? ((totalMoneyLent / totalAssets) * 100).toFixed(1) : '0'
            }
        ].filter(item => item.value > 0);
        
        return data;
    }, [financialCalculations]);

    // Memoized filtered debts for money lent section
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

    // Memoized status color function
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

    // Helper function for abbreviated currency formatting
    const formatCurrencyAbbreviated = useCallback((amount: number) => {
        if (amount >= 1000000) {
            return `${getCurrencySymbol(currency)}${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
            return `${getCurrencySymbol(currency)}${(amount / 1000).toFixed(1)}K`;
        }
        return formatCurrency(amount, currency);
    }, [currency]);



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

    const { 
        totalAccountBalance, 
        totalInvestmentValue, 
        totalMoneyLent, 
        totalAssets, 
        totalLiabilities, 
        netWorth 
    } = financialCalculations;
    
    const { thisMonthIncome, thisMonthExpenses, thisMonthNetIncome } = monthlyCalculations;

    return (
        <div className="space-y-6">
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
                    <p className="text-5xl font-bold mb-4">{formatCurrency(netWorth, currency)}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                        <div className="text-center">
                            <h3 className="text-lg font-medium mb-2">Total Assets</h3>
                            <p className="text-2xl font-semibold text-green-200">{formatCurrency(totalAssets, currency)}</p>
                            <div className="text-sm text-green-100 mt-1">
                                Accounts: {formatCurrency(totalAccountBalance, currency)} | 
                                Investments: {formatCurrency(totalInvestmentValue, currency)} | 
                                Money Lent: {formatCurrency(totalMoneyLent, currency)}
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-medium mb-2">Total Liabilities</h3>
                            <p className="text-2xl font-semibold text-red-200">{formatCurrency(totalLiabilities, currency)}</p>
                            <div className="text-sm text-red-100 mt-1">
                                No Liabilities: {formatCurrency(0, currency)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Health Indicators */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Health</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-700 mb-2 text-sm sm:text-base">Savings Rate (This Month)</h4>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600">
                            {thisMonthIncome > 0 ? `${((thisMonthNetIncome / thisMonthIncome) * 100).toFixed(1)}%` : '0%'}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            {thisMonthNetIncome >= 0 ? 'You are saving money this month! 🎉' : 'You are spending more than earning this month 📉'}
                        </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-700 mb-2 text-sm sm:text-base">Asset Allocation</h4>
                        <p className="text-xl sm:text-2xl font-bold text-purple-600">
                            {totalAssets > 0 ? `${((totalInvestmentValue / totalAssets) * 100).toFixed(1)}%` : '0%'}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Percentage in investments
                        </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 sm:col-span-2 lg:col-span-1">
                        <h4 className="font-medium text-gray-700 mb-2 text-sm sm:text-base">Debt to Asset Ratio</h4>
                        <p className="text-xl sm:text-2xl font-bold text-orange-600">
                            {totalAssets > 0 ? `${((totalLiabilities / totalAssets) * 100).toFixed(1)}%` : '0%'}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            {totalLiabilities === 0 ? 'Debt-free! 🎉' : 'Lower is better'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Asset Breakdown Chart */}
            <div className={`bg-white rounded-lg shadow p-10 my-8 ${isChartExpanded ? 'fixed inset-4 z-50 overflow-auto' : ''}`}>
                <ChartControls
                    chartRef={chartRef}
                    isExpanded={isChartExpanded}
                    onToggleExpanded={toggleChartExpanded}
                    fileName="net-worth-chart"
                    csvData={csvData}
                    csvFileName="net-worth-data"
                    title="Total vs. Category"
                />
                <div ref={chartRef} className={`${isChartExpanded ? 'h-[calc(100vh-120px)]' : 'h-[44rem]'} transition-all duration-300`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 50, right: 40, left: 40, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(value) => formatCurrencyAbbreviated(value)} />
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
                                    content={(props: any) => {
                                        const { x, y, width, value, index } = props;
                                        if (value === 0) return null;
                                        
                                        const dataItem = chartData[index];
                                        if (!dataItem) return null;
                                        
                                        return (
                                            <g>
                                                {/* Currency value */}
                                                <text 
                                                    x={x + width / 2} 
                                                    y={y - 40} 
                                                    fill="#374151" 
                                                    textAnchor="middle" 
                                                    fontSize="16"
                                                    fontWeight="bold"
                                                >
                                                    {formatCurrencyAbbreviated(value)}
                                                </text>
                                                {/* Percentage value */}
                                                <text 
                                                    x={x + width / 2} 
                                                    y={y - 18} 
                                                    fill="#6b7280" 
                                                    textAnchor="middle" 
                                                    fontSize="14"
                                                    fontWeight="600"
                                                >
                                                    ({dataItem.percentage}%)
                                                </text>
                                            </g>
                                        );
                                    }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
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

            {/* Asset Breakdown Treemap */}
            {/* <div className="bg-white shadow overflow-hidden -mx-6">
                <div className="flex items-center justify-between p-6 pb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Asset Distribution</h3>
                    <div className="text-sm text-gray-500">
                        Interactive view of your asset allocation
                    </div>
                </div>
                <div className="h-80 w-full">
                    <svg width="100%" height="100%" viewBox="0 0 1200 320" className="rounded-none" preserveAspectRatio="none">
                        {treemapData.map((item, index) => {
                            const totalValue = treemapData.reduce((sum, d) => sum + d.value, 0);
                            const widthRatio = item.value / totalValue;
                            const x = treemapData.slice(0, index).reduce((sum, d) => sum + (d.value / totalValue) * 1200, 0);
                            const width = widthRatio * 1200;
                            const height = 320;
                            
                            return (
                                <g key={item.name}>
                                    <defs>
                                        <linearGradient id={`treemap-gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor={item.color} stopOpacity="0.9" />
                                            <stop offset="100%" stopColor={item.color} stopOpacity="0.6" />
                                        </linearGradient>
                                    </defs>
                                    
                                    <rect
                                        x={x + 2}
                                        y={2}
                                        width={width - 4}
                                        height={height - 4}
                                        fill={`url(#treemap-gradient-${index})`}
                                        stroke="#ffffff"
                                        strokeWidth="4"
                                        rx="8"
                                        ry="8"
                                        className="hover:stroke-gray-300 transition-all duration-300 cursor-pointer"
                                        style={{
                                            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))',
                                        }}
                                    />
                                    
                                    {width > 180 && (
                                        <g>
                                            <text
                                                x={x + width / 2}
                                                y={height / 2 - 30}
                                                textAnchor="middle"
                                                fill="#ffffff"
                                                fontSize="18"
                                                fontWeight="bold"
                                                style={{
                                                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                                                    fontFamily: 'Inter, system-ui, sans-serif'
                                                }}
                                            >
                                                {item.name}
                                            </text>
                                            
                                            <text
                                                x={x + width / 2}
                                                y={height / 2}
                                                textAnchor="middle"
                                                fill="#ffffff"
                                                fontSize="16"
                                                fontWeight="600"
                                                style={{
                                                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                                                    fontFamily: 'Inter, system-ui, sans-serif'
                                                }}
                                            >
                                                {formatCurrency(item.value, currency)}
                                            </text>
                                            
                                            <text
                                                x={x + width / 2}
                                                y={height / 2 + 25}
                                                textAnchor="middle"
                                                fill="#ffffff"
                                                fontSize="14"
                                                fontWeight="500"
                                                style={{
                                                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                                                    fontFamily: 'Inter, system-ui, sans-serif'
                                                }}
                                            >
                                                {item.percentage}% of total
                                            </text>
                                            
                                            <text
                                                x={x + width / 2}
                                                y={height / 2 + 50}
                                                textAnchor="middle"
                                                fill="#ffffff"
                                                fontSize="20"
                                                style={{
                                                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                                                }}
                                            >
                                                {item.name === 'Bank Balance' ? '🏦' : 
                                                 item.name === 'Investments' ? '📈' : '💰'}
                                            </text>
                                        </g>
                                    )}
                                    
                                    {width <= 180 && width > 90 && (
                                        <g>
                                            <text
                                                x={x + width / 2}
                                                y={height / 2 - 10}
                                                textAnchor="middle"
                                                fill="#ffffff"
                                                fontSize="12"
                                                fontWeight="bold"
                                                style={{
                                                    textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
                                                    fontFamily: 'Inter, system-ui, sans-serif'
                                                }}
                                            >
                                                {item.name.split(' ')[0]}
                                            </text>
                                            <text
                                                x={x + width / 2}
                                                y={height / 2 + 10}
                                                textAnchor="middle"
                                                fill="#ffffff"
                                                fontSize="10"
                                                fontWeight="500"
                                                style={{
                                                    textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
                                                    fontFamily: 'Inter, system-ui, sans-serif'
                                                }}
                                            >
                                                {item.percentage}%
                                            </text>
                                        </g>
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                </div>
                <div className="px-6 pb-4 pt-2 text-xs text-gray-500 text-center">
                    * Rectangle sizes represent the proportion of each asset category in your total portfolio
                </div>
            </div> */}


            {/* Account Breakdown Table */}
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
                                {formatCurrency(totalAccountBalance, currency)}
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
                    <>
                        {accounts.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-4">🏦</div>
                        <h4 className="text-lg font-medium text-gray-600 mb-2">No Accounts Found</h4>
                        <p className="text-gray-500">Add your bank accounts to track your net worth accurately.</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y-2 divide-gray-100">
                            {accounts.map((account) => (
                                <div key={account.id} className="p-4 bg-white shadow-sm rounded-lg mb-4 mx-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center space-x-3 flex-1">
                                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                                                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-sm font-semibold text-gray-900">{account.bankName}</h3>
                                                <p className="text-xs text-gray-500">{account.holderName}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {account.balance !== undefined ? (
                                                <span className="text-lg font-bold text-green-600">
                                                    {formatCurrency(account.balance, currency)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 mx-4 mt-4 mb-6 border-2 border-green-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-base font-bold text-green-800">Total Balance:</span>
                                    <span className="text-lg font-black text-green-700">
                                        {formatCurrency(totalAccountBalance, currency)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Account Details
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Bank & Branch
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Account Type
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Balance
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {accounts.map((account) => (
                                        <tr key={account.id} className="hover:bg-gray-50 py-6 border-b">
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
                                <tfoot className="bg-gradient-to-r from-green-50 to-green-100 border-t-2 border-green-200">
                                    <tr>
                                        <td colSpan={3} className="px-6 py-5 text-base font-bold text-green-800">
                     
                                        </td>
                                        <td className="px-6 py-5 text-lg font-black text-right text-green-700">
                                            {formatCurrency(totalAccountBalance, currency)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}
                    </>
                )}
            </div>

            {/* Investments Breakdown Table */}
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
                                {formatCurrency(totalInvestmentValue, currency)}
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
                    <>
                                        {investments.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-4">📈</div>
                        <h4 className="text-lg font-medium text-gray-600 mb-2">No Investments Found</h4>
                        <p className="text-gray-500">Add your investments to track your portfolio value.</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y-2 divide-gray-100">
                            {investments.map((investment) => {
                                const currentValue = investment.quantity * investment.currentPrice;
                                const investedValue = investment.quantity * investment.purchasePrice;
                                const gainLoss = currentValue - investedValue;
                                const gainLossPercent = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;
                                
                                return (
                                    <div key={investment.id} className="p-4 bg-white shadow-sm rounded-lg mb-4 mx-4">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center space-x-3 flex-1">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-sm font-semibold text-gray-900">{investment.name}</h3>
                                                    <p className="text-xs text-gray-500">
                                                        {investment.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                                        {investment.symbol && ` - ${investment.symbol}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-lg font-bold text-blue-600">
                                                    {formatCurrency(currentValue, currency)}
                                                </span>
                                                <div className={`text-xs ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(gainLoss, currency)} ({gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%)
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 mx-4 mt-4 mb-6 border-2 border-blue-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-base font-bold text-blue-800">Total Value:</span>
                                    <span className="text-lg font-black text-blue-700">
                                        {formatCurrency(totalInvestmentValue, currency)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
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
                                            Purchase Price
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Current Price
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
                                            <tr key={investment.id} className="hover:bg-gray-50 py-6 border-b">
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
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {investment.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                    {investment.quantity}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                    {formatCurrency(investment.purchasePrice, currency)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                    {formatCurrency(investment.currentPrice, currency)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-blue-600">
                                                    {formatCurrency(currentValue, currency)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                                    <div className={gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                        {formatCurrency(gainLoss, currency)}
                                                        <div className="text-xs">
                                                            ({gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%)
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gradient-to-r from-blue-50 to-blue-100 border-t-2 border-blue-200">
                                    <tr>
                                        <td colSpan={6} className="px-6 py-5 text-base font-bold text-blue-800">
                     
                                        </td>
                                        <td className="px-6 py-5 text-lg font-black text-right text-blue-700">
                                            <div>{formatCurrency(totalInvestmentValue, currency)}</div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}
                    </>
                )}
            </div>

            {/* Money Lent Breakdown Table */}
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
                                {formatCurrency(totalMoneyLent, currency)}
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
                    <>
                        {outstandingDebts.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-4">💰</div>
                        <h4 className="text-lg font-medium text-gray-600 mb-2">No Money Lent</h4>
                        <p className="text-gray-500">You haven't lent any money that is still outstanding.</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y-2 divide-gray-100">
                            {outstandingDebts.map((debt) => {
                                const totalRepayments = debt.repayments?.reduce((sum: number, rep: any) => sum + rep.amount, 0) || 0;
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
                                    <div key={debt.id} className="p-4 bg-white shadow-sm rounded-lg mb-4 mx-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center space-x-3 flex-1">
                                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-sm font-semibold text-gray-900">{debt.borrowerName}</h3>
                                                    {debt.purpose && (
                                                        <p className="text-xs text-gray-500">{debt.purpose}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-lg font-bold text-red-600">
                                                    {formatCurrency(remainingAmount, currency)}
                                                </span>
                                                <div className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                                    {debt.dueDate ? formatDate(debt.dueDate) : 'No due date'}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Progress Bar */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500">Repayment Progress</span>
                                                <span className="text-xs text-gray-700 font-medium">
                                                    {remainingWithInterest.totalWithInterest > 0 ? ((totalRepayments / remainingWithInterest.totalWithInterest) * 100).toFixed(1) : '0.0'}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${remainingWithInterest.totalWithInterest > 0 ? Math.min((totalRepayments / remainingWithInterest.totalWithInterest) * 100, 100) : 0}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-500">
                                                <span>Repaid: {formatCurrency(totalRepayments, currency)}</span>
                                                <span>Total: {formatCurrency(remainingWithInterest.totalWithInterest, currency)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4 mx-4 mt-4 mb-6 border-2 border-red-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-base font-bold text-red-700">Total Outstanding:</span>
                                    <span className="text-lg font-black text-red-600">
                                        {formatCurrency(totalMoneyLent, currency)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Borrower
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Purpose
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Total Amount
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Repaid
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
                                        const totalRepayments = debt.repayments?.reduce((sum: number, rep: any) => sum + rep.amount, 0) || 0;
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
                                            <tr key={debt.id} className="hover:bg-gray-50 py-6 border-b">
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
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                    {formatCurrency(remainingWithInterest.totalWithInterest, currency)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                    {formatCurrency(totalRepayments, currency)}
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
                                <tfoot className="bg-gradient-to-r from-red-50 to-red-100 border-t-2 border-red-200">
                                    <tr>
                                        <td colSpan={6} className="px-6 py-5 text-base font-bold text-red-700">

                                        </td>
                                        <td className="px-6 py-5 text-lg font-black text-right text-red-600">
                                            {formatCurrency(totalMoneyLent, currency)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}
                    </>
                )}
            </div>

        </div>
    );
} 