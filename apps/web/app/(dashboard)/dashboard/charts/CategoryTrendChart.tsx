"use client";

import React, { useRef, useMemo, useCallback, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "../../../utils/currency";
import { useChartData } from "../../../hooks/useChartDataContext";
import { ChartControls } from "../../../components/ChartControls";
import { useChartExpansion } from "../../../utils/chartUtils";

interface CategoryTrendChartProps {
  type: 'income' | 'expense';
  currency?: string;
  title?: string;
  heightClass?: string;
}

interface CategoryTrendData {
  month: string;
  formattedMonth: string;
  value: number;
}

// Colors for different chart types
const CHART_COLORS = {
  income: '#10b981', // Green for income
  expense: '#ef4444' // Red for expenses
};

export const CategoryTrendChart = React.memo<CategoryTrendChartProps>(({ 
  type, 
  currency = "USD", 
  title, 
  heightClass 
}) => {
  const { isExpanded, toggleExpanded } = useChartExpansion();
  const chartRef = useRef<HTMLDivElement>(null);
  const { categoryData, getCategoryList, getMonthlyDataForCategory, formatTimePeriod } = useChartData();
  
  // State for selected category
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  
  // Get available categories for the specified type
  const availableCategories = useMemo(() => {
    const allCategories = getCategoryList(type);
    
    // Filter categories that have data and sort by total amount
    const categoriesWithData = allCategories
      .map(categoryName => ({
        name: categoryName,
        total: categoryData[categoryName] ? 
          (type === 'income' ? categoryData[categoryName].income : categoryData[categoryName].expenses) : 0
      }))
      .filter(cat => cat.total > 0)
      .sort((a, b) => b.total - a.total);
    
    return categoriesWithData.map(cat => cat.name);
  }, [categoryData, getCategoryList, type]);

  // Auto-select random category if none selected and categories are available
  React.useEffect(() => {
    if (!selectedCategory && availableCategories.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCategories.length);
      const randomCategory = availableCategories[randomIndex];
      if (randomCategory) {
        setSelectedCategory(randomCategory);
      }
    }
  }, [availableCategories, selectedCategory]);

  // Prepare chart data for selected category
  const chartData = useMemo((): CategoryTrendData[] => {
    if (!selectedCategory) return [];

    // Get monthly data for the selected category
    const monthlyData = getMonthlyDataForCategory(selectedCategory, type);

    return monthlyData.map(month => ({
      month: month.monthKey,
      formattedMonth: month.formattedMonth,
      value: type === 'income' ? month.income : month.expenses
    }));
  }, [selectedCategory, getMonthlyDataForCategory, type]);

  // Memoize calculations
  const { maxValue, totalValue } = useMemo(() => {
    let maxValue = 0;
    let totalValue = 0;

    chartData.forEach(dataPoint => {
      maxValue = Math.max(maxValue, dataPoint.value);
      totalValue += dataPoint.value;
    });

    return { maxValue, totalValue };
  }, [chartData]);

  // Custom tooltip
  const CustomTooltip = useCallback(({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ dataKey: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length || !selectedCategory) return null;

    const value = payload[0]?.value;
    if (!value) return null;

    return (
      <div className="bg-white border border-gray-300 rounded p-3 shadow-lg">
        <p className="text-gray-900 font-medium mb-2">{label}</p>
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: CHART_COLORS[type] }}
          />
          <span className="text-sm text-gray-700">{selectedCategory}</span>
          <span className="text-sm font-medium text-gray-900 ml-auto">
            {formatCurrency(value, currency || "USD")}
          </span>
        </div>
      </div>
    );
  }, [currency, selectedCategory, type]);

  // Format Y axis ticks
  const formatYAxisTick = useCallback((value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return formatCurrency(value, currency || "USD").replace(/\$/, '');
  }, [currency]);

  // CSV data for export
  const csvData = useMemo(() => {
    if (chartData.length === 0 || !selectedCategory) return [];
    
    const headers = ['Month', selectedCategory];
    const rows = chartData.map(dataPoint => [
      dataPoint.formattedMonth,
      dataPoint.value
    ]);
    
    return [headers, ...rows];
  }, [chartData, selectedCategory]);

  // Chart titles and text
  const timePeriodText = formatTimePeriod();
  const defaultTitle = type === 'income' ? 'Income Category Trends' : 'Expense Category Trends';
  const chartTitle = `${title || defaultTitle} ${timePeriodText}`;
  const tooltipText = type === 'income' 
    ? 'Track how your income categories change over time'
    : 'Monitor spending patterns across different expense categories';

  // Chart content
  const ChartContent = useCallback(() => (
    <div>
      {/* Category selector and summary */}
      <div className="space-y-4">
        {/* Dropdown for category selection */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="category-select" className="text-sm font-medium text-gray-700">
              Select Category:
            </label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {availableCategories.map(categoryName => (
                <option key={categoryName} value={categoryName}>
                  {categoryName}
                </option>
              ))}
            </select>
          </div>
          
          {/* Selected category summary */}
          {selectedCategory && (
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: CHART_COLORS[type] }}
              />
              <div>
                <p className="text-xs text-gray-600">Total for {selectedCategory}</p>
                <p className={`text-sm font-semibold ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalValue, currency || "USD")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div 
        ref={chartRef}
        className={isExpanded ? "h-[60vh] w-full" : (heightClass ?? "h-[28rem] sm:h-[36rem] w-full")}
        role="img"
        aria-label={`${selectedCategory} ${type === 'income' ? 'income' : 'expense'} trend chart ${timePeriodText.toLowerCase()}`}
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
              domain={[0, maxValue * 1.1]}
            />
            <Tooltip content={<CustomTooltip />} />
            
            <Line
              type="monotone"
              dataKey="value"
              stroke={CHART_COLORS[type]}
              strokeWidth={3}
              dot={{ fill: CHART_COLORS[type], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
              connectNulls={false}
              name={selectedCategory}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  ), [chartData, selectedCategory, availableCategories, maxValue, totalValue, isExpanded, heightClass, timePeriodText, CustomTooltip, formatYAxisTick, type, currency]);

  if (availableCategories.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6" data-chart-type={type === 'expense' ? 'expense-trend' : 'income-trend'}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{chartTitle}</h3>
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No category trend data available
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-3 sm:p-6" data-chart-type={type === 'expense' ? 'expense-trend' : 'income-trend'}>
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
        <ChartContent />
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
            <ChartContent />
          </div>
        </div>
      )}
    </>
  );
});

CategoryTrendChart.displayName = 'CategoryTrendChart';
