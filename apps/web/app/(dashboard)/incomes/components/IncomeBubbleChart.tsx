"use client";

import { useEffect, useRef, useMemo, useState } from 'react';
import { Income } from '../../../types/financial';
import { convertForDisplaySync } from '../../../utils/currencyDisplay';
import { formatCurrency } from '../../../utils/currency';

interface IncomeBubbleChartProps {
  incomes: Income[];
  currency: string;
  hasActiveFilters?: boolean;
}

interface CategoryData {
  name: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  color: string;
}

interface AxisRange {
  min: number;
  max: number;
}

export function IncomeBubbleChart({ incomes, currency, hasActiveFilters }: IncomeBubbleChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showAxisControls, setShowAxisControls] = useState(false);
  const [customXRange, setCustomXRange] = useState<AxisRange | null>(null);
  const [customYRange, setCustomYRange] = useState<AxisRange | null>(null);
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set());
  const [showThresholdLine, setShowThresholdLine] = useState(false);
  
  // Calculate responsive dimensions based on screen size
  const calculateDimensions = () => {
    if (typeof window === 'undefined') return { width: 1200, height: 400 };
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Calculate height based on screen size with breakpoints
    let height;
    if (screenWidth < 640) {
      height = Math.min(screenHeight * 0.4, 300); // Mobile: smaller height
    } else if (screenWidth < 1024) {
      height = Math.min(screenHeight * 0.45, 400); // Tablet: medium height
    } else {
      height = Math.min(screenHeight * 0.5, 500); // Desktop: larger height
    }
    
    return { width: screenWidth, height };
  };

  // Category selection handlers
  const toggleCategoryExclusion = (categoryName: string) => {
    const newExcluded = new Set(excludedCategories);
    if (newExcluded.has(categoryName)) {
      newExcluded.delete(categoryName);
    } else {
      newExcluded.add(categoryName);
    }
    setExcludedCategories(newExcluded);
    
    // Reset only X-axis custom range when toggling categories to allow auto-scaling
    // Y-axis remains constant, so we keep its custom range if set
    if (customXRange) {
      setCustomXRange(null);
    }
  };

  const includeAllCategories = () => {
    setExcludedCategories(new Set());
    // Reset only X-axis custom range to allow auto-scaling with all categories
    // Y-axis remains constant, so we keep its custom range if set
    if (customXRange) {
      setCustomXRange(null);
    }
  };

  // Process ALL income data by categories (before filtering)
  const allCategoryData = useMemo(() => {
    const categoryMap = new Map<number, CategoryData>();
    
    incomes.forEach(income => {
      const categoryId = income.categoryId;
      const amount = convertForDisplaySync(income.amount, income.currency, currency);
      
      if (categoryMap.has(categoryId)) {
        const existing = categoryMap.get(categoryId)!;
        existing.totalAmount += amount;
        existing.transactionCount += 1;
        existing.averageAmount = existing.totalAmount / existing.transactionCount;
      } else {
        categoryMap.set(categoryId, {
          name: income.category.name,
          totalAmount: amount,
          transactionCount: 1,
          averageAmount: amount,
          color: income.category.color || '#4285f4'
        });
      }
    });
    
    return Array.from(categoryMap.values()).filter(category => category.transactionCount > 0);
  }, [incomes, currency]);

  // Filtered category data based on exclusions
  const categoryData = useMemo(() => {
    return allCategoryData.filter(category => !excludedCategories.has(category.name));
  }, [allCategoryData, excludedCategories]);

  // Filter to only show toggle for high-value categories (> 20K average)
  const HIGH_VALUE_THRESHOLD = 50000;
  const highValueCategories = useMemo(() => {
    return allCategoryData.filter(cat => cat.averageAmount > HIGH_VALUE_THRESHOLD);
  }, [allCategoryData]);

  const excludeAllCategories = () => {
    const allCategories = new Set(allCategoryData.map(cat => cat.name));
    setExcludedCategories(allCategories);
  };

  const excludeAllHighValueCategories = () => {
    const highValueCategoryNames = new Set(highValueCategories.map(cat => cat.name));
    setExcludedCategories(highValueCategoryNames);
  };

  // Initialize dimensions and add resize listener
  useEffect(() => {
    const updateDimensions = () => {
      const newDimensions = calculateDimensions();
      setDimensions(newDimensions);
    };

    // Set initial dimensions
    updateDimensions();

    // Debounced resize handler for better performance
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        updateDimensions();
      }, 150); // Debounce by 150ms
    };

    window.addEventListener('resize', handleResize);

    // Fix for non-passive event listeners
    const addPassiveEventListeners = () => {
      const chartContainer = chartRef.current;
      if (chartContainer) {
        // Add passive mousewheel listeners to prevent scroll blocking
        const passiveWheelHandler = (e: Event) => {
          // Allow default scrolling behavior
          return true;
        };
        
        chartContainer.addEventListener('wheel', passiveWheelHandler, { passive: true });
        chartContainer.addEventListener('mousewheel' as any, passiveWheelHandler, { passive: true } as any);
        
        return () => {
          chartContainer.removeEventListener('wheel', passiveWheelHandler);
          chartContainer.removeEventListener('mousewheel' as any, passiveWheelHandler);
        };
      }
    };

    const cleanupPassiveListeners = addPassiveEventListeners();
    
    // Cleanup
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      if (cleanupPassiveListeners) {
        cleanupPassiveListeners();
      }
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || categoryData.length === 0) {
      setIsChartLoading(false);
      return;
    }

    setIsChartLoading(true);

    const loadGoogleCharts = () => {
      // Check if BubbleChart is already available
      if (window.google?.visualization?.BubbleChart) {
        drawChart();
        return;
      }

      if (!window.google?.charts) {
        // Load Google Charts if not already loaded
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://www.gstatic.com/charts/loader.js';
        script.onload = () => {
          window.google.charts.load('current', { packages: ['corechart'] });
          window.google.charts.setOnLoadCallback(drawChart);
        };
        document.head.appendChild(script);
      } else if (window.google.charts) {
        // Charts loader is available, load the corechart package
        window.google.charts.load('current', { packages: ['corechart'] });
        window.google.charts.setOnLoadCallback(drawChart);
      } else {
        // Charts not loaded yet, try again after a short delay
        setTimeout(loadGoogleCharts, 100);
      }
    };

    const drawChart = () => {
      if (!chartRef.current) return;

      // Ensure BubbleChart is available before proceeding
      if (!window.google?.visualization?.BubbleChart) {
        console.warn('BubbleChart not yet available, retrying...');
        setTimeout(loadGoogleCharts, 100);
        return;
      }

      // Prepare data for Google Charts
      const dataArray: (string | number)[][] = [
        ['ID', 'Avg', 'Count', 'Category', 'Total']
      ];

      categoryData.forEach(category => {
        dataArray.push([
          category.name,
          Math.round(category.averageAmount * 100) / 100, // Round to 2 decimal places
          category.transactionCount,
          category.name,
          Math.round(category.totalAmount * 100) / 100 // Round to 2 decimal places
        ]);
      });

      const data = window.google.visualization.arrayToDataTable(dataArray);

      // Calculate dynamic ranges
      // X-axis: Based on visible categories only (adjusts when categories are toggled)
      const maxAverageAmount = categoryData.length > 0 
        ? Math.max(...categoryData.map(category => category.averageAmount))
        : 0;
      const minAverageAmount = categoryData.length > 0 
        ? Math.min(...categoryData.map(category => category.averageAmount))
        : 0;
      
      // Y-axis: Always based on ALL categories (stays constant)
      const maxTransactionCount = allCategoryData.length > 0 
        ? Math.max(...allCategoryData.map(category => category.transactionCount))
        : 0;
      const minTransactionCount = allCategoryData.length > 0 
        ? Math.min(...allCategoryData.map(category => category.transactionCount))
        : 0;

      // Calculate padding
      const xRange = maxAverageAmount - minAverageAmount;
      const xPadding = Math.max(xRange * 0.15, maxAverageAmount * 0.1);
      const yRange = maxTransactionCount - minTransactionCount;
      const yPadding = Math.max(yRange * 0.15, maxTransactionCount * 0.1, 5); // At least 5 transactions padding

      // Calculate smart defaults
      // X-axis adapts based on visible categories
      const shouldUseFixedXMinimums = categoryData.length >= allCategoryData.length && !customXRange;
      const defaultXAxisMin = shouldUseFixedXMinimums ? -5000 : Math.max(0, minAverageAmount - xPadding);
      const defaultXAxisMax = shouldUseFixedXMinimums 
        ? Math.max(51100, maxAverageAmount + 20000) 
        : maxAverageAmount + xPadding;
      
      // Y-axis always uses fixed minimums based on all categories
      const defaultYAxisMin = -50;
      const defaultYAxisMax = Math.max(110, maxTransactionCount + 100);

      // Use custom ranges if set, otherwise use calculated defaults
      const xAxisMin = customXRange?.min ?? defaultXAxisMin;
      const xAxisMax = customXRange?.max ?? defaultXAxisMax;
      const yAxisMin = customYRange?.min ?? defaultYAxisMin;
      const yAxisMax = customYRange?.max ?? defaultYAxisMax;

      const options = {
        title: ``,
        titleTextStyle: {
          fontSize: dimensions.width < 640 ? 14 : 16,
          fontName: 'Arial',
          color: '#374151'
        },
        hAxis: {
          title: `Average Amount per Transaction (${currency})`,
          titleTextStyle: {
            fontSize: dimensions.width < 640 ? 10 : 12,
            color: '#6B7280'
          },
          textStyle: {
            fontSize: dimensions.width < 640 ? 9 : 11,
            color: '#6B7280'
          },
          format: currency === 'USD' ? 'currency' : 'decimal',
          minValue: xAxisMin,
          maxValue: xAxisMax,
          viewWindow: {
            min: xAxisMin,
            max: xAxisMax
          },
          viewWindowMode: 'explicit'
        },
        vAxis: {
          title: 'Number of Transactions',
          titleTextStyle: {
            fontSize: dimensions.width < 640 ? 10 : 12,
            color: '#6B7280'
          },
          textStyle: {
            fontSize: dimensions.width < 640 ? 9 : 11,
            color: '#6B7280'
          },
          format: '0',
          minValue: yAxisMin,
          maxValue: yAxisMax,
          viewWindow: {
            min: yAxisMin,
            max: yAxisMax
          },
          viewWindowMode: 'explicit'
        },
        bubble: {
          textStyle: {
            fontSize: dimensions.width < 640 ? 7 : 8,
            fontName: 'Arial, sans-serif',
            color: '#FFFFFF',
            bold: true
          },
          opacity: 0.8
        },
        backgroundColor: 'transparent',
        chartArea: {
          left: dimensions.width < 640 ? 40 : 60,
          top: 10,
          width: dimensions.width < 640 ? '92%' : '95%',
          height: '90%'
        },
        legend: {
          position: 'none'
        },
        tooltip: {
          textStyle: {
            fontSize: 12,
            fontName: 'Arial, sans-serif'
          },
          showColorCode: false,
          trigger: 'hover'
        },
        // Disable interactions that cause scroll-blocking events
        enableInteractivity: true,
        explorer: {
          actions: [],
          maxZoomIn: 1,
          maxZoomOut: 1
        },
        // Use series colors for better control over individual bubbles
        series: categoryData.reduce((acc, category, index) => {
          acc[index] = { 
            color: category.color,
            visibleInLegend: false
          };
          return acc;
        }, {} as Record<number, { color: string; visibleInLegend: boolean }>),
        width: '100%',
        height: dimensions.height
      };

      const chart = new window.google.visualization.BubbleChart(chartRef.current);

      try {
        chart.draw(data, options);
        setIsChartLoading(false);
        
        // Show threshold line if there are high-value categories
        setShowThresholdLine(highValueCategories.length > 0);
      } catch (error) {
        console.error('Error drawing bubble chart:', error);
        setIsChartLoading(false);
        setShowThresholdLine(false);
      }
    };

    loadGoogleCharts();

    // Cleanup function
    return () => {
      if (chartRef.current) {
        chartRef.current.innerHTML = '';
      }
    };
  }, [categoryData, allCategoryData, currency, hasActiveFilters, dimensions, customXRange, customYRange]);

  if (allCategoryData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 w-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Income Categories Bubble Chart
        </h3>
        <div className="text-center py-8 text-gray-500">
          No income data available to display
        </div>
      </div>
    );
  }

  // Show a different message if all categories are excluded
  if (categoryData.length === 0 && excludedCategories.size > 0 && highValueCategories.length > 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Income Categories Analysis
          </h3>
        </div>
        
        {/* Category Selection Controls - Only high-value categories */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
          <div className="flex flex-wrap items-center gap-2">
            {highValueCategories
              .sort((a, b) => b.averageAmount - a.averageAmount)
              .map(category => (
                <button
                  key={category.name}
                  onClick={() => toggleCategoryExclusion(category.name)}
                  className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all bg-gray-200 text-gray-500 line-through opacity-60 hover:opacity-80"
                  title={`Click to show ${category.name} (Avg: ${formatCurrency(category.averageAmount, currency)})`}
                >
                  <div 
                    className="w-3 h-3 rounded" 
                    style={{ backgroundColor: '#d1d5db' }}
                  ></div>
                  <span>{category.name}</span>
                </button>
              ))}
            
            {/* Action Buttons - Inline with chips */}
            <div className="h-6 w-px bg-gray-300 mx-1"></div>
            <button
              onClick={includeAllCategories}
              className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded whitespace-nowrap font-medium"
            >
              Show All
            </button>
            <button
              onClick={excludeAllHighValueCategories}
              disabled={true}
              className="px-3 py-1 text-xs text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Hide High-Value
            </button>
          </div>
        </div>
        
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">👁️</div>
          <p>All high-value categories are hidden</p>
          <p className="text-sm mt-2">Click "Show All" to display the chart</p>
        </div>
      </div>
    );
  }

  const handleXRangeChange = (min: number, max: number) => {
    setCustomXRange({ min, max });
  };

  const handleYRangeChange = (min: number, max: number) => {
    setCustomYRange({ min, max });
  };

  const resetToDefaults = () => {
    setCustomXRange(null);
    setCustomYRange(null);
  };

  // Calculate threshold line position as a percentage
  const calculateThresholdPosition = () => {
    if (!showThresholdLine) return null;
    
    // Get the actual X-axis range being used
    const maxAverageAmount = categoryData.length > 0 
      ? Math.max(...categoryData.map(category => category.averageAmount))
      : 0;
    const minAverageAmount = categoryData.length > 0 
      ? Math.min(...categoryData.map(category => category.averageAmount))
      : 0;
    
    const xRange = maxAverageAmount - minAverageAmount;
    const xPadding = Math.max(xRange * 0.15, maxAverageAmount * 0.1);
    
    const shouldUseFixedXMinimums = categoryData.length >= allCategoryData.length && !customXRange;
    const xAxisMin = customXRange?.min ?? (shouldUseFixedXMinimums ? -5000 : Math.max(0, minAverageAmount - xPadding));
    const xAxisMax = customXRange?.max ?? (shouldUseFixedXMinimums 
      ? Math.max(51100, maxAverageAmount + 20000) 
      : maxAverageAmount + xPadding);
    
    // Calculate percentage position of threshold
    const totalRange = xAxisMax - xAxisMin;
    const thresholdFromMin = HIGH_VALUE_THRESHOLD - xAxisMin;
    const percentage = (thresholdFromMin / totalRange) * 100;
    
    // Only show if threshold is within visible range
    if (percentage < 0 || percentage > 100) return null;
    
    return percentage;
  };

  const thresholdPosition = calculateThresholdPosition();

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${dimensions.width < 640 ? 'p-4' : 'p-6'} mb-6 w-full`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`${dimensions.width < 640 ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>
          Income Categories Analysis
        </h3>
        <button
          onClick={() => setShowAxisControls(!showAxisControls)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {showAxisControls ? 'Hide Controls' : 'Adjust Scale'}
        </button>
      </div>
      
      {/* Category Selection Controls - Only show if there are high-value categories */}
      {highValueCategories.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
          {/* Category chips and action buttons on the same line */}
          <div className="flex flex-wrap items-center gap-2">
            {highValueCategories
              .sort((a, b) => b.averageAmount - a.averageAmount) // Sort by average amount descending
              .map(category => {
                const isExcluded = excludedCategories.has(category.name);
                return (
                  <button
                    key={category.name}
                    onClick={() => toggleCategoryExclusion(category.name)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      isExcluded
                        ? 'bg-gray-200 text-gray-500 line-through opacity-60 hover:opacity-80'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                    title={`Click to ${isExcluded ? 'show' : 'hide'} ${category.name} (Avg: ${formatCurrency(category.averageAmount, currency)})`}
                  >
                    <div 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: isExcluded ? '#d1d5db' : category.color }}
                    ></div>
                    <span>{category.name}</span>
                  </button>
                );
              })}
            
            {/* Action Buttons - Inline with chips */}
            <div className="h-6 w-px bg-gray-300 mx-1"></div>
            <button
              onClick={includeAllCategories}
              disabled={excludedCategories.size === 0}
              className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Show All
            </button>
            <button
              onClick={excludeAllHighValueCategories}
              disabled={highValueCategories.every(cat => excludedCategories.has(cat.name))}
              className="px-3 py-1 text-xs text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Hide High-Value
            </button>
          </div>
        </div>
      )}

      {showAxisControls && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* X-Axis Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                X-Axis Range (Average Amount)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  value={customXRange?.min ?? ''}
                  onChange={(e) => {
                    const min = e.target.value ? parseFloat(e.target.value) : (customXRange?.min ?? -5000);
                    const max = customXRange?.max ?? 51100;
                    handleXRangeChange(min, max);
                  }}
                  className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-500">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={customXRange?.max ?? ''}
                  onChange={(e) => {
                    const max = e.target.value ? parseFloat(e.target.value) : (customXRange?.max ?? 51100);
                    const min = customXRange?.min ?? -5000;
                    handleXRangeChange(min, max);
                  }}
                  className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-1 mt-2">
                <button
                  onClick={() => handleXRangeChange(0, 10000)}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  0-10K
                </button>
                <button
                  onClick={() => handleXRangeChange(0, 50000)}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  0-50K
                </button>
                <button
                  onClick={() => handleXRangeChange(0, 100000)}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  0-100K
                </button>
              </div>
            </div>
            
            {/* Y-Axis Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Y-Axis Range (Transaction Count)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  value={customYRange?.min ?? ''}
                  onChange={(e) => {
                    const min = e.target.value ? parseFloat(e.target.value) : (customYRange?.min ?? -50);
                    const max = customYRange?.max ?? 110;
                    handleYRangeChange(min, max);
                  }}
                  className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-500">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={customYRange?.max ?? ''}
                  onChange={(e) => {
                    const max = e.target.value ? parseFloat(e.target.value) : (customYRange?.max ?? 110);
                    const min = customYRange?.min ?? -50;
                    handleYRangeChange(min, max);
                  }}
                  className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-1 mt-2">
                <button
                  onClick={() => handleYRangeChange(0, 50)}
                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  0-50
                </button>
                <button
                  onClick={() => handleYRangeChange(0, 100)}
                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  0-100
                </button>
                <button
                  onClick={() => handleYRangeChange(0, 200)}
                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  0-200
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <button
              onClick={resetToDefaults}
              className="text-sm px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Reset to Auto
            </button>
          </div>
        </div>
      )}
      <div className="relative">
        {isChartLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm text-gray-600">Loading chart...</p>
            </div>
          </div>
        )}
        <div 
          ref={chartRef} 
          style={{ width: '100%', height: `${dimensions.height}px`, minHeight: '300px' }}
          className="overflow-hidden w-full"
        />
        {/* Threshold Line Overlay */}
        {showThresholdLine && thresholdPosition !== null && (
          <div 
            className="absolute pointer-events-none"
            style={{
              left: dimensions.width < 640 ? '40px' : '60px',
              top: '10px',
              width: dimensions.width < 640 ? 'calc(92% - 40px)' : 'calc(95% - 60px)',
              height: 'calc(90% - 10px)',
            }}
          >
            <svg
              width="100%"
              height="100%"
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              {/* Dotted vertical line */}
              <line
                x1={`${thresholdPosition}%`}
                y1="0"
                x2={`${thresholdPosition}%`}
                y2="100%"
                stroke="#059669"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              {/* Label background */}
              <rect
                x={`calc(${thresholdPosition}% - 50px)`}
                y="5"
                width="100"
                height="20"
                fill="white"
                fillOpacity="0.9"
                rx="3"
              />
              {/* Label text */}
              <text
                x={`${thresholdPosition}%`}
                y="18"
                textAnchor="middle"
                fill="#059669"
                fontSize={dimensions.width < 640 ? "9" : "10"}
                fontWeight="600"
              >
                {formatCurrency(HIGH_VALUE_THRESHOLD, currency)}
              </text>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
