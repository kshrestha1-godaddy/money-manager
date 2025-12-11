"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '../../../utils/currency';

interface TimeSeriesDataPoint {
  period: string; // e.g., "2024-01", "2024-02"
  periodLabel: string; // e.g., "Jan 2024", "Feb 2024"
  targetAmount: number;
  actualAmount: number;
}

interface CategoryTrendData {
  categoryName: string;
  categoryType: 'EXPENSE' | 'INCOME';
  color: string;
  dataPoints: TimeSeriesDataPoint[];
}

interface CategorySpendTrendChartProps {
  trendData: CategoryTrendData[];
  currency: string;
  categoryType?: 'EXPENSE' | 'INCOME' | 'ALL';
  selectedCategories?: string[]; // Allow filtering specific categories
  periodType?: 'monthly' | 'weekly' | 'daily';
  maxCategories?: number; // Limit number of categories to show
  showSeparateSections?: boolean; // Show Income and Expense in separate sections
  onTimeRangeChange?: (months: number, startDate?: Date, endDate?: Date) => void; // Callback for time range changes
  isLoading?: boolean; // Loading state for data refresh
}

interface ChartPoint {
  x: number;
  y: number;
  period: string;
  periodLabel: string;
  value: number;
  categoryName: string;
  isTarget: boolean;
}

interface HoveredPoint extends ChartPoint {
  categoryColor: string;
}

