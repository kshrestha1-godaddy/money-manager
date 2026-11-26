"use client";

import { useMemo } from "react";
import type { Expense, Income } from "../../types/financial";
import { useBubbleChart } from '../../hooks/useBubbleChart';
import { useDisplayCurrency } from "../../hooks/useDisplayCurrency";
import { BubbleChartControls } from './BubbleChartControls';
import { BubbleChart } from './BubbleChart';
import { BubbleChartZoomControls } from './BubbleChartZoomControls';

interface TransactionCategoryAnalysisProps {
  transactions: (Income | Expense)[];
  timeframeTransactions: (Income | Expense)[];
  currency: string;
  timezone: string;
  type: "income" | "expense";
}

const chartConfig = {
  income: { highValueThreshold: 50000, defaultColor: "#4285f4", thresholdColor: "#059669", title: "Income Categories Analysis" },
  expense: { highValueThreshold: 20000, defaultColor: "#f56565", thresholdColor: "#dc2626", title: "Expense Categories Analysis" },
};

export function TransactionCategoryAnalysis({
  transactions,
  timeframeTransactions,
  currency,
  timezone,
  type,
}: TransactionCategoryAnalysisProps) {
  const { accountCurrency, toDisplayAmount } = useDisplayCurrency();
  const config = useMemo(
    () => ({
      ...chartConfig[type],
      highValueThreshold: toDisplayAmount(
        chartConfig[type].highValueThreshold,
        accountCurrency
      ),
    }),
    [accountCurrency, toDisplayAmount, type]
  );
  const chartData = useBubbleChart({ transactions, timeframeTransactions, currency, timezone, config });

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
    setMonthToDate,
    setTableTimeframe,
    usesTableTimeframe,
    isMonthToDate,
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
          {config.title}
        </h3>
      </div>

      <BubbleChartControls
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        handleQuickFilter={handleQuickFilter}
        isActiveQuickFilter={isActiveQuickFilter}
        clearTimeframeFilters={() => {
          clearTimeframeFilters();
          resetToDefaults();
        }}
        onMonthToDate={() => {
          setMonthToDate();
          resetToDefaults();
        }}
        isMonthToDate={isMonthToDate}
        onTableView={() => {
          setTableTimeframe();
          resetToDefaults();
        }}
        usesTableTimeframe={usesTableTimeframe}
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

      <BubbleChartZoomControls chartData={chartData} chartLabel={type} />

      <BubbleChart
        onWheelZoom={chartData.handleWheelZoom}
        panEnabled={chartData.zoomLevel > 1 && visibleCategoryData.length > 0}
        isPanning={chartData.isPanning}
        panHandlers={{
          onPointerDown: chartData.handlePanStart,
          onPointerMove: chartData.handlePanMove,
          onPointerUp: chartData.handlePanEnd,
          onPointerCancel: chartData.handlePanEnd,
          onLostPointerCapture: chartData.handlePanEnd,
          onDoubleClick: chartData.handleDoubleClickZoom,
          onKeyDown: chartData.handleChartKeyDown
        }}
        chartRef={chartRef}
        isLoading={isLoading}
        loadError={chartData.loadError}
        retryLoad={chartData.retryLoad}
        dimensions={dimensions}
        allCategoryData={allCategoryData}
        visibleCategoryData={visibleCategoryData}
        thresholdPosition={thresholdPosition}
        currency={currency}
        title={config.title}
        highValueThreshold={config.highValueThreshold}
        thresholdColor={config.thresholdColor}
      />
    </div>
  );
}
