"use client";

import { useEffect, useRef, useMemo, useState } from 'react';
import { Income } from '../../../types/financial';
import { convertForDisplaySync } from '../../../utils/currencyDisplay';

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

export function IncomeBubbleChart({ incomes, currency, hasActiveFilters }: IncomeBubbleChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
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

  // Process income data by categories
  const categoryData = useMemo(() => {
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
          minValue: -2000,
          maxValue: 1100
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
          minValue: -5,
          maxValue: 110
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
          top: 45,
          width: dimensions.width < 640 ? '92%' : '95%',
          height: '80%'
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
      } catch (error) {
        console.error('Error drawing bubble chart:', error);
        setIsChartLoading(false);
      }
    };

    loadGoogleCharts();

    // Cleanup function
    return () => {
      if (chartRef.current) {
        chartRef.current.innerHTML = '';
      }
    };
  }, [categoryData, currency, hasActiveFilters, dimensions]);

  if (categoryData.length === 0) {
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

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${dimensions.width < 640 ? 'p-4' : 'p-6'} mb-6 w-full`}>
      <div>
        <h3 className={`${dimensions.width < 640 ? 'text-base' : 'text-lg'} font-semibold text-gray-900 mb-2`}>
          Income Categories Analysis
        </h3>
      </div>
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
      </div>
    </div>
  );
}
