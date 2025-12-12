import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { convertForDisplaySync } from '../utils/currencyDisplay';
import { formatCurrency } from '../utils/currency';

interface Transaction {
  categoryId: number;
  amount: number;
  currency: string;
  date: Date | string;
  category: {
    name: string;
    color?: string;
  };
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

interface BubbleChartConfig {
  highValueThreshold: number;
  defaultColor: string;
  thresholdColor: string;
  title: string;
}

interface UseBubbleChartProps {
  transactions: Transaction[];
  currency: string;
  config: BubbleChartConfig;
}

export function useBubbleChart({ transactions, currency, config }: UseBubbleChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAxisControls, setShowAxisControls] = useState(false);
  const [customXRange, setCustomXRange] = useState<AxisRange | null>(null);
  const [customYRange, setCustomYRange] = useState<AxisRange | null>(null);
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Responsive dimensions with memoization
  const dimensions = useMemo(() => {
    if (typeof window === 'undefined') return { width: 1200, height: 400 };
    
    const { innerWidth, innerHeight } = window;
    let height = 400;
    
    if (innerWidth < 640) height = Math.min(innerHeight * 0.4, 300);
    else if (innerWidth < 1024) height = Math.min(innerHeight * 0.45, 400);
    else height = Math.min(innerHeight * 0.5, 500);
    
    return { width: innerWidth, height };
  }, []);

  // Date filtering utilities
  const getDateRange = useCallback((months: number) => {
    const today = new Date();
    const startDate = new Date(today);
    const targetMonth = today.getMonth() - months;

    if (targetMonth >= 0) {
      startDate.setMonth(targetMonth);
    } else {
      const yearsBack = Math.ceil(Math.abs(targetMonth) / 12);
      const newMonth = 12 + (targetMonth % 12);
      startDate.setFullYear(today.getFullYear() - yearsBack);
      startDate.setMonth(newMonth === 12 ? 0 : newMonth);
    }

    return {
      start: startDate.toISOString().split('T')[0] || '',
      end: today.toISOString().split('T')[0] || ''
    };
  }, []);

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    if (!startDate && !endDate) return transactions;

