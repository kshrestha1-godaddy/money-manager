"use client";

import React, { useRef, useMemo, useCallback, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../../../utils/currency";
import { useChartData } from "../../../hooks/useChartDataContext";
import { ChartControls } from "../../../components/ChartControls";
import { useChartExpansion } from "../../../utils/chartUtils";

function CategoryMultiSelect({
  categories,
  selected,
  onChange,
}: {
  categories: string[];
  selected: string[];
  onChange: (categories: string[]) => void;
}) {
  const dropdownRef = useRef<HTMLDetailsElement>(null);

  React.useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !dropdownRef.current?.contains(event.target)
      ) {
        dropdownRef.current?.removeAttribute("open");
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-sm text-gray-600">Categories:</span>
      <details
        ref={dropdownRef}
        className="relative min-w-0"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            event.currentTarget.removeAttribute("open");
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            dropdownRef.current?.removeAttribute("open");
            dropdownRef.current?.querySelector("summary")?.focus();
          }
        }}
      >
        <summary className="flex items-center justify-between gap-3 border border-gray-300 rounded px-3 py-1 text-sm min-w-[200px] bg-white hover:bg-gray-50 cursor-pointer list-none [&::-webkit-details-marker]:hidden focus:outline-none focus:ring-2 focus:ring-blue-500">
          <span className="truncate">
            {selected.length === 0
              ? "Select Categories"
              : selected.length === categories.length
                ? "All Categories"
                : selected.length === 1
                  ? selected[0]
                  : `${selected.length} selected`}
          </span>
          <svg
            className="w-4 h-4 shrink-0 text-gray-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-[340px] max-w-[calc(100vw-3rem)] overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-700">
              Select Categories ({selected.length}/{categories.length})
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onChange([...categories])}
                disabled={selected.length === categories.length}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => onChange([])}
                disabled={selected.length === 0}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {categories.map((category) => (
              <label
                key={category}
                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(category)}
                  onChange={() =>
                    onChange(
                      selected.includes(category)
                        ? selected.filter((item) => item !== category)
                        : [...selected, category],
                    )
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 select-none">
                  {category}
                </span>
              </label>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

interface CategoryTrendChartProps {
  type: "income" | "expense";
  currency?: string;
  title?: string;
  heightClass?: string;
}

interface CategoryTrendData {
  month: string;
  formattedMonth: string;
  value: number;
  transactionCount: number;
  averageAmount: number;
  minAmount: number;
  maxAmount: number;
  percentageOfTotal: number;
}

// Colors for different chart types
const CHART_COLORS = {
  income: ["#10b981", "#2563eb", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899"],
  expense: ["#ef4444", "#2563eb", "#8b5cf6", "#f59e0b", "#06b6d4", "#10b981"],
};

export const CategoryTrendChart = React.memo<CategoryTrendChartProps>(
  ({ type, currency = "USD", title, heightClass }) => {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const {
      categoryData,
      getCategoryList,
      getMonthlyDataForCategory,
      formatTimePeriod,
      filteredIncomes,
      filteredExpenses,
      totals,
    } = useChartData();

    const [categorySelection, setCategorySelection] = useState<string[] | null>(
      null,
    );

    // Get available categories for the specified type
    const availableCategories = useMemo(() => {
      const allCategories = getCategoryList(type);

      // Filter categories that have data and sort by total amount
      const categoriesWithData = allCategories
        .map((categoryName) => ({
          name: categoryName,
          total: categoryData[categoryName]
            ? type === "income"
              ? categoryData[categoryName].income
              : categoryData[categoryName].expenses
            : 0,
        }))
        .filter((cat) => cat.total > 0)
        .sort((a, b) => b.total - a.total);

      return categoriesWithData.map((cat) => cat.name);
    }, [categoryData, getCategoryList, type]);

    // Keep explicit empty selections, and ignore categories removed by dashboard filters.
    const selectedCategories = useMemo(
      () =>
        categorySelection === null
          ? availableCategories
          : categorySelection.filter((category) =>
              availableCategories.includes(category),
            ),
      [categorySelection, availableCategories],
    );

    // Prepare a separate series and statistics for each selected category.
    const categorySeries = useMemo(
      () =>
        selectedCategories.map((selectedCategory, index) => {
          // Get monthly data for the selected category
          const monthlyData = getMonthlyDataForCategory(selectedCategory, type);
          const transactions =
            type === "income" ? filteredIncomes : filteredExpenses;
          const totalAmount =
            type === "income" ? totals.income : totals.expenses;

          const data: CategoryTrendData[] = monthlyData.map((month) => {
            const monthValue =
              type === "income" ? month.income : month.expenses;
            // Use the transaction count from the monthly data instead of manually filtering
            const transactionCount =
              type === "income" ? month.incomeCount : month.expenseCount;

            // Get transactions for this month and category for min/max calculations
            const monthStart = new Date(month.date);
            const monthEnd = new Date(
              monthStart.getFullYear(),
              monthStart.getMonth() + 1,
              1,
            );

            const monthTransactions = transactions.filter((transaction) => {
              const transactionDate = new Date(transaction.date);
              const categoryMatch =
                transaction.category?.name === selectedCategory;
              const dateMatch =
                transactionDate >= monthStart && transactionDate < monthEnd;
              return categoryMatch && dateMatch;
            });

            const amounts = monthTransactions.map((t) => t.amount);
            const averageAmount =
              transactionCount > 0 ? monthValue / transactionCount : 0;
            const minAmount = amounts.length > 0 ? Math.min(...amounts) : 0;
            const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;
            const percentageOfTotal =
              totalAmount > 0 ? (monthValue / totalAmount) * 100 : 0;

            return {
              month: month.monthKey,
              formattedMonth: month.formattedMonth,
              value: monthValue,
              transactionCount,
              averageAmount,
              minAmount,
              maxAmount,
              percentageOfTotal,
            };
          });
          return {
            category: selectedCategory,
            key: `category${index}`,
            color:
              CHART_COLORS[type][
                availableCategories.indexOf(selectedCategory) %
                  CHART_COLORS[type].length
              ],
            data,
            totalValue: data.reduce((sum, month) => sum + month.value, 0),
            totalTransactions: transactions.filter(
              (transaction) => transaction.category?.name === selectedCategory,
            ).length,
          };
        }),
      [
        selectedCategories,
        availableCategories,
        getMonthlyDataForCategory,
        type,
        filteredIncomes,
        filteredExpenses,
        totals,
      ],
    );

    // Align all series by month, filling months without transactions with zero.
    const chartData = useMemo(() => {
      const months = new Map<
        string,
        {
          month: string;
          formattedMonth: string;
          [key: string]: string | number;
        }
      >();
      categorySeries.forEach((series) =>
        series.data.forEach((point) => {
          if (!months.has(point.month)) {
            months.set(point.month, {
              month: point.month,
              formattedMonth: point.formattedMonth,
            });
          }
          months.get(point.month)![series.key] = point.value;
        }),
      );
      return [...months.values()]
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((month) => {
          categorySeries.forEach((series) => {
            month[series.key] ??= 0;
          });
          return month;
        });
    }, [categorySeries]);

    const maxValue = Math.max(
      0,
      ...categorySeries.flatMap((series) =>
        series.data.map((point) => point.value),
      ),
    );
    const totalValue = categorySeries.reduce(
      (sum, series) => sum + series.totalValue,
      0,
    );
    const totalTransactions = categorySeries.reduce(
      (sum, series) => sum + series.totalTransactions,
      0,
    );

    // Compact monthly values, with scrolling for larger category selections.
    const CustomTooltip = useCallback(
      ({
        active,
        payload,
        label,
      }: {
        active?: boolean;
        payload?: Array<{ payload?: { month: string } }>;
        label?: string;
      }) => {
        if (!active || !payload?.length) return null;
        const month = payload[0]?.payload?.month;
        return (
          <div
            className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg w-80 max-w-[85vw]"
            style={{
              maxHeight: "min(60vh, 360px)",
              overflowY: "auto",
              overscrollBehavior: "contain",
              pointerEvents: "auto",
            }}
            tabIndex={0}
            aria-label="Category trend details"
          >
            <div className="font-semibold text-gray-900 mb-2 text-sm">
              {label}
            </div>
            <div className="space-y-2">
              {categorySeries.map((series) => {
                const point = series.data.find(
                  (point) => point.month === month,
                );
                const count = point?.transactionCount ?? 0;
                return (
                  <div
                    key={series.key}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                        style={{ backgroundColor: series.color }}
                      />
                      <div className="min-w-0">
                        <div className="text-gray-700 break-words">
                          {series.category}
                        </div>
                        <div className="text-xs text-gray-500">
                          {count} transaction{count === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>
                    <span className="font-medium whitespace-nowrap">
                      {formatCurrency(point?.value ?? 0, currency || "USD")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      },
      [currency, categorySeries],
    );

    // Format Y axis ticks
    const formatYAxisTick = useCallback(
      (value: number) => {
        if (value >= 1000000) {
          return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
          return `${(value / 1000).toFixed(1)}K`;
        }
        return formatCurrency(value, currency || "USD").replace(/\$/, "");
      },
      [currency],
    );

    // Enhanced CSV data for export with detailed statistics
    const csvData = useMemo(() => {
      if (categorySeries.length === 0) return [];
      const headers = [
        "Month",
        "Category",
        "Amount",
        "Transactions",
        "Average per Transaction",
        "Min Amount",
        "Max Amount",
        "% of Total",
      ];
      const rows = chartData.flatMap((month) =>
        categorySeries.map((series) => {
          const point = series.data.find(
            (point) => point.month === month.month,
          );
          return [
            month.formattedMonth,
            series.category,
            (point?.value ?? 0).toString(),
            (point?.transactionCount ?? 0).toString(),
            (point?.averageAmount ?? 0).toFixed(2),
            (point?.minAmount ?? 0).toFixed(2),
            (point?.maxAmount ?? 0).toFixed(2),
            (point?.percentageOfTotal ?? 0).toFixed(1) + "%",
          ];
        }),
      );
      return [headers, ...rows];
    }, [chartData, categorySeries]);

    // Chart titles and text
    const timePeriodText = formatTimePeriod();
    const defaultTitle =
      type === "income" ? "Income Category Trends" : "Expense Category Trends";

    const chartTitle =
      totalTransactions > 0
        ? `${title || defaultTitle} ${timePeriodText} • ${totalTransactions} transaction${totalTransactions !== 1 ? "s" : ""}`
        : `${title || defaultTitle} ${timePeriodText}`;
    const tooltipText =
      type === "income"
        ? "Track how your income categories change over time with detailed statistics including transaction counts, averages, ranges, and percentages. Hover over data points for comprehensive insights."
        : "Monitor spending patterns across different expense categories with detailed statistics including transaction counts, averages, ranges, and percentages. Hover over data points for comprehensive insights.";

    // Chart content
    const ChartContent = useCallback(
      () => (
        <div>
          {/* Category selector and summary */}
          <div className="space-y-4">
            {/* Multi-select category dropdown. */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CategoryMultiSelect
                categories={availableCategories}
                selected={selectedCategories}
                onChange={setCategorySelection}
              />

              {/* Enhanced selected category summary */}
              {selectedCategories.length > 0 && (
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[type][0] }}
                  />
                  <div>
                    <p className="text-xs text-gray-600">
                      {selectedCategories.length === 1
                        ? selectedCategories[0]
                        : `${selectedCategories.length} categories`}{" "}
                      • {totalTransactions} transaction
                      {totalTransactions !== 1 ? "s" : ""}
                    </p>
                    <p
                      className={`text-sm font-semibold ${type === "income" ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(totalValue, currency || "USD")}
                    </p>
                    {totalTransactions > 0 && (
                      <p className="text-xs text-gray-500">
                        Avg:{" "}
                        {formatCurrency(
                          totalValue / totalTransactions,
                          currency || "USD",
                        )}{" "}
                        per transaction
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedCategories.length === 0 && (
            <p className="py-4 text-sm text-gray-500">
              Select one or more categories to view trends.
            </p>
          )}
          {/* Chart */}
          <div
            ref={chartRef}
            className={
              isExpanded
                ? "h-[60vh] w-full"
                : (heightClass ?? "h-[28rem] sm:h-[36rem] w-full")
            }
            role="img"
            aria-label={`${selectedCategories.join(", ")} ${type === "income" ? "income" : "expense"} trend chart ${timePeriodText.toLowerCase()}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  strokeWidth={2}
                  horizontal={true}
                  vertical={true}
                />
                <XAxis
                  dataKey="formattedMonth"
                  tick={{ fontSize: 12 }}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                  stroke="#666"
                />
                <YAxis
                  tickFormatter={formatYAxisTick}
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                  domain={[0, maxValue > 0 ? maxValue * 1.1 : 1]}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  wrapperStyle={{ pointerEvents: "auto", zIndex: 50 }}
                />

                {categorySeries.map((series) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    stroke={series.color}
                    strokeWidth={3}
                    dot={{ fill: series.color, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                    connectNulls={false}
                    name={series.category}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ),
      [
        chartData,
        categorySeries,
        selectedCategories,
        availableCategories,
        maxValue,
        totalValue,
        totalTransactions,
        isExpanded,
        heightClass,
        timePeriodText,
        CustomTooltip,
        formatYAxisTick,
        type,
        currency,
      ],
    );

    if (availableCategories.length === 0) {
      return (
        <div
          className="bg-white rounded-lg shadow p-6"
          data-chart-type={
            type === "expense" ? "expense-trend" : "income-trend"
          }
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {chartTitle}
            </h3>
          </div>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No category trend data available
          </div>
        </div>
      );
    }

    return (
      <>
        <div
          className="bg-white rounded-lg shadow p-3 sm:p-6"
          data-chart-type={
            type === "expense" ? "expense-trend" : "income-trend"
          }
        >
          <ChartControls
            chartRef={chartRef}
            isExpanded={isExpanded}
            onToggleExpanded={toggleExpanded}
            fileName={`${type}-category-trend-chart`}
            csvData={csvData}
            csvFileName={`${type}-category-trend-data`}
            title={chartTitle}
            tooltipText={tooltipText}
          />
          {ChartContent()}
        </div>

        {/* Full screen modal */}
        {isExpanded && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-[95%] w-full max-h-[95%] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-semibold">{chartTitle}</h2>
                  <p className="text-sm text-gray-500">{tooltipText}</p>
                </div>
                <button
                  onClick={toggleExpanded}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
              {ChartContent()}
            </div>
          </div>
        )}
      </>
    );
  },
);

CategoryTrendChart.displayName = "CategoryTrendChart";
