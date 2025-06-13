"use client";

import { Suspense, useEffect } from "react";
import { Income, Expense } from "../../types/financial";
import { getIncomes, createIncome, updateIncome, deleteIncome } from "../../actions/incomes";
import { getExpenses, createExpense, updateExpense, deleteExpense } from "../../actions/expenses";
import { useCurrency } from "../../providers/CurrencyProvider";
import { WaterfallChart } from "../../components/WaterfallChart";
import { CategoryPieChart } from "../../components/CategoryPieChart";
import { MonthlyTrendChart } from "../../components/MonthlyTrendChart";
import { CategoryTrendChart } from "../../components/CategoryTrendChart";
import { RecentTransactions } from "../../components/RecentTransactions";
import { SimplePDFReportGenerator } from "../../components/SimplePDFReportGenerator";
import { FinancialSummary } from "../../components/shared/FinancialSummary";
import { FinancialFilters } from "../../components/shared/FinancialFilters";
import { useOptimizedFinancialData } from "../../hooks/useOptimizedFinancialData";
import { DateFilterButtons } from "../../components/DateFilterButtons";
import { useState } from "react";

function DashboardContent() {
    const { currency } = useCurrency();

    // Use the optimized financial data hook for incomes
    const incomesData = useOptimizedFinancialData<Income>("INCOME", {
        getItems: getIncomes,
        createItem: createIncome,
        updateItem: updateIncome,
        deleteItem: deleteIncome,
        exportToCSV: () => {}, // Not used here
    });

    // Use the optimized financial data hook for expenses
    const expensesData = useOptimizedFinancialData<Expense>("EXPENSE", {
        getItems: getExpenses,
        createItem: createExpense,
        updateItem: updateExpense,
        deleteItem: deleteExpense,
        exportToCSV: () => {}, // Not used here
    });

    // Local date filter state (dashboard only)
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    // Loading state
    if (incomesData.loading || expensesData.loading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-start items-center">
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading dashboard data...</div>
                </div>
            </div>
        );
    }

    // Date filter logic (as in the original dashboard)
    const getFilteredData = (data: (Income | Expense)[]) => {
        if (!startDate && !endDate) return data;
        return data.filter(item => {
            const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
            let matchesDateRange = true;
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchesDateRange = itemDate >= start && itemDate <= end;
            } else if (startDate) {
                const start = new Date(startDate);
                matchesDateRange = itemDate >= start;
            } else if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchesDateRange = itemDate <= end;
            }
            return matchesDateRange;
        });
    };

    const filteredIncomes = getFilteredData(incomesData.items) as Income[];
    const filteredExpenses = getFilteredData(expensesData.items) as Expense[];
    const totalIncome = filteredIncomes.reduce((sum: number, income: Income) => sum + income.amount, 0);
    const totalExpenses = filteredExpenses.reduce((sum: number, expense: Expense) => sum + expense.amount, 0);

    // Date filter handlers
    const handleDateChange = (start: string, end: string) => {
        setStartDate(start);
        setEndDate(end);
    };
    const clearFilters = () => {
        setStartDate("");
        setEndDate("");
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-600 mt-1">Overview of your financial health</p>
                </div>
                <div className="flex items-center gap-4">
                    <SimplePDFReportGenerator 
                        incomes={filteredIncomes}
                        expenses={filteredExpenses}
                        startDate={startDate}
                        endDate={endDate}
                    />
                </div>
            </div>

            {/* Date Filter Controls */}
            <DateFilterButtons
                startDate={startDate}
                endDate={endDate}
                onDateChange={handleDateChange}
                onClearFilters={clearFilters}
            />

            {/* Summary Cards */}
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FinancialSummary
                    totalAmount={totalIncome}
                    currency={currency}
                    items={filteredIncomes}
                    itemType="income"
                />
                <FinancialSummary
                    totalAmount={totalExpenses}
                    currency={currency}
                    items={filteredExpenses}
                    itemType="expense"
                />
            </div> */}

            {/* Divider */}
            {/* <div className="flex justify-center">
                <div className="w-1/2 border-t border-gray-200"></div>
            </div> */}

            {/* Financial Overview - Waterfall Chart */}
            <WaterfallChart 
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                currency={currency}
            />

            {/* Divider */}
            <div className="flex justify-center">
                <div className="w-1/2 border-t border-gray-200"></div>
            </div>

            {/* Monthly Trend Chart */}
            <MonthlyTrendChart 
                incomes={filteredIncomes}
                expenses={filteredExpenses}
                currency={currency}
                startDate={startDate}
                endDate={endDate}
            />

            {/* Divider */}
            <div className="flex justify-center">
                <div className="w-1/2 border-t border-gray-200"></div>
            </div>

            {/* Category Charts - Side by Side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <CategoryPieChart 
                    data={filteredExpenses}
                    type="expense"
                    currency={currency}
                />
                <CategoryPieChart 
                    data={filteredIncomes}
                    type="income"
                    currency={currency}
                />
            </div>

            {/* Divider */}
            <div className="flex justify-center">
                <div className="w-1/2 border-t border-gray-200"></div>
            </div>

            {/* Category Trend Charts - Side by Side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <CategoryTrendChart 
                    data={filteredExpenses}
                    type="expense"
                    currency={currency}
                />
                <CategoryTrendChart 
                    data={filteredIncomes}
                    type="income"
                    currency={currency}
                />
            </div>

            {/* Divider */}
            <div className="flex justify-center">
                <div className="w-1/2 border-t border-gray-200"></div>
            </div>

            {/* Recent Transactions */}
            <RecentTransactions />
        </div>
    );
}

export default function Dashboard() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DashboardContent />
        </Suspense>
    );
}
