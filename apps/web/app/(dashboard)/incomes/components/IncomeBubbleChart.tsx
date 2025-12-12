"use client";

import { Income } from '../../../types/financial';
import { useBubbleChart } from '../../../hooks/useBubbleChart';
import { BubbleChartControls } from '../../../components/shared/BubbleChartControls';
import { BubbleChart } from '../../../components/shared/BubbleChart';

interface IncomeBubbleChartProps {
  incomes: Income[];
  currency: string;
  hasActiveFilters?: boolean;
}

const INCOME_CONFIG = {
  highValueThreshold: 50000,
  defaultColor: '#4285f4',
  thresholdColor: '#059669',
  title: 'Income Categories Analysis'
};

export function IncomeBubbleChart({ incomes, currency }: IncomeBubbleChartProps) {
  const chartData = useBubbleChart({
    transactions: incomes,
    currency,
    config: INCOME_CONFIG
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
    isDefaultTimeframe
  } = chartData;

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${dimensions.width < 640 ? 'p-4' : 'p-6'} mb-6 w-full`}>
      <div className="mb-4">
        <h3 className={`${dimensions.width < 640 ? 'text-base' : 'text-lg'} font-semibold text-gray-900 mb-4`}>
          {INCOME_CONFIG.title}
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
        title={INCOME_CONFIG.title}
        highValueThreshold={INCOME_CONFIG.highValueThreshold}
        thresholdColor={INCOME_CONFIG.thresholdColor}
      />
    </div>
  );
}
