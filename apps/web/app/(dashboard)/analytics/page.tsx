"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOptimizedFinancialData } from "../../hooks/useOptimizedFinancialData";
import { Income, Expense } from "../../types/financial";
import { DebtInterface } from "../../types/debts";
import { InvestmentInterface } from "../../types/investments";
import { getIncomes } from "../../actions/incomes";
import { getExpenses } from "../../actions/expenses";
import { getUserDebts } from "../../actions/debts";
import { getUserInvestments } from "../../actions/investments";
import { useCurrency } from "../../providers/CurrencyProvider";
import { formatCurrency } from "../../utils/currency";

// Analytics Components (to be created)
import { SpendingPatternChart } from "../../components/analytics/SpendingPatternChart";
import { CategoryInsightsCard } from "../../components/analytics/CategoryInsightsCard";
import { BehavioralInsightsCard } from "../../components/analytics/BehavioralInsightsCard";
import { FinancialHealthScore } from "../../components/analytics/FinancialHealthScore";
import { PredictiveTrendsCard } from "../../components/analytics/PredictiveTrendsCard";
import { MonthlyComparisonChart } from "../../components/analytics/MonthlyComparisonChart";
import { GoalProgressCard } from "../../components/analytics/GoalProgressCard";
import { RecurringExpensesCard } from "../../components/analytics/RecurringExpensesCard";
import { CashFlowTimeline } from "../../components/analytics/CashFlowTimeline";
import { BudgetComparisonCard } from "../../components/analytics/BudgetComparisonCard";

