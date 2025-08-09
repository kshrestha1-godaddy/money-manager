"use client";

import { useEffect } from "react";
import { useCurrency } from "../../providers/CurrencyProvider";
import { ChartDataProvider } from "../../hooks/useChartDataContext";
import { ChartAnimationProvider } from "../../hooks/useChartAnimationContext";
import { useOptimizedFinancialData } from "../../hooks/useOptimizedFinancialData";
import { Income, Expense } from "../../types/financial";
import { getIncomes, createIncome, updateIncome, deleteIncome } from "../incomes/actions/incomes";
import { getExpenses, createExpense, updateExpense, deleteExpense } from "../expenses/actions/expenses";
import { CONTAINER_COLORS, LOADING_COLORS } from "../../config/colorConfig";
import { useDashboardFilters } from "./hooks/use-dashboard-filters";
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardCharts } from "./components/DashboardCharts";

const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

export default function DashboardPageClient() {
  const { currency } = useCurrency();
  const pageContainer = CONTAINER_COLORS.page;

  const incomesData = useOptimizedFinancialData<Income>("INCOME", {
    getItems: getIncomes,
    createItem: createIncome,
    updateItem: updateIncome,
    deleteItem: deleteIncome,
    exportToCSV: () => {},
  }, { fetchAccounts: false, fetchCategories: false });

  const expensesData = useOptimizedFinancialData<Expense>("EXPENSE", {
    getItems: getExpenses,
    createItem: createExpense,
    updateItem: updateExpense,
    deleteItem: deleteExpense,
    exportToCSV: () => {},
  }, { fetchAccounts: false, fetchCategories: false });
  // Tutorial flag: set if user has any data
  useEffect(() => {
    if (incomesData.items.length > 0 || expensesData.items.length > 0) {
      try {
        localStorage.setItem("user-has-accounts", "true");
      } catch (_) {}
    }
  }, [incomesData.items.length, expensesData.items.length]);

  const {
    startDate,
    endDate,
    isAllTime,
    handleDateChange,
    clearFilters,
    setAllTime,
  } = useDashboardFilters({
    hasIncomes: incomesData.items.length > 0,
    hasExpenses: expensesData.items.length > 0,
  });

  if (incomesData.loading || expensesData.loading) {
    return (
      <div className={loadingContainer}>
        <div className={loadingSpinner}></div>
        <p className={loadingText}>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <ChartAnimationProvider>
      <ChartDataProvider
        incomes={incomesData.items}
        expenses={expensesData.items}
        startDate={startDate}
        endDate={endDate}
        isAllTime={isAllTime}
      >
        <div className={pageContainer}>
          <DashboardHeader startDate={startDate} endDate={endDate} />
          <DashboardCharts
            currency={currency}
            startDate={startDate}
            endDate={endDate}
            onDateChange={handleDateChange}
            onClearFilters={clearFilters}
            onSetAllTime={setAllTime}
          />
        </div>
      </ChartDataProvider>
    </ChartAnimationProvider>
  );
}