export function CategorySpendTrendChart({ 
  trendData, 
  currency, 
  categoryType = 'ALL',
  selectedCategories,
  periodType = 'monthly',
  maxCategories = 12,
  showSeparateSections = true,
  onTimeRangeChange,
  isLoading = false
}: CategorySpendTrendChartProps) {
  const router = useRouter();
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [activeSection, setActiveSection] = useState<'EXPENSE' | 'INCOME' | 'ALL'>(
    showSeparateSections && categoryType === 'ALL' ? 'EXPENSE' : categoryType
  );
  const [internalSelectedCategories, setInternalSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedTimeRange, setSelectedTimeRange] = useState<'3m' | '6m' | '1y' | '2y' | 'custom'>('6m');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Category selection handlers
  const toggleCategory = (categoryName: string) => {
    const newSelected = new Set(internalSelectedCategories);
    if (newSelected.has(categoryName)) {
      newSelected.delete(categoryName);
    } else {
      newSelected.add(categoryName);
    }
    setInternalSelectedCategories(newSelected);
  };

  const selectAllCategories = () => {
    const allCategoryNames = new Set(chartData.map(cat => cat.categoryName));
    setInternalSelectedCategories(allCategoryNames);
  };

  const clearAllSelections = () => {
    setInternalSelectedCategories(new Set());
  };

  // Time range selection handlers
  const handleTimeRangeChange = (range: '3m' | '6m' | '1y' | '2y' | 'custom') => {
    setSelectedTimeRange(range);
    
    if (range !== 'custom' && onTimeRangeChange) {
      const monthsMap = { '3m': 3, '6m': 6, '1y': 12, '2y': 24 };
      onTimeRangeChange(monthsMap[range]);
    }
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate && onTimeRangeChange) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      const monthsDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      setSelectedTimeRange('custom');
      onTimeRangeChange(Math.max(1, monthsDiff), startDate, endDate);
    }
  };

  // Helper functions for category visibility and styling
  const getCategoryOpacity = (categoryName: string): number => {
    // If no categories selected, use reduced opacity based on total number of categories
    if (internalSelectedCategories.size === 0) {
      // More categories = lower default opacity
      if (chartData.length > 8) return 0.4;
      if (chartData.length > 5) return 0.5;
      return 0.7;
    }
    // When categories are selected, highlight them strongly
    return internalSelectedCategories.has(categoryName) ? 1 : 0.15;
  };

  const getCategoryStrokeWidth = (categoryName: string): number => {
    if (internalSelectedCategories.size === 0) {
      // Thinner lines when showing many categories
      return chartData.length > 6 ? 1.5 : 2;
    }
    return internalSelectedCategories.has(categoryName) ? 3 : 1;
  };

  // Update container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.getBoundingClientRect().width;
        setContainerWidth(Math.max(800, width - 32));
      }
    };

    updateWidth();
    
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Force width recalculation when data changes to prevent shrinking
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.getBoundingClientRect().width;
        setContainerWidth(Math.max(800, width - 32));
      }
    };
    
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      requestAnimationFrame(updateWidth);
    });
  }, [trendData, categoryType, activeSection]);

  // Filter and process data
  const chartData = useMemo(() => {
    let filteredData = trendData;
    
    // Filter by active section (when using separate sections)
    const effectiveCategoryType = showSeparateSections && categoryType === 'ALL' ? activeSection : categoryType;
    if (effectiveCategoryType !== 'ALL') {
      filteredData = trendData.filter(item => item.categoryType === effectiveCategoryType);
    }
    
    // Filter by selected categories
    if (selectedCategories && selectedCategories.length > 0) {
      filteredData = filteredData.filter(item => selectedCategories.includes(item.categoryName));
    }
    
    // Filter out categories with no data
    filteredData = filteredData.filter(item => item.dataPoints.length > 0);
    
    // Sort by average actual spending (descending) to show most significant categories first
    filteredData.sort((a, b) => {
      const avgA = a.dataPoints.reduce((sum, point) => sum + point.actualAmount, 0) / a.dataPoints.length;
      const avgB = b.dataPoints.reduce((sum, point) => sum + point.actualAmount, 0) / b.dataPoints.length;
      return avgB - avgA;
    });
    
    // Limit number of categories to reduce clutter
    if (maxCategories > 0) {
      filteredData = filteredData.slice(0, maxCategories);
    }
    
    return filteredData;
  }, [trendData, categoryType, selectedCategories, activeSection, showSeparateSections, maxCategories]);

  // Calculate chart dimensions and scales
  const { 
    periods, 
    minAmount, 
    maxAmount, 
    chartPoints,
    chartConfig 
  } = useMemo(() => {
    if (chartData.length === 0) {
      return { 
        periods: [], 
        minAmount: 0, 
        maxAmount: 100, 
        chartPoints: [], 
        chartConfig: { chartWidth: 0, chartHeight: 0, leftMargin: 0, rightMargin: 0, topMargin: 0, bottomMargin: 0 }
      };
    }

    // Get all unique periods and sort them
    const allPeriods: string[] = [...new Set(
      chartData.flatMap(category => 
        category.dataPoints.map(point => point.period)
      )
    )].sort();

    // Calculate min and max amounts across all categories and data points
    let minAmt = Infinity;
    let maxAmt = -Infinity;

    chartData.forEach(category => {
      // Only include this category's data in Y-axis calculation if it's selected or no categories are selected
      const shouldInclude = internalSelectedCategories.size === 0 || internalSelectedCategories.has(category.categoryName);
      
      if (shouldInclude) {
        category.dataPoints.forEach(point => {
          minAmt = Math.min(minAmt, point.targetAmount, point.actualAmount);
          maxAmt = Math.max(maxAmt, point.targetAmount, point.actualAmount);
        });
      }
    });

    // Add some padding to the range
    const range = maxAmt - minAmt;
    const padding = Math.max(range * 0.1, 100); // At least 100 currency units padding
    minAmt = Math.max(0, minAmt - padding);
    maxAmt = maxAmt + padding;

    // Chart configuration
    const isSmallScreen = containerWidth < 768;
    const isMediumScreen = containerWidth < 1024;
    
    const leftMargin = isSmallScreen ? 80 : isMediumScreen ? 100 : 120;
    const rightMargin = 40;
    const topMargin = 40;
    const bottomMargin = isSmallScreen ? 60 : 80;
    
    const chartWidth = containerWidth;
    const chartHeight = isSmallScreen ? 400 : isMediumScreen ? 500 : 600;
    const chartAreaWidth = chartWidth - leftMargin - rightMargin;
    const chartAreaHeight = chartHeight - topMargin - bottomMargin;

    // Create scale functions
    const scaleX = (periodIndex: number) => 
      leftMargin + (periodIndex / Math.max(1, allPeriods.length - 1)) * chartAreaWidth;
    
    const scaleY = (value: number) => 
      topMargin + chartAreaHeight - ((value - minAmt) / (maxAmt - minAmt)) * chartAreaHeight;

    // Generate chart points for all categories
    const points: ChartPoint[] = [];
    
    chartData.forEach(category => {
      category.dataPoints.forEach(point => {
        const periodIndex = allPeriods.indexOf(point.period);
        if (periodIndex !== -1) {
          // Target point
          points.push({
            x: scaleX(periodIndex),
            y: scaleY(point.targetAmount),
            period: point.period,
            periodLabel: point.periodLabel,
            value: point.targetAmount,
            categoryName: category.categoryName,
            isTarget: true
          });
          
          // Actual point
          points.push({
            x: scaleX(periodIndex),
            y: scaleY(point.actualAmount),
            period: point.period,
            periodLabel: point.periodLabel,
            value: point.actualAmount,
            categoryName: category.categoryName,
            isTarget: false
          });
        }
      });
    });

    return {
      periods: allPeriods as string[],
      minAmount: minAmt,
      maxAmount: maxAmt,
      chartPoints: points,
      chartConfig: {
        chartWidth,
        chartHeight,
        leftMargin,
        rightMargin,
        topMargin,
        bottomMargin,
        chartAreaWidth,
        chartAreaHeight,
        scaleX,
        scaleY
      }
    };
  }, [chartData, containerWidth, internalSelectedCategories]);

  // Generate SVG path strings for lines
  const generateLinePath = (category: CategoryTrendData, isTarget: boolean): string => {
    if (!chartConfig.scaleX || !chartConfig.scaleY) return '';
    
    const points = category.dataPoints
      .map(point => {
        const periodIndex = (periods as string[]).indexOf(point.period);
        if (periodIndex === -1) return null;
        
        const x = chartConfig.scaleX!(periodIndex);
        const y = chartConfig.scaleY!(isTarget ? point.targetAmount : point.actualAmount);
        return { x, y };
      })
      .filter((point): point is { x: number; y: number } => point !== null);

    if (points.length === 0) return '';
    
    const firstPoint = points[0];
    if (!firstPoint) return '';
    
    let path = `M ${firstPoint.x} ${firstPoint.y}`;
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      if (point) {
        path += ` L ${point.x} ${point.y}`;
      }
    }
    
    return path;
  };

  // Handle mouse events
  const handlePointHover = (point: ChartPoint, category: CategoryTrendData, event: React.MouseEvent) => {
    setHoveredPoint({
      ...point,
      categoryColor: category.color
    });
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  // Handle point click navigation
  const handlePointClick = (point: ChartPoint, category: CategoryTrendData) => {
    // Parse the period to get start and end dates
    const periodParts = point.period.split('-');
    if (periodParts.length !== 2) return;
    
    const yearStr = periodParts[0];
    const monthStr = periodParts[1];
    if (!yearStr || !monthStr) return;
    
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    
    if (isNaN(year) || isNaN(month)) return;
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const formatDateForURL = (date: Date): string => {
      return date.toISOString().split('T')[0] || '';
    };
    
    const startDateStr = formatDateForURL(startDate);
    const endDateStr = formatDateForURL(endDate);
    
    const targetPath = category.categoryType === 'EXPENSE' ? '/expenses' : '/incomes';
    const url = `${targetPath}?category=${encodeURIComponent(category.categoryName)}&startDate=${startDateStr}&endDate=${endDateStr}`;
    
    router.push(url);
  };

  // Responsive font sizes
  const isSmallScreen = containerWidth < 768;
  const isMediumScreen = containerWidth < 1024;
  const axisFontSize = isSmallScreen ? 10 : isMediumScreen ? 11 : 12;
  const labelFontSize = isSmallScreen ? 11 : 12;

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Category Spend Trend Analysis
        </h3>
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📈</div>
          <p>No trend data available for selected categories</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Category Spend Trend Analysis
          {!showSeparateSections && categoryType !== 'ALL' && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              ({categoryType.toLowerCase()} categories)
            </span>
          )}
          {showSeparateSections && categoryType === 'ALL' && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              ({activeSection.toLowerCase()} categories)
            </span>
          )}
        </h3>
      </div>
      
      {/* Section Tabs */}
      {showSeparateSections && categoryType === 'ALL' && (
        <div className="flex gap-2 mb-4">
          {(['EXPENSE', 'INCOME'] as const).map((section) => {
            const sectionData = trendData.filter(item => item.categoryType === section);
            if (sectionData.length === 0) return null;
            
            return (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                }`}
              >
                {section === 'EXPENSE' ? 'Expenses' : 'Income'} ({sectionData.length})
              </button>
            );
          })}
        </div>
      )}

      {/* Category Selection Controls */}
      {chartData.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
          {/* Top row with category info and time range controls */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
            <span className="text-sm font-medium text-gray-700">
              {internalSelectedCategories.size > 0 ? `${internalSelectedCategories.size} categories selected` : 'Select categories to highlight'}
            </span>
            
            {/* Time Range and Quick Actions */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Time Range Selection */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-gray-600 whitespace-nowrap">Time Range:</span>
                <div className="flex gap-1 flex-wrap items-center">
                  {[
                    { key: '3m', label: '3M' },
                    { key: '6m', label: '6M' },
                    { key: '1y', label: '1Y' },
                    { key: '2y', label: '2Y' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => handleTimeRangeChange(key as '3m' | '6m' | '1y' | '2y' | 'custom')}
                      disabled={isLoading}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                        selectedTimeRange === key
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                      } ${
                        isLoading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  
                  {/* Custom Date Range Inputs - Always Visible */}
                  <div className={`flex items-center gap-2 ml-2 border-l border-gray-300 pl-2 ${
                    selectedTimeRange === 'custom' ? 'bg-blue-50 rounded px-2 py-1' : ''
                  }`}>
                    <div className="flex items-center gap-1">
                      <label className="text-xs font-medium text-gray-600 whitespace-nowrap">From:</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        disabled={isLoading}
                        className={`px-2 py-1 text-xs border rounded focus:outline-none focus:border-blue-500 w-28 ${
                          selectedTimeRange === 'custom' 
                            ? 'border-blue-300 bg-white' 
                            : 'border-gray-300'
                        } ${
                          isLoading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="text-xs font-medium text-gray-600 whitespace-nowrap">To:</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        disabled={isLoading}
                        className={`px-2 py-1 text-xs border rounded focus:outline-none focus:border-blue-500 w-28 ${
                          selectedTimeRange === 'custom' 
                            ? 'border-blue-300 bg-white' 
                            : 'border-gray-300'
                        } ${
                          isLoading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      />
                    </div>
                    <button
                      onClick={handleCustomDateApply}
                      disabled={!customStartDate || !customEndDate || isLoading}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isLoading ? 'Loading...' : 'Apply'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 border-l border-gray-300 pl-4">
                <button
                  onClick={selectAllCategories}
                  className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded whitespace-nowrap"
                >
                  Select All
                </button>
                <button
                  onClick={clearAllSelections}
                  className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded whitespace-nowrap"
                  disabled={internalSelectedCategories.size === 0}
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>


          {/* Category Selection Chips */}
          <div className="flex flex-wrap gap-2">
            {chartData.map(category => (
              <button
                key={category.categoryName}
                onClick={() => toggleCategory(category.categoryName)}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  internalSelectedCategories.has(category.categoryName)
                    ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                }`}
                title="Click to select/deselect this category"
              >
                <div 
                  className="w-3 h-3 rounded" 
                  style={{ backgroundColor: category.color }}
                ></div>
                <span>{category.categoryName}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="relative w-full overflow-x-auto">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10 rounded-lg">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm text-gray-600">Updating chart data...</p>
            </div>
          </div>
        )}
        
        {chartConfig.chartWidth > 0 && chartConfig.chartHeight > 0 && (
        <svg 
          width="100%" 
          height={chartConfig.chartHeight}
          className={`bg-white transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}
          viewBox={`0 0 ${chartConfig.chartWidth} ${chartConfig.chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines - Y axis */}
          <g>
            {chartConfig.scaleY && (() => {
              // Calculate Y-axis values with 10,000 unit spacing
              const minRounded = Math.floor(minAmount / 10000) * 10000;
              const maxRounded = Math.ceil(maxAmount / 10000) * 10000;
              const yAxisValues = [];
              
              for (let value = minRounded; value <= maxRounded; value += 10000) {
                if (value >= minAmount && value <= maxAmount) {
                  yAxisValues.push(value);
                }
              }
              
              // Ensure we have at least min and max values if they don't align with 10k increments
              if (yAxisValues.length === 0 || (yAxisValues[0] !== undefined && yAxisValues[0] > minAmount)) {
                yAxisValues.unshift(minAmount);
              }
              const lastValue = yAxisValues[yAxisValues.length - 1];
              if (lastValue !== undefined && lastValue < maxAmount) {
                yAxisValues.push(maxAmount);
              }
              
              return yAxisValues.map(value => {
                const y = chartConfig.scaleY!(value);
                return (
                  <g key={value}>
                    <line
                      x1={chartConfig.leftMargin || 0}
                      y1={y}
                      x2={(chartConfig.leftMargin || 0) + (chartConfig.chartAreaWidth || 0)}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                  <text
                    x={(chartConfig.leftMargin || 0) - 10}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={axisFontSize}
                    fill="#6b7280"
                  >
                    {formatCurrency(value, currency)}
                  </text>
                  </g>
                );
              });
            })()}
          </g>

          {/* Grid lines - X axis */}
          <g>
            {chartConfig.scaleX && periods.map((period, index) => {
              const x = chartConfig.scaleX!(index);
              const periodData = chartData[0]?.dataPoints.find(p => p.period === period);
              return (
                <g key={period}>
                  <line
                    x1={x}
                    y1={chartConfig.topMargin}
                    x2={x}
                    y2={chartConfig.topMargin + (chartConfig.chartAreaHeight || 0)}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={x}
                    y={chartConfig.topMargin + (chartConfig.chartAreaHeight || 0) + 20}
                    textAnchor="middle"
                    fontSize={axisFontSize}
                    fill="#6b7280"
                    transform={isSmallScreen ? `rotate(-45, ${x}, ${chartConfig.topMargin + (chartConfig.chartAreaHeight || 0) + 20})` : ''}
                  >
                    {periodData?.periodLabel || period}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Budget reference lines for selected categories */}
          <g className={`transition-opacity duration-500 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
            {chartConfig.scaleY && chartData.map(category => {
              const isSelected = internalSelectedCategories.has(category.categoryName);
              const hasSelection = internalSelectedCategories.size > 0;
              
              // Only show budget reference lines for selected categories (or all if none selected)
              if (hasSelection && !isSelected) return null;
              
              // Get unique budget values for this category
              const budgetValues = [...new Set(category.dataPoints.map(point => point.targetAmount))];
              
              return budgetValues.map(budgetValue => {
                if (budgetValue <= 0) return null; // Don't show reference line for zero budget
                
                const y = chartConfig.scaleY!(budgetValue);
                const opacity = getCategoryOpacity(category.categoryName) * 0.6; // Slightly more transparent
                
                return (
                  <g key={`${category.categoryName}-budget-${budgetValue}`}>
                    {/* Budget reference line */}
                    <line
                      x1={chartConfig.leftMargin}
                      y1={y}
                      x2={chartConfig.leftMargin + (chartConfig.chartAreaWidth || 0)}
                      y2={y}
                      stroke={category.color}
                      strokeWidth="2"
                      strokeDasharray="12,6"
                      opacity={opacity}
                      className="transition-all duration-300"
                    />
                    
                    {/* Budget label */}
                    <text
                      x={chartConfig.leftMargin + 10}
                      y={y - 5}
                      textAnchor="start"
                      fontSize="10"
                      fill={category.color}
                      opacity={opacity}
                      fontWeight="600"
                      className="transition-all duration-300"
                    >
                      {formatCurrency(budgetValue, currency)}
                    </text>
                  </g>
                );
              });
            })}
          </g>

          {/* Lines for each category */}
          <g className={`transition-opacity duration-500 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
            {chartData.map(category => {
              const opacity = getCategoryOpacity(category.categoryName);
              const strokeWidth = getCategoryStrokeWidth(category.categoryName);
              
              return (
                <g key={category.categoryName}>
                  {/* Target line (dashed) */}
                  <path
                    d={generateLinePath(category, true)}
                    stroke={category.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray="8,4"
                    fill="none"
                    opacity={opacity}
                    className="transition-all duration-300"
                  />
                  
                  {/* Actual line (solid) */}
                  <path
                    d={generateLinePath(category, false)}
                    stroke={category.color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    opacity={opacity}
                    className="transition-all duration-300"
                  />
                </g>
              );
            })}
          </g>

          {/* Points */}
          <g className={`transition-opacity duration-500 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
            {chartConfig.scaleX && chartConfig.scaleY && chartData.map(category => {
              const opacity = getCategoryOpacity(category.categoryName);
              const isSelected = internalSelectedCategories.has(category.categoryName);
              const hasSelection = internalSelectedCategories.size > 0;
              
              // Smaller points when many categories or no selection
              const basePointSize = chartData.length > 6 ? 3 : 4;
              const baseTargetPointSize = chartData.length > 6 ? 4 : 5;
              
              const pointRadius = hasSelection && isSelected ? 6 : basePointSize;
              const targetPointRadius = hasSelection && isSelected ? 7 : baseTargetPointSize;
            
            return category.dataPoints.map(point => {
              const periodIndex = (periods as string[]).indexOf(point.period);
              if (periodIndex === -1) return null;
              
              const targetX = chartConfig.scaleX!(periodIndex);
              const targetY = chartConfig.scaleY!(point.targetAmount);
              const actualX = chartConfig.scaleX!(periodIndex);
              const actualY = chartConfig.scaleY!(point.actualAmount);
              
              const targetPoint: ChartPoint = {
                x: targetX, y: targetY, period: point.period, 
                periodLabel: point.periodLabel, value: point.targetAmount, 
                categoryName: category.categoryName, isTarget: true
              };
              
              const actualPoint: ChartPoint = {
                x: actualX, y: actualY, period: point.period, 
                periodLabel: point.periodLabel, value: point.actualAmount, 
                categoryName: category.categoryName, isTarget: false
              };

              return (
                <g key={`${category.categoryName}-${point.period}`} opacity={opacity}>
                  {/* Target point (outlined circle) */}
                  <circle
                    cx={targetX}
                    cy={targetY}
                    r={targetPointRadius}
                    fill="white"
                    stroke={category.color}
                    strokeWidth={hasSelection && isSelected ? "3" : chartData.length > 6 ? "1.5" : "2"}
                    className={`transition-all duration-300 ${
                      isLoading ? 'pointer-events-none' : 'cursor-pointer'
                    }`}
                    onMouseEnter={isLoading ? undefined : (e) => handlePointHover(targetPoint, category, e)}
                    onMouseMove={isLoading ? undefined : handleMouseMove}
                    onMouseLeave={isLoading ? undefined : handleMouseLeave}
                    onClick={isLoading ? undefined : () => handlePointClick(targetPoint, category)}
                  />
                  
                  {/* Actual point (filled circle) */}
                  <circle
                    cx={actualX}
                    cy={actualY}
                    r={pointRadius}
                    fill={category.color}
                    strokeWidth={hasSelection && isSelected ? "2" : "0"}
                    stroke={hasSelection && isSelected ? "white" : "none"}
                    className={`transition-all duration-300 ${
                      isLoading ? 'pointer-events-none' : 'cursor-pointer'
                    }`}
                    onMouseEnter={isLoading ? undefined : (e) => handlePointHover(actualPoint, category, e)}
                    onMouseMove={isLoading ? undefined : handleMouseMove}
                    onMouseLeave={isLoading ? undefined : handleMouseLeave}
                    onClick={isLoading ? undefined : () => handlePointClick(actualPoint, category)}
                  />
                </g>
              );
            });
          })}
          </g>

          {/* Axis labels */}
          <text
            x={chartConfig.leftMargin + (chartConfig.chartAreaWidth || 0) / 2}
            y={chartConfig.chartHeight - 15}
            textAnchor="middle"
            fontSize={labelFontSize}
            fill="#6b7280"
            fontWeight="600"
          >
            Time Period
          </text>
          
          <text
            x={25}
            y={chartConfig.topMargin + (chartConfig.chartAreaHeight || 0) / 2}
            textAnchor="middle"
            fontSize={labelFontSize}
            fill="#6b7280"
            fontWeight="600"
            transform={`rotate(-90, 25, ${chartConfig.topMargin + (chartConfig.chartAreaHeight || 0) / 2})`}
          >
            Amount ({currency})
          </text>
        </svg>
        )}
      </div>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-56">
            <div className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded" 
                style={{ backgroundColor: hoveredPoint.categoryColor }}
              ></div>
              {hoveredPoint.categoryName}
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Period:</span>
                <span className="font-medium">{hoveredPoint.periodLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">
                  {hoveredPoint.isTarget ? 'Target' : 'Actual'} Amount
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1">
                <span className="text-gray-600">Amount:</span>
                <span className="font-bold">{formatCurrency(hoveredPoint.value, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
