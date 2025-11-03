"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '../../../utils/currency';

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
}

interface ChartDataPoint {
  categoryName: string;
  utilization: number;
  actual: number;
  budget: number;
  status: 'over' | 'under' | 'on-track';
  color: string;
  categoryType: 'EXPENSE' | 'INCOME';
}

export function CategoryPerformanceGauge({ 
  budgetData, 
  currency, 
  categoryType = 'ALL',
  selectedMonth,
  selectedYear
}: CategoryPerformanceGaugeProps) {
  const router = useRouter();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.getBoundingClientRect().width;
        setContainerWidth(Math.max(800, width - 32)); // Account for p-4 padding (16px each side), minimum 800px
      }
    };

    updateWidth();
    
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Get color for each bar based on utilization percentage
  const getBarColor = (utilization: number) => {
    if (utilization <= 0) return '#d1d5db'; // Light gray for no activity
    if (utilization < 100) return '#3b82f6'; // Blue - under budget
    if (utilization === 100) return '#10b981'; // Green - exactly at budget
    return '#ef4444'; // Red - over budget
  };
  
  // Process and filter data for the chart
  const chartData = useMemo(() => {
    let filteredData = budgetData;
    
    // Filter by category type if specified
    if (categoryType !== 'ALL') {
      filteredData = budgetData.filter(item => item.categoryType === categoryType);
    }
    
    // Filter out categories with no budget target
    filteredData = filteredData.filter(item => item.budgetTarget.monthlySpend > 0);
    
    // Transform data for chart
    const processedData: ChartDataPoint[] = filteredData.map(item => {
      const utilization = item.budgetTarget.monthlySpend > 0 
        ? (item.actualSpending.monthlyAverage / item.budgetTarget.monthlySpend) * 100 
        : 0;
      
      const roundedUtilization = Math.round(utilization * 10) / 10;
      
      return {
        categoryName: item.categoryName,
        utilization: roundedUtilization,
        actual: item.actualSpending.monthlyAverage,
        budget: item.budgetTarget.monthlySpend,
        status: item.variance.status,
        categoryType: item.categoryType,
        color: getBarColor(roundedUtilization)
      };
    });
    
    // Separate expense and income categories
    const expenseCategories = processedData
      .filter(item => item.categoryType === 'EXPENSE')
      .sort((a, b) => b.utilization - a.utilization);
    
    const incomeCategories = processedData
      .filter(item => item.categoryType === 'INCOME')
      .sort((a, b) => b.utilization - a.utilization);
    
    // Return expenses first, then incomes
    return [...expenseCategories, ...incomeCategories];
  }, [budgetData, categoryType]);

  // Calculate separator position for mixed categories
  const expenseCount = chartData.filter(item => item.categoryType === 'EXPENSE').length;
  const incomeCount = chartData.filter(item => item.categoryType === 'INCOME').length;
  const hasBothTypes = expenseCount > 0 && incomeCount > 0;
  const separatorSpace = hasBothTypes ? 25 : 0; // Space for separator line

  // Chart settings - optimized spacing
  const barHeight = 24;
  const barSpacing = 42; // Optimal spacing between bars
  
  // Margins - optimized for better layout
  const leftMargin = Math.max(200, containerWidth * 0.16); // Space for category names
  const rightMargin = Math.max(80, containerWidth * 0.08); // Space for percentage labels
  const topMargin = 10; // Reduced top margin
  const bottomMargin = 80; // Bottom margin for axis labels

  // Chart dimensions - recalculated
  const chartWidth = containerWidth;
  const chartAreaHeight = chartData.length * barSpacing + separatorSpace;
  const chartHeight = chartAreaHeight + topMargin + bottomMargin;

  // Responsive font sizes
  const isSmallScreen = containerWidth < 768;
  const isMediumScreen = containerWidth < 1024;
  const categoryFontSize = isSmallScreen ? "11" : isMediumScreen ? "12" : "13";
  const percentageFontSize = isSmallScreen ? "11" : isMediumScreen ? "12" : "13";
  const axisFontSize = isSmallScreen ? "10" : isMediumScreen ? "11" : "12";

  // Calculate max utilization for scaling
  const maxUtilization = Math.max(120, Math.max(...chartData.map(d => d.utilization), 0));
  const chartAreaWidth = chartWidth - leftMargin - rightMargin;

  // Scale function to convert utilization to pixel width
  const scaleX = (value: number) => (value / maxUtilization) * chartAreaWidth;

  // Handle mouse events for tooltip
  const handleMouseEnter = (categoryName: string, event: React.MouseEvent) => {
    setHoveredCategory(categoryName);
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredCategory(null);
  };

  // Handle bar click navigation
  const handleBarClick = (item: ChartDataPoint) => {
    // Use selected month/year or fall back to current month
    const now = new Date();
    const targetYear = selectedYear !== undefined ? selectedYear : now.getFullYear();
    const targetMonth = selectedMonth !== undefined ? selectedMonth : now.getMonth();
    
    // First day of selected month
    const startDate = new Date(targetYear, targetMonth, 1);
    // Last day of selected month
    const endDate = new Date(targetYear, targetMonth + 1, 0);
    
    // Format dates as YYYY-MM-DD for URL parameters
    const formatDateForURL = (date: Date): string => {
      return date.toISOString().split('T')[0] || '';
    };
    
    const startDateStr = formatDateForURL(startDate);
    const endDateStr = formatDateForURL(endDate);
    
    // Navigate to appropriate page with category and date filters
    const targetPath = item.categoryType === 'EXPENSE' ? '/expenses' : '/incomes';
    const url = `${targetPath}?category=${encodeURIComponent(item.categoryName)}&startDate=${startDateStr}&endDate=${endDateStr}`;
    
    router.push(url);
  };

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

  const hoveredData = hoveredCategory ? chartData.find(d => d.categoryName === hoveredCategory) : null;

  return (
    <div ref={containerRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 w-full">
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
      
      {/* Legend */}
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
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-gray-600">Over Budget (&gt;100%)</span>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative w-full">
        <svg 
          width="100%" 
          height={chartHeight}
          className="bg-white w-full"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Chart area background */}
          <rect
            x={leftMargin}
            y={topMargin}
            width={chartAreaWidth}
            height={chartAreaHeight}
            fill="transparent"
            stroke="none"
          />

          {/* Grid lines */}
          <g>
            {[0, 25, 50, 75, 100, 125, 150, 175, 200, 300].map(value => {
              if (value > maxUtilization) return null;
              const x = leftMargin + scaleX(value);
              return (
                <g key={value}>
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
                    fontSize={axisFontSize}
                    fill="#6b7280"
                    fontWeight="500"
                  >
                    {value}%
                  </text>
                </g>
              );
            })}
          </g>

          {/* Reference line at 100% */}
          {100 <= maxUtilization && (
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

          {/* Separator line between expenses and incomes */}
          {hasBothTypes && expenseCount > 0 && (
            <g>
              {/* Separator line */}
              <line
                x1={0}
                y1={topMargin + (expenseCount * barSpacing) + (separatorSpace / 2)}
                x2={leftMargin + chartAreaWidth}
                y2={topMargin + (expenseCount * barSpacing) + (separatorSpace / 2)}
                stroke="#d1d5db"
                strokeWidth="2"
                strokeDasharray="6,4"
              />
              {/* Section labels - positioned with proper spacing */}
              <text
                x={25}
                y={topMargin + (expenseCount * barSpacing) / 2}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
                fontWeight="600"
                transform={`rotate(-90, 25, ${topMargin + (expenseCount * barSpacing) / 2})`}
              >
                EXPENSES
              </text>
              <text
                x={25}
                y={topMargin + (expenseCount * barSpacing) + separatorSpace + (incomeCount * barSpacing) / 2}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
                fontWeight="600"
                transform={`rotate(-90, 25, ${topMargin + (expenseCount * barSpacing) + separatorSpace + (incomeCount * barSpacing) / 2})`}
              >
                INCOMES
              </text>
            </g>
          )}

          {/* Bars and labels */}
          {chartData.map((item, index) => {
            // Calculate position with proper separator handling
            const isIncome = item.categoryType === 'INCOME';
            const incomeOffset = isIncome && hasBothTypes ? separatorSpace : 0;
            
            const rowCenterY = topMargin + (index * barSpacing) + (barSpacing / 2) + incomeOffset;
            const barY = rowCenterY - (barHeight / 2); // Center the bar vertically
            const barWidth = Math.max(3, scaleX(item.utilization)); // Minimum 3px width for visibility
            const isHovered = hoveredCategory === item.categoryName;

            return (
              <g key={item.categoryName}>
                {/* Category name */}
                <text
                  x={leftMargin - 10}
                  y={rowCenterY}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={categoryFontSize}
                  fill="#374151"
                  fontWeight="500"
                >
                  {item.categoryName}
                </text>

                {/* Bar */}
                <rect
                  x={leftMargin + 1} // Small offset to align with grid
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  fill={item.color}
                  rx="4"
                  ry="4"
                  className={`transition-all cursor-pointer hover:opacity-90 ${
                    isHovered ? 'opacity-90 stroke-gray-400' : 'opacity-100'
                  }`}
                  strokeWidth={isHovered ? "1" : "0"}
                  onMouseEnter={(e) => handleMouseEnter(item.categoryName, e)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => handleBarClick(item)}
                />

                {/* Values inside bar */}
                {barWidth > 120 && ( // Only show if bar is wide enough
                  <text
                    x={leftMargin + 10} // Small padding from bar start
                    y={rowCenterY}
                    dominantBaseline="middle"
                    fontSize="8"
                    fill="white"
                    fontWeight="500"
                  >
                    {formatCurrency(item.actual, currency)} | {formatCurrency(item.budget, currency)}
                  </text>
                )}

                {/* Percentage label */}
                <text
                  x={leftMargin + Math.max(barWidth + 12, 60)} // Optimal spacing from bar end
                  y={rowCenterY}
                  dominantBaseline="middle"
                  fontSize={percentageFontSize}
                  fill="#374151"
                  fontWeight="600"
                >
                  {item.utilization}%
                </text>

              </g>
            );
          })}

          {/* X-axis title */}
          <text
            x={leftMargin + chartAreaWidth / 2}
            y={chartHeight - 15}
            textAnchor="middle"
            fontSize={axisFontSize}
            fill="#6b7280"
            fontWeight="600"
          >
            Utilization (% of budget)
          </text>

        </svg>
      </div>

      {/* Custom Tooltip */}
      {hoveredData && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-64">
            <div className="font-medium text-gray-900 mb-2">{hoveredData.categoryName}</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Actual:</span>
                <span className="font-medium">{formatCurrency(hoveredData.actual, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Budget:</span>
                <span className="font-medium">{formatCurrency(hoveredData.budget, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1">
                <span className="text-gray-600">Utilization:</span>
                <span className={`font-bold ${
                  hoveredData.utilization > 100 ? 'text-red-600' : 
                  hoveredData.utilization === 100 ? 'text-green-600' : 
                  'text-blue-600'
                }`}>
                  {hoveredData.utilization}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}