export default function AnalyticsPage() {
    const { currency } = useCurrency();
    const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
    
    // Fetch income and expense data
    const incomesData = useOptimizedFinancialData<Income>("INCOME", {
        getItems: getIncomes,
        createItem: () => Promise.resolve({} as Income),
        updateItem: () => Promise.resolve({} as Income),
        deleteItem: () => Promise.resolve(),
        exportToCSV: () => {},
    });

    const expensesData = useOptimizedFinancialData<Expense>("EXPENSE", {
        getItems: getExpenses,
        createItem: () => Promise.resolve({} as Expense),
        updateItem: () => Promise.resolve({} as Expense),
        deleteItem: () => Promise.resolve(),
        exportToCSV: () => {},
    });

    // Fetch debt and investment data
    const { data: debtsResponse = { data: [] }, isLoading: debtsLoading } = useQuery({
        queryKey: ['debts'],
        queryFn: getUserDebts,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    const { data: investmentsResponse = { data: [] }, isLoading: investmentsLoading } = useQuery({
        queryKey: ['investments'],
        queryFn: getUserInvestments,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    const debts = debtsResponse.data || [];
    const investments = investmentsResponse.data || [];

    // Calculate financial metrics
    const financialMetrics = useMemo(() => {
        if (!incomesData.items.length && !expensesData.items.length) return null;

        const totalIncome = incomesData.items.reduce((sum, income) => sum + income.amount, 0);
        const totalExpenses = expensesData.items.reduce((sum, expense) => sum + expense.amount, 0);
        const totalDebt = debts.reduce((sum: number, debt: DebtInterface) => sum + debt.amount, 0);
        const totalInvestments = investments.reduce((sum: number, investment: InvestmentInterface) => 
            sum + (investment.currentPrice * investment.quantity), 0);
        const savings = totalIncome - totalExpenses;

        return {
            income: totalIncome,
            expenses: totalExpenses,
            savings,
            debt: totalDebt,
            investments: totalInvestments,
        };
    }, [incomesData.items, expensesData.items, debts, investments]);

    // Process transactions for behavioral insights
    const transactions = useMemo(() => {
        return [
            ...expensesData.items.map(expense => ({
                amount: expense.amount,
                date: new Date(expense.date),
                category: expense.category,
                type: 'expense' as const
            })),
            ...incomesData.items.map(income => ({
                amount: income.amount,
                date: new Date(income.date),
                category: income.category,
                type: 'income' as const
            }))
        ].sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [expensesData.items, incomesData.items]);

    // Filter data based on selected timeframe
    const filteredTransactions = useMemo(() => {
        const now = new Date();
        const cutoffDate = new Date();
        
        switch (selectedTimeframe) {
            case 'week':
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                cutoffDate.setMonth(now.getMonth() - 1);
                break;
            case 'quarter':
                cutoffDate.setMonth(now.getMonth() - 3);
                break;
            case 'year':
                cutoffDate.setFullYear(now.getFullYear() - 1);
                break;
        }

        return transactions.filter(t => t.date >= cutoffDate);
    }, [transactions, selectedTimeframe]);

    // Example financial goals (in a real app, these would come from the database)
    const financialGoals = [
        {
            name: "Emergency Fund",
            target: 10000,
            current: 6500,
            type: "savings" as const
        },
        {
            name: "Debt Payoff",
            target: debts.reduce((sum, debt) => sum + debt.amount, 0),
            current: debts.reduce((sum, debt) => sum + (debt.repayments?.reduce((total, repayment) => total + repayment.amount, 0) || 0), 0),
            type: "debt" as const
        },
        {
            name: "Investment Portfolio",
            target: 50000,
            current: investments.reduce((sum, investment) => sum + (investment.currentPrice * investment.quantity), 0),
            type: "investment" as const
        }
    ];

    // Process transactions for components
    const processedTransactions = transactions.map(t => ({
        ...t,
        title: t.type === 'expense' ? t.category.name : 'Income'
    }));

    if (incomesData.loading || expensesData.loading || debtsLoading || investmentsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Money Habits Analytics</h1>
                <p className="text-gray-600 mt-1">Understand your spending patterns and financial behavior</p>
            </div>

            {/* Timeframe Selection */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex space-x-4">
                    {['week', 'month', 'quarter', 'year'].map((timeframe) => (
                        <button
                            key={timeframe}
                            onClick={() => setSelectedTimeframe(timeframe as any)}
                            className={`px-4 py-2 rounded-lg ${
                                selectedTimeframe === timeframe
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Financial Health Score */}
            {financialMetrics && (
                <FinancialHealthScore
                    data={financialMetrics}
                    currency={currency}
                />
            )}

            {/* Monthly Comparison */}
            <MonthlyComparisonChart
                transactions={transactions}
                currency={currency}
            />

            {/* Goal Progress */}
            <GoalProgressCard
                goals={financialGoals}
                currency={currency}
            />

            {/* Cash Flow Timeline */}
            <CashFlowTimeline
                transactions={transactions}
                currency={currency}
                timeframe={selectedTimeframe}
            />

            {/* Spending Patterns and Category Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">When You Spend</h2>
                    <div className="h-64">
                        <SpendingPatternChart
                            data={filteredTransactions.filter(t => t.type === 'expense').map(t => t.amount)}
                            type="hourly"
                            currency={currency}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Where Your Money Goes</h2>
                    <div className="h-64">
                        <CategoryInsightsCard
                            categories={Object.entries(
                                filteredTransactions
                                    .filter(t => t.type === 'expense')
                                    .reduce((acc, t) => {
                                        acc[t.category.name] = (acc[t.category.name] || 0) + t.amount;
                                        return acc;
                                    }, {} as Record<string, number>)
                            ).map(([name, total]) => ({ name, total }))}
                            currency={currency}
                        />
                    </div>
                </div>
            </div>

            {/* Recurring Expenses */}
            <RecurringExpensesCard
                transactions={processedTransactions.filter(t => t.type === 'expense')}
                currency={currency}
                timeframe={selectedTimeframe}
            />

            {/* Budget Comparison */}
            <BudgetComparisonCard
                transactions={processedTransactions.filter(t => t.type === 'expense')}
                currency={currency}
            />

            {/* Behavioral Insights */}
            <BehavioralInsightsCard
                transactions={filteredTransactions.filter(t => t.type === 'expense')}
                currency={currency}
                timeframe={selectedTimeframe}
            />

            {/* Predictive Trends */}
            <PredictiveTrendsCard
                transactions={filteredTransactions.filter(t => t.type === 'expense')}
                currency={currency}
                timeframe={selectedTimeframe}
            />
        </div>
    );
} 