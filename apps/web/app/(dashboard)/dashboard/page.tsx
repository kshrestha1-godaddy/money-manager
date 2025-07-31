"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Income, Expense } from "../../types/financial";
import { getIncomes, createIncome, updateIncome, deleteIncome } from "../../actions/incomes";
import { getExpenses, createExpense, updateExpense, deleteExpense } from "../../actions/expenses";
import { useCurrency } from "../../providers/CurrencyProvider";
import { WaterfallChart } from "../../components/WaterfallChart";
import { CategoryPieChart } from "../../components/CategoryPieChart";
import { SankeyChart } from "../../components/SankeyChart";
import { MonthlyTrendChart } from "../../components/MonthlyTrendChart";
import { CategoryTrendChart } from "../../components/CategoryTrendChart";
import { RecentTransactions } from "../../components/RecentTransactions";
import { SimplePDFReportGenerator } from "../../components/SimplePDFReportGenerator";
import { FinancialSummary } from "../../components/shared/FinancialSummary";
import { FinancialFilters } from "../../components/shared/FinancialFilters";
import { useOptimizedFinancialData } from "../../hooks/useOptimizedFinancialData";
import { DateFilterButtons } from "../../components/DateFilterButtons";
import { SavingsRateChart } from "../../components/SavingsRateChart";
import { ChartSkeleton } from "../../components/shared/ChartSkeleton";
import { ExportAllButton } from "../../components/ExportAllButton";
import { 
    getSummaryCardClasses,
    BUTTON_COLORS,
    TEXT_COLORS,
    CONTAINER_COLORS,
    LOADING_COLORS,
    UI_STYLES,
} from "../../config/colorConfig";

// Extract color variables for better readability
const pageContainer = CONTAINER_COLORS.page;
const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

const pageTitle = TEXT_COLORS.title;
const pageSubtitle = TEXT_COLORS.subtitle;

function DashboardContent() {
    // All hooks must be called before any conditional logic
    const { currency } = useCurrency();
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

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

    // Memoize the filtered data calculation
    const filteredData = useMemo(() => {
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

        return {
            filteredIncomes: getFilteredData(incomesData.items) as Income[],
            filteredExpenses: getFilteredData(expensesData.items) as Expense[],
        };
    }, [incomesData.items, expensesData.items, startDate, endDate]);

    // Memoize total calculations
    const totals = useMemo(() => ({
        totalIncome: filteredData.filteredIncomes.reduce((sum, income) => sum + income.amount, 0),
        totalExpenses: filteredData.filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    }), [filteredData]);

    // Date filter handlers
    const handleDateChange = (start: string, end: string) => {
        setStartDate(start);
        setEndDate(end);
    };
    const clearFilters = () => {
        setStartDate("");
        setEndDate("");
    };

    // Set localStorage flag if user has any financial data (for tutorial system)
    useEffect(() => {
        const hasIncomes = filteredData.filteredIncomes.length > 0;
        const hasExpenses = filteredData.filteredExpenses.length > 0;
        
        if (hasIncomes || hasExpenses) {
            localStorage.setItem('user-has-accounts', 'true');
        }
    }, [filteredData.filteredIncomes.length, filteredData.filteredExpenses.length]);

    // Loading state
    if (incomesData.loading || expensesData.loading) {
        return (
            <div className={loadingContainer}>
                <div className={loadingSpinner}></div>
                <p className={loadingText}>Loading dashboard data...</p>
            </div>
        );
    }

    // Main UI render
    return (
        <div id="dashboard-content" className={pageContainer}>
            {/* Header */}
            <div id="dashboard-header" className={UI_STYLES.header.container}>
                <div>
                    <h1 className={pageTitle}>Dashboard</h1>
                    <p className={pageSubtitle}>Overview of your financial health</p>
                </div>
                <div className="flex items-center gap-4">
                    <ExportAllButton />
                    <SimplePDFReportGenerator 
                        incomes={filteredData.filteredIncomes}
                        expenses={filteredData.filteredExpenses}
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

            {/* Financial Overview - Waterfall Chart & Savings Rate Chart Side by Side */}
            <div className="grid grid-cols-2 gap-4">
                <Suspense fallback={<ChartSkeleton title="Financial Overview" />}>
                    <WaterfallChart 
                        totalIncome={totals.totalIncome}
                        totalExpenses={totals.totalExpenses}
                        currency={currency}
                        startDate={startDate}
                        endDate={endDate}
                    />
                </Suspense>
                <Suspense fallback={<ChartSkeleton title="Savings Rate Trend" />}>
                    <SavingsRateChart 
                        incomes={filteredData.filteredIncomes}
                        expenses={filteredData.filteredExpenses}
                        currency={currency}
                        startDate={startDate}
                        endDate={endDate}
                    />
                </Suspense>
            </div>

            {/* Monthly Trend Chart */}
            <Suspense fallback={<ChartSkeleton title="Monthly Trends" />}>
                <MonthlyTrendChart 
                    incomes={filteredData.filteredIncomes}
                    expenses={filteredData.filteredExpenses}
                    currency={currency}
                    startDate={startDate}
                    endDate={endDate}
                />
            </Suspense>


            {/* Category Charts - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
                <Suspense fallback={<ChartSkeleton title="Expense Distribution" height="h-[24rem]" />}>
                    <SankeyChart 
                        data={filteredData.filteredExpenses}
                        type="expense"
                        currency={currency}
                        startDate={startDate}
                        endDate={endDate}
                    />
                </Suspense>
                <Suspense fallback={<ChartSkeleton title="Income Distribution" height="h-[24rem]" />}>
                    {/* <SankeyChart
                        data={filteredData.filteredIncomes}
                        type="income"
                        currency={currency}
                        startDate={startDate}
                        endDate={endDate}
                    /> */}
                    <CategoryPieChart 
                        data={filteredData.filteredIncomes}
                        type="income"
                        currency={currency}
                        startDate={startDate}
                        endDate={endDate}
                    />
                </Suspense>
            </div>

            {/* Category Trend Charts - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
                <Suspense fallback={<ChartSkeleton title="Expense Category Trends" height="h-[32rem]" />}>
                    <CategoryTrendChart 
                        data={filteredData.filteredExpenses}
                        type="expense"
                        currency={currency}
                        startDate={startDate}
                        endDate={endDate}
                    />
                </Suspense>
                <Suspense fallback={<ChartSkeleton title="Income Category Trends" height="h-[32rem]" />}>
                    <CategoryTrendChart 
                        data={filteredData.filteredIncomes}
                        type="income"
                        currency={currency}
                        startDate={startDate}
                        endDate={endDate}
                    />
                </Suspense>
            </div>

            {/* Recent Transactions */}
            <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg"></div>}>
                <RecentTransactions />
            </Suspense>
        </div>
    );
}

export default function Dashboard() {
    return (
        <Suspense fallback={
            <div className={loadingContainer}>
                <div className={loadingSpinner}></div>
                <p className={loadingText}>Loading dashboard...</p>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
