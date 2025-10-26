"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
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
}

interface ChartDataPoint {
  categoryName: string;
  utilization: number;
  actual: number;
  budget: number;
  status: 'over' | 'under' | 'on-track';
  color: string;
}

export function CategoryPerformanceGauge({ 
  budgetData, 
  currency, 
  categoryType = 'ALL' 
}: CategoryPerformanceGaugeProps) {
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
    if (utilization <= 75) return '#10b981'; // Green - well under budget
    if (utilization <= 90) return '#f59e0b'; // Amber - approaching budget
    if (utilization <= 100) return '#f97316'; // Orange - near budget limit
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
        color: getBarColor(roundedUtilization)
      };
    });
    
    // Sort by utilization percentage (highest first)
    return processedData.sort((a, b) => b.utilization - a.utilization);
  }, [budgetData, categoryType]);

  // Chart dimensions and settings - responsive
  const chartWidth = containerWidth;
  const chartHeight = Math.max(400, chartData.length * 45 + 80); // Add extra space for proper alignment
  
  // Responsive margins based on screen size - reduced for full width
  const leftMargin = Math.max(160, containerWidth * 0.12); // 12% of width or minimum 160px
  const rightMargin = Math.max(80, containerWidth * 0.08); // 8% of width or minimum 80px
  const topMargin = 30;
  const bottomMargin = 50;
  const barHeight = 28;
  const barSpacing = 45;

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
        <div className="text-sm text-gray-600">
          Utilization (% of budget)
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-600">Under Budget (≤75%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500 rounded"></div>
          <span className="text-gray-600">Approaching (76-90%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span className="text-gray-600">Near Limit (91-100%)</span>
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
          {/* Chart area background - removed gray background */}
          <rect
            x={leftMargin}
            y={topMargin}
            width={chartAreaWidth}
            height={chartHeight - topMargin - bottomMargin}
            fill="transparent"
            stroke="none"
          />

          {/* Grid lines */}
          <g>
            {[0, 25, 50, 75, 100, 125, 150, 175, 200].map(value => {
              if (value > maxUtilization) return null;
              const x = leftMargin + scaleX(value);
              return (
                <g key={value}>
                  <line
                    x1={x}
                    y1={topMargin}
                    x2={x}
                    y2={chartHeight - bottomMargin}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray={value === 0 ? "none" : "2,2"}
                  />
                  <text
                    x={x}
                    y={chartHeight - bottomMargin + 20}
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
              y2={chartHeight - bottomMargin}
              stroke="#dc2626"
              strokeWidth="3"
              strokeDasharray="8,4"
              opacity="0.8"
            />
          )}

          {/* Bars and labels */}
          {chartData.map((item, index) => {
            const rowCenterY = topMargin + 20 + (index * barSpacing) + (barSpacing / 2); // Center of each row
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
                  className={`transition-all cursor-pointer ${
                    isHovered ? 'opacity-90 stroke-gray-400' : 'opacity-100'
                  }`}
                  strokeWidth={isHovered ? "1" : "0"}
                  onMouseEnter={(e) => handleMouseEnter(item.categoryName, e)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                />

                {/* Percentage label */}
                <text
                  x={leftMargin + barWidth + 8} // Closer to the bar end
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
            y={chartHeight - 10}
            textAnchor="middle"
            fontSize={axisFontSize}
            fill="#6b7280"
            fontWeight="600"
          >
            Utilization (% of budget)
          </text>

          {/* Y-axis title */}
          <text
            x={15}
            y={topMargin + (chartHeight - topMargin - bottomMargin) / 2}
            textAnchor="middle"
            fontSize={axisFontSize}
            fill="#6b7280"
            fontWeight="600"
            transform={`rotate(-90, 15, ${topMargin + (chartHeight - topMargin - bottomMargin) / 2})`}
          >
            Categories
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
                  hoveredData.utilization > 90 ? 'text-orange-600' : 
                  'text-green-600'
                }`}>
                  {hoveredData.utilization}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>
          Dashed red line indicates 100% budget utilization. 
          Categories above this line are over budget.
        </p>
      </div>
    </div>
  );
}