"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrency } from "../../providers/CurrencyProvider";
import { usePageDisplayCurrency } from "../../components/PageDisplayCurrencySelect";
import { ChartDataProvider } from "../../hooks/useChartDataContext";
import { ChartAnimationProvider } from "../../hooks/useChartAnimationContext";
import { financialItemsQuery } from "../../hooks/financial-items-query";
import { getIncomes } from "../incomes/actions/incomes";
import { getExpenses } from "../expenses/actions/expenses";
import { CONTAINER_COLORS, LOADING_COLORS } from "../../config/colorConfig";
import { useDashboardFilters } from "./hooks/use-dashboard-filters";
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardCharts } from "./components/DashboardCharts";

const EMPTY_TRANSACTIONS: [] = [];

const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

export default function DashboardPageClient() {
  const { currency } = useCurrency();
  const { displayCurrency, setDisplayCurrency } = usePageDisplayCurrency(currency);
  const pageContainer = CONTAINER_COLORS.page;

  const incomesQuery = useQuery(financialItemsQuery("INCOME", getIncomes));
  const expensesQuery = useQuery(financialItemsQuery("EXPENSE", getExpenses));
  const incomes = incomesQuery.data ?? EMPTY_TRANSACTIONS;
  const expenses = expensesQuery.data ?? EMPTY_TRANSACTIONS;

  // Tutorial flag: set if user has any data
  useEffect(() => {
    if (incomes.length > 0 || expenses.length > 0) {
      try {
        localStorage.setItem("user-has-accounts", "true");
      } catch {}
    }
  }, [incomes.length, expenses.length]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const { date } of [...incomes, ...expenses]) {
      const year = new Date(date).getFullYear();
      if (Number.isFinite(year)) years.add(year);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [incomes, expenses]);

  const {
    startDate,
    endDate,
    isAllTime,
    handleDateChange,
    clearFilters,
    setAllTime,
  } = useDashboardFilters();

  if (incomesQuery.isPending || expensesQuery.isPending) {
    return (
      <div className={loadingContainer} role="status">
        <div className={loadingSpinner} aria-hidden="true" />
        <p className={loadingText}>Loading dashboard data...</p>
      </div>
    );
  }

  const incomeFailed = incomesQuery.isError && !incomesQuery.data;
  const expenseFailed = expensesQuery.isError && !expensesQuery.data;
  if (incomeFailed || expenseFailed) {
    const retrying = (incomeFailed && incomesQuery.isFetching) ||
      (expenseFailed && expensesQuery.isFetching);

    return (
      <section className={pageContainer}>
        <h1 className="sr-only">Dashboard</h1>
        <div role="alert" className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-gray-900">Dashboard transactions couldn’t load.</p>
          <button
            type="button"
            disabled={retrying}
            onClick={() => {
              if (incomeFailed) void incomesQuery.refetch();
              if (expenseFailed) void expensesQuery.refetch();
            }}
            className="mt-3 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {retrying ? "Retrying…" : "Try again"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <ChartAnimationProvider>
      <ChartDataProvider
        incomes={incomes}
        expenses={expenses}
        startDate={startDate}
        endDate={endDate}
        isAllTime={isAllTime}
      >
        <div className={pageContainer}>
          <DashboardHeader
            displayCurrency={displayCurrency}
            onDisplayCurrencyChange={setDisplayCurrency}
          />
          <DashboardCharts
            currency={displayCurrency}
            startDate={startDate}
            endDate={endDate}
            isAllTime={isAllTime}
            availableYears={availableYears}
            onDateChange={handleDateChange}
            onClearFilters={clearFilters}
            onSetAllTime={setAllTime}
          />
        </div>
      </ChartDataProvider>
    </ChartAnimationProvider>
  );
}
