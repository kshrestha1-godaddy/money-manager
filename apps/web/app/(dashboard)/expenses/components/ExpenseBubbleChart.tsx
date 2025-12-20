"use client";

import { Expense } from '../../../types/financial';
import { useBubbleChart } from '../../../hooks/useBubbleChart';
import { BubbleChartControls } from '../../../components/shared/BubbleChartControls';
import { BubbleChart } from '../../../components/shared/BubbleChart';

interface ExpenseBubbleChartProps {
  expenses: Expense[];
  currency: string;
  hasActiveFilters?: boolean;
}

const EXPENSE_CONFIG = {
  highValueThreshold: 20000,
  defaultColor: '#f56565',
  thresholdColor: '#dc2626',
  title: 'Expense Categories Analysis'
};

export function ExpenseBubbleChart({ expenses, currency }: ExpenseBubbleChartProps) {
  const chartData = useBubbleChart({
    transactions: expenses,
    currency,
    config: EXPENSE_CONFIG
  });

  const {
    chartRef,
    isLoading,
    dimensions,
    showAxisControls,
    setShowAxisControls,
    customXRange,
    customYRange,
    excludedCategories,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    minAverage,
    maxAverage,
    allCategoryData,
    visibleCategoryData,
    highValueCategories,
    thresholdPosition,
    toggleCategoryExclusion,
    includeAllCategories,
    excludeAllHighValueCategories,
    handleQuickFilter,
    isActiveQuickFilter,
    clearTimeframeFilters,
    handleXRangeChange,
    handleYRangeChange,
    resetToDefaults,
    handleMinAverageChange,
    handleMaxAverageChange,
    resetAverageFilters,
    isDefaultTimeframe
  } = chartData;

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${dimensions.width < 640 ? 'p-4' : 'p-6'} mb-6 w-full`}>
      <div className="mb-4">
        <h3 className={`${dimensions.width < 640 ? 'text-base' : 'text-lg'} font-semibold text-gray-900 mb-4`}>
          {EXPENSE_CONFIG.title}
        </h3>
      </div>

      <BubbleChartControls
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        handleQuickFilter={handleQuickFilter}
        isActiveQuickFilter={isActiveQuickFilter}
        clearTimeframeFilters={clearTimeframeFilters}
        isDefaultTimeframe={isDefaultTimeframe}
        minAverage={minAverage}
        maxAverage={maxAverage}
        handleMinAverageChange={handleMinAverageChange}
        handleMaxAverageChange={handleMaxAverageChange}
        resetAverageFilters={resetAverageFilters}
        highValueCategories={highValueCategories}
        excludedCategories={excludedCategories}
        toggleCategoryExclusion={toggleCategoryExclusion}
        includeAllCategories={includeAllCategories}
        excludeAllHighValueCategories={excludeAllHighValueCategories}
        currency={currency}
        showAxisControls={showAxisControls}
        setShowAxisControls={setShowAxisControls}
        customXRange={customXRange}
        customYRange={customYRange}
        handleXRangeChange={handleXRangeChange}
        handleYRangeChange={handleYRangeChange}
        resetToDefaults={resetToDefaults}
      />

      <BubbleChart
        chartRef={chartRef}
        isLoading={isLoading}
        dimensions={dimensions}
        allCategoryData={allCategoryData}
        visibleCategoryData={visibleCategoryData}
        highValueCategories={highValueCategories}
        excludedCategories={excludedCategories}
        thresholdPosition={thresholdPosition}
        toggleCategoryExclusion={toggleCategoryExclusion}
        includeAllCategories={includeAllCategories}
        currency={currency}
        title={EXPENSE_CONFIG.title}
        highValueThreshold={EXPENSE_CONFIG.highValueThreshold}
        thresholdColor={EXPENSE_CONFIG.thresholdColor}
      />
    </div>
  );
}
