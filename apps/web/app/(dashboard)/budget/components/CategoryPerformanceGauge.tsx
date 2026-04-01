"use client";

import React, { memo, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '../../../utils/currency';

// Core data interfaces
interface BudgetComparisonData {
  categoryName: string;
  categoryType: 'EXPENSE' | 'INCOME';
  actualSpending: {
    monthlyAverage: number;
    totalAmount: number;
    transactionCount: number;
  };
  budgetTarget: {
    monthlySpend: number;
    impliedAnnualSpend: number;
  };
  variance: {
    amount: number;
    percentage: number;
    status: 'over' | 'under' | 'on-track';
  };
}

interface CategoryPerformanceGaugeProps {
  budgetData: BudgetComparisonData[];
  currency: string;
  categoryType?: 'EXPENSE' | 'INCOME' | 'ALL';
  selectedMonth?: number;
  selectedYear?: number;
  isLoading?: boolean;
  allCategories?: Array<{ name: string; type: string; includedInBudget: boolean }>;
}

// Optimized chart data interface
interface ChartDataPoint {
  categoryName: string;
  utilization: number;
  actual: number;
  budget: number;
  status: 'over' | 'under' | 'on-track';
  categoryType: 'EXPENSE' | 'INCOME';
  difference: number;
  isOverBudget: boolean;
}

// Chart configuration interface
interface ChartConfig {
  barHeight: number;
  barSpacing: number;
  leftMargin: number;
  rightMargin: number;
  topMargin: number;
  bottomMargin: number;
  /** Upper bound of the horizontal scale (may be below the largest value when outliers are capped) */
  axisMax: number;
  chartWidth: number;
  chartHeight: number;
  chartAreaWidth: number;
  chartAreaHeight: number;
}

/** When one category dominates (e.g. 1700% vs 200%), cap the axis so other bars stay readable. */
function computeAxisMax(utilizations: number[]): number {
  if (utilizations.length === 0) return 120;
  const sorted = [...utilizations].sort((a, b) => b - a);
  const maxU = sorted[0] ?? 0;
  const secondU = sorted[1] ?? maxU;
  const thirdU = sorted[2] ?? secondU;

  if (maxU <= 200) {
    return Math.max(120, Math.ceil(maxU / 25) * 25 + 25);
  }

  const ratio = secondU > 0 ? maxU / secondU : Infinity;
  const typicalHigh = Math.max(secondU, thirdU * 1.15);

  if (ratio >= 3 || maxU > 500) {
    const capFromPeers = Math.ceil((typicalHigh * 2.2) / 25) * 25;
    return Math.max(200, Math.min(380, capFromPeers));
  }

  return Math.min(650, Math.ceil(maxU / 50) * 50 + 50);
}

function generateAxisTicks(axisMax: number): number[] {
  const maxTicks = 9;
  const rawStep = axisMax / Math.max(1, maxTicks - 1);
  const step = Math.max(25, Math.ceil(rawStep / 25) * 25);
  const ticks: number[] = [];
  for (let v = 0; v <= axisMax + 0.001; v += step) {
    ticks.push(Math.round(v * 10) / 10);
  }
  const last = ticks[ticks.length - 1];
  if (last !== undefined && last < axisMax - 0.01) {
    ticks.push(axisMax);
  }
  const deduped = ticks.filter((v, i, a) => i === 0 || v !== a[i - 1]);
  return deduped;
}

// Custom hooks for optimized data processing
function useChartData(
  budgetData: BudgetComparisonData[], 
  categoryType: 'EXPENSE' | 'INCOME' | 'ALL',
  allCategories?: Array<{ name: string; type: string; includedInBudget: boolean }>
): ChartDataPoint[] {
  return useMemo(() => {
    let filteredData = budgetData.filter(item => item.budgetTarget.monthlySpend > 0);
    
    // Filter out categories that are marked as hidden in category management
    if (allCategories) {
      filteredData = filteredData.filter(item => {
        const category = allCategories.find(cat => cat.name === item.categoryName);
        return category ? category.includedInBudget : true; // Include if category not found (fallback)
      });
    }
    
    if (categoryType !== 'ALL') {
      filteredData = filteredData.filter(item => item.categoryType === categoryType);
    }
    
    const processedData = filteredData.map(item => {
      const utilization = Math.round(
        (item.actualSpending.monthlyAverage / item.budgetTarget.monthlySpend) * 1000
      ) / 10;
      
      return {
        categoryName: item.categoryName,
        utilization,
        actual: item.actualSpending.monthlyAverage,
        budget: item.budgetTarget.monthlySpend,
        status: item.variance.status,
        categoryType: item.categoryType,
        difference: item.actualSpending.monthlyAverage - item.budgetTarget.monthlySpend,
        isOverBudget: utilization > 100,
      };
    });
    
    // Sort: expenses first (by utilization desc), then incomes (by utilization desc)
    const expenses = processedData
      .filter(item => item.categoryType === 'EXPENSE')
      .sort((a, b) => b.utilization - a.utilization);
      
    const incomes = processedData
      .filter(item => item.categoryType === 'INCOME')
      .sort((a, b) => b.utilization - a.utilization);
    
    return [...expenses, ...incomes];
  }, [budgetData, categoryType, allCategories]);
}

function useChartConfig(chartData: ChartDataPoint[], containerWidth: number): ChartConfig {
  return useMemo(() => {
    const barHeight = 24;
    const barSpacing = 42;
    const leftMargin = Math.max(180, containerWidth * 0.15);
    const rightMargin = Math.max(60, containerWidth * 0.06);
    const topMargin = 10;
    const bottomMargin = 60;
    
    const expenseCount = chartData.filter(item => item.categoryType === 'EXPENSE').length;
    const incomeCount = chartData.filter(item => item.categoryType === 'INCOME').length;
    const separatorSpace = (expenseCount > 0 && incomeCount > 0) ? 25 : 0;
    
    const chartAreaHeight = chartData.length * barSpacing + separatorSpace;
    const chartWidth = containerWidth;
    const chartHeight = chartAreaHeight + topMargin + bottomMargin;
    const chartAreaWidth = chartWidth - leftMargin - rightMargin;
    const axisMax = computeAxisMax(chartData.map((d) => d.utilization));

    return {
      barHeight,
      barSpacing,
      leftMargin,
      rightMargin,
      topMargin,
      bottomMargin,
      axisMax,
      chartWidth,
      chartHeight,
      chartAreaWidth,
      chartAreaHeight,
    };
  }, [chartData, containerWidth]);
}

function useNavigation(selectedMonth?: number, selectedYear?: number) {
  const router = useRouter();
  
  return useCallback((item: ChartDataPoint) => {
    const now = new Date();
    const targetYear = selectedYear ?? now.getFullYear();
    const targetMonth = selectedMonth ?? now.getMonth();
    
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0);
    
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    
    const targetPath = item.categoryType === 'EXPENSE' ? '/expenses' : '/incomes';
    const url = `${targetPath}?category=${encodeURIComponent(item.categoryName)}&startDate=${startDateStr}&endDate=${endDateStr}`;
    
    router.push(url);
  }, [router, selectedMonth, selectedYear]);
}

