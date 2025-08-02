"use client";

import { Suspense, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Income, Expense } from "../../types/financial";
import { getIncomes, createIncome, updateIncome, deleteIncome } from "../../actions/incomes";
import { getExpenses, createExpense, updateExpense, deleteExpense } from "../../actions/expenses";
import { useCurrency } from "../../providers/CurrencyProvider";
import { ChartDataProvider } from "../../hooks/useChartDataContext";
import { ChartAnimationProvider } from "../../hooks/useChartAnimationContext";
import { WaterfallChart } from "../../components/WaterfallChart";
import { CategoryPieChart } from "../../components/CategoryPieChart";
import { IncomeSankeyChart } from "../../components/IncomeSankeyChart";
import { MonthlyTrendChart } from "../../components/MonthlyTrendChart";
import { CategoryTrendChart } from "../../components/CategoryTrendChart";
import { CustomCalendarChart } from "../../components/CustomCalendarChart";
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

    // Debounced date filter handlers to prevent rapid re-renders
    const debounceTimeoutRef = useRef<NodeJS.Timeout>();
    
    const handleDateChange = useCallback((start: string, end: string) => {
        // Clear previous timeout
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        
        // Debounce the state update
        debounceTimeoutRef.current = setTimeout(() => {
            setStartDate(start);
            setEndDate(end);
        }, 150); // 150ms debounce
    }, []);
    
    const clearFilters = useCallback(() => {
        setStartDate("");
        setEndDate("");
    }, []);

    // Memoize props passed to charts to prevent unnecessary re-renders
    const dashboardProps = useMemo(() => ({
        currency,
        startDate,
        endDate,
        onDateChange: handleDateChange,
        onClearFilters: clearFilters
    }), [currency, startDate, endDate, handleDateChange, clearFilters]);

    // Set localStorage flag if user has any financial data (for tutorial system)
    useEffect(() => {
        const hasIncomes = incomesData.items.length > 0;
        const hasExpenses = expensesData.items.length > 0;
        
        if (hasIncomes || hasExpenses) {
            localStorage.setItem('user-has-accounts', 'true');
        }
    }, [incomesData.items.length, expensesData.items.length]);

    // Cleanup debounce timeout on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    // Loading state
    if (incomesData.loading || expensesData.loading) {
        return (
            <div className={loadingContainer}>
                <div className={loadingSpinner}></div>
                <p className={loadingText}>Loading dashboard data...</p>
            </div>
        );
    }

    // Main UI render - wrapped with providers for optimal performance
    return (
        <ChartAnimationProvider>
            <ChartDataProvider
                incomes={incomesData.items}
                expenses={expensesData.items}
                startDate={startDate}
                endDate={endDate}
            >
                <DashboardCharts {...dashboardProps} />
            </ChartDataProvider>
        </ChartAnimationProvider>
    );
}

// Separate component for charts to leverage ChartDataContext
function DashboardCharts({ 
    currency, 
    startDate, 
    endDate, 
    onDateChange, 
    onClearFilters 
}: {
    currency: string;
    startDate: string;
    endDate: string;
    onDateChange: (start: string, end: string) => void;
    onClearFilters: () => void;
}) {
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
                        startDate={startDate}
                        endDate={endDate}
                    />
                </div>
            </div>

            {/* Date Filter Controls */}
            <DateFilterButtons
                startDate={startDate}
                endDate={endDate}
                onDateChange={onDateChange}
                onClearFilters={onClearFilters}
            />

            {/* Financial Overview - Waterfall Chart & Savings Rate Chart Side by Side */}
            <div className="grid grid-cols-2 gap-4">
                <Suspense fallback={<ChartSkeleton title="Financial Overview" />}>
                    <div key="waterfall-chart">
                        <WaterfallChart currency={currency} />
                    </div>
                </Suspense>
                <Suspense fallback={<ChartSkeleton title="Savings Rate Trend" />}>
                    <div key="savings-rate-chart">
                        <SavingsRateChart currency={currency} />
                    </div>
                </Suspense>
            </div>

            {/* Monthly Trend Chart */}
            <Suspense fallback={<ChartSkeleton title="Monthly Trends" />}>
                <div key="monthly-trend-chart">
                    <MonthlyTrendChart currency={currency} />
                </div>
            </Suspense>

            {/* Category Charts - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
                <Suspense fallback={<ChartSkeleton title="Expense Distribution" height="h-[24rem]" />}>
                    <div key="expense-pie-chart">
                        <CategoryPieChart type="expense" currency={currency} />
                    </div>
                </Suspense>
                <Suspense fallback={<ChartSkeleton title="Income Distribution" height="h-[24rem]" />}>
                    <div key="income-sankey-chart">
                        <IncomeSankeyChart currency={currency} />
                    </div>
                </Suspense>
            </div>

            {/* Category Trend Charts - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
                <Suspense fallback={<ChartSkeleton title="Expense Category Trends" height="h-[32rem]" />}>
                    <div key="expense-trend-chart">
                        <CategoryTrendChart type="expense" currency={currency} />
                    </div>
                </Suspense>
                <Suspense fallback={<ChartSkeleton title="Income Category Trends" height="h-[32rem]" />}>
                    <div key="income-trend-chart">
                        <CategoryTrendChart type="income" currency={currency} />
                    </div>
                </Suspense>
            </div>

            {/* Transaction Calendar Charts - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
                <Suspense fallback={<ChartSkeleton title="Expense Transaction Calendar" height="h-[32rem]" />}>
                    <div key="expense-calendar-chart">
                        <CustomCalendarChart type="expense" currency={currency} />
                    </div>
                </Suspense>
                <Suspense fallback={<ChartSkeleton title="Income Transaction Calendar" height="h-[32rem]" />}>
                    <div key="income-calendar-chart">
                        <CustomCalendarChart type="income" currency={currency} />
                    </div>
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