    return transactions.filter(transaction => {
      const transactionDate = transaction.date instanceof Date 
        ? transaction.date 
        : new Date(transaction.date);
      const dateStr = transactionDate.toISOString().split('T')[0] || '';

      if (startDate && endDate) return dateStr >= startDate && dateStr <= endDate;
      if (startDate) return dateStr >= startDate;
      if (endDate) return dateStr <= endDate;
      return true;
    });
  }, [transactions, startDate, endDate]);

  // Process category data efficiently
  const allCategoryData = useMemo(() => {
    const categoryMap = new Map<number, CategoryData>();
    
    filteredTransactions.forEach(transaction => {
      const { categoryId, category } = transaction;
      const amount = convertForDisplaySync(transaction.amount, transaction.currency, currency);
      
      const existing = categoryMap.get(categoryId);
      if (existing) {
        existing.totalAmount += amount;
        existing.transactionCount += 1;
        existing.averageAmount = existing.totalAmount / existing.transactionCount;
      } else {
        categoryMap.set(categoryId, {
          name: category.name,
          totalAmount: amount,
          transactionCount: 1,
          averageAmount: amount,
          color: category.color || config.defaultColor
        });
      }
    });
    
    return Array.from(categoryMap.values());
  }, [filteredTransactions, currency, config.defaultColor]);

  // Filter visible categories
  const visibleCategoryData = useMemo(() => 
    allCategoryData.filter(category => !excludedCategories.has(category.name)),
    [allCategoryData, excludedCategories]
  );

  // High-value categories
  const highValueCategories = useMemo(() => 
    allCategoryData.filter(cat => cat.averageAmount > config.highValueThreshold),
    [allCategoryData, config.highValueThreshold]
  );

  // Calculate axis ranges
  const axisRanges = useMemo(() => {
    if (visibleCategoryData.length === 0) {
      return { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    }

    const averageAmounts = visibleCategoryData.map(cat => cat.averageAmount);
    const transactionCounts = allCategoryData.map(cat => cat.transactionCount);

    const maxAvg = Math.max(...averageAmounts);
    const minAvg = Math.min(...averageAmounts);
    const maxCount = Math.max(...transactionCounts);

    const xPadding = Math.max((maxAvg - minAvg) * 0.15, maxAvg * 0.1);
    const shouldUseFixedX = visibleCategoryData.length >= allCategoryData.length && !customXRange;

    return {
      xMin: customXRange?.min ?? (shouldUseFixedX ? -5000 : Math.max(0, minAvg - xPadding)),
      xMax: customXRange?.max ?? (shouldUseFixedX ? Math.max(51100, maxAvg + 20000) : maxAvg + xPadding),
      yMin: customYRange?.min ?? -50,
      yMax: customYRange?.max ?? Math.max(110, maxCount + 100)
    };
  }, [visibleCategoryData, allCategoryData, customXRange, customYRange]);

  // Chart drawing function
  const drawChart = useCallback(() => {
    if (!chartRef.current || visibleCategoryData.length === 0) {
      setIsLoading(false);
      return;
    }

    if (!window.google?.visualization?.BubbleChart) {
      setTimeout(drawChart, 100);
      return;
    }

    const dataArray: (string | number)[][] = [
      ['ID', 'Avg', 'Count', 'Category', 'Total']
    ];

    visibleCategoryData.forEach(category => {
      dataArray.push([
        category.name,
        Math.round(category.averageAmount * 100) / 100,
        category.transactionCount,
        category.name,
        Math.round(category.totalAmount * 100) / 100
      ]);
    });

    const data = window.google.visualization.arrayToDataTable(dataArray);
    const { xMin, xMax, yMin, yMax } = axisRanges;

      const options = {
        title: '',
        hAxis: {
          title: `Average Amount per Transaction (${currency})`,
          titleTextStyle: {
            fontSize: dimensions.width < 640 ? 9 : 10,
            color: '#6B7280',
            fontName: 'Arial'
          },
          textStyle: {
            fontSize: dimensions.width < 640 ? 8 : 9,
            color: '#9CA3AF'
          },
          format: currency === 'USD' ? 'currency' : 'decimal',
          minValue: xMin,
          maxValue: xMax,
          viewWindow: { min: xMin, max: xMax },
          viewWindowMode: 'explicit'
        },
        vAxis: {
          title: 'Number of Transactions',
          titleTextStyle: {
            fontSize: dimensions.width < 640 ? 9 : 10,
            color: '#6B7280',
            fontName: 'Arial'
          },
          textStyle: {
            fontSize: dimensions.width < 640 ? 8 : 9,
            color: '#9CA3AF'
          },
          format: '0',
          minValue: yMin,
          maxValue: yMax,
          viewWindow: { min: yMin, max: yMax },
          viewWindowMode: 'explicit'
        },
        bubble: { 
          opacity: 0.8,
          textStyle: {
            fontSize: dimensions.width < 640 ? 6 : 7,
            fontName: 'Arial, sans-serif',
            color: '#FFFFFF',
            bold: true
          }
        },
        backgroundColor: 'transparent',
        chartArea: {
          left: dimensions.width < 640 ? 40 : 60,
          top: 10,
          width: dimensions.width < 640 ? '92%' : '95%',
          height: '90%'
        },
        legend: { position: 'none' },
        tooltip: {
          textStyle: {
            fontSize: 10,
            fontName: 'Arial, sans-serif',
            color: '#374151'
          },
          showColorCode: false,
          trigger: 'hover'
        },
        enableInteractivity: true,
        explorer: { actions: [], maxZoomIn: 1, maxZoomOut: 1 },
        series: visibleCategoryData.reduce((acc, category, index) => {
          acc[index] = { color: category.color, visibleInLegend: false };
          return acc;
        }, {} as Record<number, { color: string; visibleInLegend: boolean }>),
        width: '100%',
        height: dimensions.height
      };

    const chart = new window.google.visualization.BubbleChart(chartRef.current);
    chart.draw(data, options);
    setIsLoading(false);
  }, [visibleCategoryData, axisRanges, currency, dimensions]);

  // Load Google Charts and draw
  useEffect(() => {
    if (visibleCategoryData.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const loadGoogleCharts = () => {
      if (window.google?.visualization?.BubbleChart) {
        drawChart();
        return;
      }

      if (!window.google?.charts) {
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/charts/loader.js';
        script.onload = () => {
          window.google.charts.load('current', { packages: ['corechart'] });
          window.google.charts.setOnLoadCallback(drawChart);
        };
        document.head.appendChild(script);
      } else {
        window.google.charts.load('current', { packages: ['corechart'] });
        window.google.charts.setOnLoadCallback(drawChart);
      }
    };

    loadGoogleCharts();
  }, [drawChart, visibleCategoryData.length]);

  // Category management functions
  const toggleCategoryExclusion = useCallback((categoryName: string) => {
    setExcludedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
    if (customXRange) setCustomXRange(null);
  }, [customXRange]);

  const includeAllCategories = useCallback(() => {
    setExcludedCategories(new Set());
    if (customXRange) setCustomXRange(null);
  }, [customXRange]);

  const excludeAllHighValueCategories = useCallback(() => {
    setExcludedCategories(new Set(highValueCategories.map(cat => cat.name)));
  }, [highValueCategories]);

  // Date filter functions
  const handleQuickFilter = useCallback((months: number) => {
    const { start, end } = getDateRange(months);
    setStartDate(start);
    setEndDate(end);
  }, [getDateRange]);

  const isActiveQuickFilter = useCallback((months: number) => {
    const { start, end } = getDateRange(months);
    return startDate === start && endDate === end;
  }, [startDate, endDate, getDateRange]);

  const clearTimeframeFilters = useCallback(() => {
    setStartDate("");
    setEndDate("");
  }, []);

  // Axis range functions
  const handleXRangeChange = useCallback((min: number, max: number) => {
    setCustomXRange({ min, max });
  }, []);

  const handleYRangeChange = useCallback((min: number, max: number) => {
    setCustomYRange({ min, max });
  }, []);

  const resetToDefaults = useCallback(() => {
    setCustomXRange(null);
    setCustomYRange(null);
  }, []);

  // Calculate threshold line position
  const thresholdPosition = useMemo(() => {
    if (highValueCategories.length === 0) return null;
    
    const { xMin, xMax } = axisRanges;
    const totalRange = xMax - xMin;
    const thresholdFromMin = config.highValueThreshold - xMin;
    const percentage = (thresholdFromMin / totalRange) * 100;
    
    return percentage >= 0 && percentage <= 100 ? percentage : null;
  }, [highValueCategories.length, axisRanges, config.highValueThreshold]);

  return {
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
    isDefaultTimeframe: !startDate && !endDate
  };
}