// Optimized sub-components
const ChartLegend = memo(() => (
  <div className="flex flex-wrap gap-4 mb-6 text-xs">
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 bg-blue-500 rounded"></div>
      <span className="text-gray-600">Under Budget (&lt;100%)</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 bg-green-500 rounded"></div>
      <span className="text-gray-600">At Budget (100%)</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex">
        <div className="w-2 h-3 bg-green-500 rounded-l"></div>
        <div className="w-2 h-3 bg-red-500 rounded-r"></div>
      </div>
      <span className="text-gray-600">Expense Over Budget - Red: Overspent</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex">
        <div className="w-2 h-3 bg-green-500 rounded-l"></div>
        <div className="w-2 h-3 bg-green-700 rounded-r"></div>
      </div>
      <span className="text-gray-600">Income Over Budget - Dark Green: Extra earned</span>
    </div>
  </div>
));

ChartLegend.displayName = 'ChartLegend';

interface ChartBarProps {
  item: ChartDataPoint;
  index: number;
  config: ChartConfig;
  currency: string;
  isLoading: boolean;
  onHover: (item: ChartDataPoint | null, event?: React.MouseEvent) => void;
  onClick: (item: ChartDataPoint) => void;
  expenseCount: number;
  hasSeperator: boolean;
}

const ChartBar = memo(({ 
  item, 
  index, 
  config, 
  currency, 
  isLoading, 
  onHover, 
  onClick, 
  expenseCount, 
  hasSeperator 
}: ChartBarProps) => {
  const { 
    barHeight, 
    barSpacing, 
    leftMargin, 
    topMargin, 
    chartAreaWidth, 
    axisMax 
  } = config;
  
  const separatorSpace = hasSeperator ? 25 : 0;
  const isIncome = item.categoryType === 'INCOME';
  const incomeOffset = isIncome && hasSeperator ? separatorSpace : 0;
  
  const rowCenterY = topMargin + (index * barSpacing) + (barSpacing / 2) + incomeOffset;
  const barY = rowCenterY - (barHeight / 2);
  
  const scaleX = (value: number) => (value / axisMax) * chartAreaWidth;
  const visualUtil = Math.min(item.utilization, axisMax);
  const isTruncated = item.utilization > axisMax + 0.05;
  const barWidth = Math.max(3, scaleX(visualUtil));
  
  const getBarColor = (utilization: number) => {
    if (utilization <= 0) return '#d1d5db';
    if (utilization < 100) return '#3b82f6';
    if (utilization === 100) return '#10b981';
    return '#ef4444';
  };

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (!isLoading) onHover(item, e);
  }, [item, isLoading, onHover]);

  const handleMouseLeave = useCallback(() => {
    if (!isLoading) onHover(null);
  }, [isLoading, onHover]);

  const handleClick = useCallback(() => {
    if (!isLoading) onClick(item);
  }, [item, isLoading, onClick]);

  // Render over-budget bars (split into base + excess); scale uses axisMax so outliers don't crush the chart
  if (item.isOverBudget) {
    const baseBarWidth = scaleX(100);
    const excessUtilization = Math.max(0, visualUtil - 100);
    const excessBarWidth = scaleX(excessUtilization);
    const excessBarX = leftMargin + 1 + baseBarWidth;
    
    const baseColor = '#10b981';
    const excessColor = isIncome ? '#059669' : '#ef4444';

    return (
      <g>
        {/* Category name */}
        <text
          x={leftMargin - 10}
          y={rowCenterY}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize="13"
          fill="#374151"
          fontWeight="500"
        >
          {item.categoryName}
        </text>

        {/* Base bar (0-100%) */}
        <rect
          x={leftMargin + 1}
          y={barY}
          width={baseBarWidth}
          height={barHeight}
          fill={baseColor}
          rx="4"
          ry="4"
          className={`transition-all duration-300 ${
            isLoading ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:opacity-90'
          }`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        />

        {/* Excess bar (over 100%) */}
        <rect
          x={excessBarX}
          y={barY}
          width={excessBarWidth}
          height={barHeight}
          fill={excessColor}
          rx="4"
          ry="4"
          className={`transition-all duration-300 ${
            isLoading ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:opacity-90'
          }`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        />

        {/* Percentage label (always true utilization, not the capped visual) */}
        <text
          x={Math.min(excessBarX + excessBarWidth + 12, leftMargin + chartAreaWidth + 4)}
          y={rowCenterY}
          dominantBaseline="middle"
          fontSize="13"
          fill="#374151"
          fontWeight="600"
        >
          {item.utilization}%
          {isTruncated ? ' *' : ''}
        </text>
      </g>
    );
  }

  // Render normal bars (under or at budget)
  return (
    <g>
      {/* Category name */}
      <text
        x={leftMargin - 10}
        y={rowCenterY}
        textAnchor="end"
        dominantBaseline="middle"
        fontSize="13"
        fill="#374151"
        fontWeight="500"
      >
        {item.categoryName}
      </text>

      {/* Remaining budget skeleton (if under budget) */}
      {item.utilization < 100 && (
        <rect
          x={leftMargin + 1 + barWidth}
          y={barY}
          width={scaleX(100 - item.utilization)}
          height={barHeight}
          fill="#f9fafb"
          stroke="#d1d5db"
          strokeWidth="1"
          strokeDasharray="4,4"
          rx="4"
          ry="4"
          opacity="0.6"
        />
      )}

      {/* Main bar */}
      <rect
        x={leftMargin + 1}
        y={barY}
        width={barWidth}
        height={barHeight}
        fill={getBarColor(item.utilization)}
        rx="4"
        ry="4"
        className={`transition-all duration-300 ${
          isLoading ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:opacity-90'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      {/* Percentage label */}
      {barWidth > 30 && (
        <text
          x={leftMargin + 1 + (barWidth / 2)}
          y={rowCenterY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fill="white"
          fontWeight="600"
        >
          {item.utilization}%
        </text>
      )}
    </g>
  );
});

ChartBar.displayName = 'ChartBar';

interface ChartGridProps {
  config: ChartConfig;
}

const ChartGrid = memo(({ config }: ChartGridProps) => {
  const { 
    leftMargin, 
    topMargin, 
    chartAreaWidth, 
    chartAreaHeight, 
    axisMax 
  } = config;
  
  const scaleX = (value: number) => (value / axisMax) * chartAreaWidth;
  
  const gridValues = generateAxisTicks(axisMax);

  return (
    <g>
      {gridValues.map((value) => {
        const x = leftMargin + scaleX(value);
        return (
          <g key={`tick-${value}`}>
            <line
              x1={x}
              y1={topMargin}
              x2={x}
              y2={topMargin + chartAreaHeight}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray={value === 0 ? "none" : "2,2"}
            />
            <text
              x={x}
              y={topMargin + chartAreaHeight + 20}
              textAnchor="middle"
              fontSize="12"
              fill="#6b7280"
              fontWeight="500"
            >
              {`${Math.round(value)}%`}
            </text>
          </g>
        );
      })}
      
      {/* 100% reference line */}
      {100 <= axisMax && (
        <line
          x1={leftMargin + scaleX(100)}
          y1={topMargin}
          x2={leftMargin + scaleX(100)}
          y2={topMargin + chartAreaHeight}
          stroke="#6b7280"
          strokeWidth="1"
          strokeDasharray="8,4"
          opacity="0.8"
        />
      )}
    </g>
  );
});

ChartGrid.displayName = 'ChartGrid';

interface ChartTooltipProps {
  item: ChartDataPoint | null;
  currency: string;
  mousePosition: { x: number; y: number };
}

const ChartTooltip = memo(({ item, currency, mousePosition }: ChartTooltipProps) => {
  if (!item) return null;

  const isIncome = item.categoryType === 'INCOME';
  const isOverBudget = item.isOverBudget;
  const isUnderBudget = item.utilization < 100;
  
  const differenceLabel = isIncome 
    ? (isOverBudget ? 'Extra Received:' : 'Shortfall:')
    : (isOverBudget ? 'Overspent:' : 'Remaining:');
  
  const differenceColor = isIncome
    ? (isOverBudget ? 'text-green-600' : 'text-red-600')
    : (isOverBudget ? 'text-red-600' : 'text-green-600');
  
  const utilizationColor = isIncome
    ? (isOverBudget ? 'text-green-600' : isUnderBudget ? 'text-red-600' : 'text-blue-600')
    : (isOverBudget ? 'text-red-600' : isUnderBudget ? 'text-blue-600' : 'text-green-600');

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: mousePosition.x + 10,
        top: mousePosition.y - 10,
        transform: 'translateY(-100%)'
      }}
    >
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-64">
        <div className="font-medium text-gray-900 mb-2">
          {item.categoryName}
          <span className="text-xs text-gray-500 ml-2">({item.categoryType})</span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Actual:</span>
            <span className="font-medium">{formatCurrency(item.actual, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Budget:</span>
            <span className="font-medium">{formatCurrency(item.budget, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{differenceLabel}</span>
            <span className={`font-medium ${differenceColor}`}>
              {formatCurrency(Math.abs(item.difference), currency)}
            </span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-1">
            <span className="text-gray-600">Utilization:</span>
            <span className={`font-bold ${utilizationColor}`}>
              {item.utilization}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

ChartTooltip.displayName = 'ChartTooltip';

// Custom hook for container width management
function useContainerWidth() {
  const [containerWidth, setContainerWidth] = useState(1200);
  
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    
    const updateWidth = () => {
      const width = node.getBoundingClientRect().width;
      setContainerWidth(Math.max(800, width - 32));
    };

    // Initial measurement
    updateWidth();

    // Set up ResizeObserver
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(node);

    // Cleanup
    return () => resizeObserver.disconnect();
  }, []);

  return { containerWidth, containerRef };
}

// Main optimized component
export const CategoryPerformanceGauge = memo(({ 
  budgetData, 
  currency, 
  categoryType = 'ALL',
  selectedMonth,
  selectedYear,
  isLoading = false,
  allCategories
}: CategoryPerformanceGaugeProps) => {
  const [hoveredItem, setHoveredItem] = useState<ChartDataPoint | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Use custom hooks
  const { containerWidth, containerRef } = useContainerWidth();
  const chartData = useChartData(budgetData, categoryType, allCategories);
  const config = useChartConfig(chartData, containerWidth);
  const navigate = useNavigation(selectedMonth, selectedYear);

  const hasCappedScale = useMemo(
    () => chartData.some((d) => d.utilization > config.axisMax + 0.01),
    [chartData, config.axisMax],
  );

  // Memoized calculations
  const { expenseCount, incomeCount, hasSeperator } = useMemo(() => {
    const expenses = chartData.filter(item => item.categoryType === 'EXPENSE').length;
    const incomes = chartData.filter(item => item.categoryType === 'INCOME').length;
    return {
      expenseCount: expenses,
      incomeCount: incomes,
      hasSeperator: expenses > 0 && incomes > 0
    };
  }, [chartData]);

  // Optimized event handlers
  const handleHover = useCallback((item: ChartDataPoint | null, event?: React.MouseEvent) => {
    setHoveredItem(item);
    if (event) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  }, []);

  // Early return for empty data
  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Category Performance Gauge
        </h3>
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p>No budget targets set for categories</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 w-full"
      onMouseMove={handleMouseMove}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Category Performance Gauge
          {categoryType !== 'ALL' && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              ({categoryType.toLowerCase()} categories)
            </span>
          )}
        </h3>
      </div>
      
      <ChartLegend />

      {hasCappedScale && (
        <p className="text-xs text-gray-500 mb-4 max-w-3xl leading-relaxed">
          The horizontal scale stops at {Math.round(config.axisMax)}% of budget so most categories stay readable. Values
          beyond that still show their full percentage next to each bar (marked with *).
        </p>
      )}

      {/* Chart Container */}
      <div className="relative w-full">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10 rounded-lg">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm text-gray-600">Updating chart data...</p>
            </div>
          </div>
        )}
        
        <svg 
          width="100%" 
          height={config.chartHeight}
          className={`bg-white w-full transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}
          viewBox={`0 0 ${config.chartWidth} ${config.chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <ChartGrid config={config} />

          {/* Separator line between expenses and incomes */}
          {hasSeperator && (
            <g>
              <line
                x1={0}
                y1={config.topMargin + (expenseCount * config.barSpacing) + 12.5}
                x2={config.leftMargin + config.chartAreaWidth}
                y2={config.topMargin + (expenseCount * config.barSpacing) + 12.5}
                stroke="#d1d5db"
                strokeWidth="2"
                strokeDasharray="6,4"
              />
              <text
                x={25}
                y={config.topMargin + (expenseCount * config.barSpacing) / 2}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
                fontWeight="600"
                transform={`rotate(-90, 25, ${config.topMargin + (expenseCount * config.barSpacing) / 2})`}
              >
                EXPENSES
              </text>
              <text
                x={25}
                y={config.topMargin + (expenseCount * config.barSpacing) + 25 + (incomeCount * config.barSpacing) / 2}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
                fontWeight="600"
                transform={`rotate(-90, 25, ${config.topMargin + (expenseCount * config.barSpacing) + 25 + (incomeCount * config.barSpacing) / 2})`}
              >
                INCOMES
              </text>
            </g>
          )}

          {/* Chart bars */}
          <g className={`transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
            {chartData.map((item, index) => (
              <ChartBar
                key={item.categoryName}
                item={item}
                index={index}
                config={config}
                currency={currency}
                isLoading={isLoading}
                onHover={handleHover}
                onClick={navigate}
                expenseCount={expenseCount}
                hasSeperator={hasSeperator}
              />
            ))}
          </g>

          {/* X-axis title */}
          <text
            x={config.leftMargin + config.chartAreaWidth / 2}
            y={config.chartHeight - 15}
            textAnchor="middle"
            fontSize="12"
            fill="#6b7280"
            fontWeight="600"
          >
            Utilization (% of budget)
          </text>
        </svg>
      </div>

      <ChartTooltip 
        item={hoveredItem} 
        currency={currency} 
        mousePosition={mousePosition} 
      />
    </div>
  );
});

CategoryPerformanceGauge.displayName = 'CategoryPerformanceGauge';