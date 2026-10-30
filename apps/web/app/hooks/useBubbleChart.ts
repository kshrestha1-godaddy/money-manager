import { useEffect, useRef, useMemo, useState, useCallback, type PointerEvent, type MouseEvent, type KeyboardEvent } from 'react';
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
  hideHighValueByDefault?: boolean;
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
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    xPerPixel: number;
    yPerPixel: number;
  } | null>(null);
  const [categoryExclusionOverride, setExcludedCategories] = useState<Set<string> | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [minAverage, setMinAverage] = useState<number>(0);
  const [maxAverage, setMaxAverage] = useState<number>(Infinity);

  // Responsive dimensions with memoization
  const dimensions = useMemo(() => {
    if (typeof window === 'undefined') return { width: 1200, height: 600 };
    
    const { innerWidth, innerHeight } = window;
    let height = 600;
    
    if (innerWidth < 640) height = Math.min(innerHeight * 0.5, 450);
    else if (innerWidth < 1024) height = Math.min(innerHeight * 0.55, 600);
    else height = Math.min(innerHeight * 0.6, 700);
    
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

  const excludedCategories = useMemo(
    () => categoryExclusionOverride ?? new Set(
      config.hideHighValueByDefault
        ? allCategoryData.filter(category => category.averageAmount > config.highValueThreshold).map(category => category.name)
        : []
    ),
    [categoryExclusionOverride, allCategoryData, config.hideHighValueByDefault, config.highValueThreshold]
  );

  // Filter visible categories
  const visibleCategoryData = useMemo(() => 
    allCategoryData.filter(category => 
      !excludedCategories.has(category.name) &&
      category.averageAmount >= minAverage &&
      category.averageAmount <= maxAverage
    ),
    [allCategoryData, excludedCategories, minAverage, maxAverage]
  );

  // High-value categories
  const highValueCategories = useMemo(() => 
    allCategoryData.filter(cat => cat.averageAmount > config.highValueThreshold),
    [allCategoryData, config.highValueThreshold]
  );

  // Calculate axis ranges
  const baseAxisRanges = useMemo(() => {
    if (visibleCategoryData.length === 0) {
      return { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    }

    const averageAmounts = visibleCategoryData.map(cat => cat.averageAmount);
    const transactionCounts = allCategoryData.map(cat => cat.transactionCount);

    const maxAvg = Math.max(...averageAmounts);
    const minAvg = Math.min(...averageAmounts);
    const maxCount = Math.max(...transactionCounts);

    const xPadding = Math.max((maxAvg - minAvg) * 0.15, Math.abs(maxAvg) * 0.1, 1);
    const shouldUseFixedX = visibleCategoryData.length >= allCategoryData.length && !customXRange;

    return {
      xMin: customXRange?.min ?? (shouldUseFixedX ? -5000 : Math.max(0, minAvg - xPadding)),
      xMax: customXRange?.max ?? (shouldUseFixedX ? Math.max(51100, maxAvg + 20000) : maxAvg + xPadding),
      yMin: customYRange?.min ?? -50,
      yMax: customYRange?.max ?? Math.max(110, maxCount + 100)
    };
  }, [visibleCategoryData, allCategoryData, customXRange, customYRange]);

  const axisRanges = useMemo(() => {
    const { xMin, xMax, yMin, yMax } = baseAxisRanges;
    const xHalfRange = (xMax - xMin) / (2 * zoomLevel);
    const yHalfRange = (yMax - yMin) / (2 * zoomLevel);
    const xLimit = Math.max(0, (xMax - xMin) / 2 - xHalfRange);
    const yLimit = Math.max(0, (yMax - yMin) / 2 - yHalfRange);
    const xCenter = (xMin + xMax) / 2 + Math.max(-xLimit, Math.min(xLimit, panOffset.x));
    const yCenter = (yMin + yMax) / 2 + Math.max(-yLimit, Math.min(yLimit, panOffset.y));

    return {
      xMin: xCenter - xHalfRange,
      xMax: xCenter + xHalfRange,
      yMin: yCenter - yHalfRange,
      yMax: yCenter + yHalfRange
    };
  }, [baseAxisRanges, zoomLevel, panOffset]);

  // Start with the full view whenever the data or manual scale changes.
  useEffect(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    dragRef.current = null;
    setIsPanning(false);
  }, [baseAxisRanges]);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const changeZoom = useCallback((value: number, clientX?: number, clientY?: number) => {
    if (!Number.isFinite(value) || visibleCategoryData.length === 0) return;
    const next = Math.max(0.5, Math.min(8, value));
    const bounds = chartRef.current?.getBoundingClientRect();
    const xFraction = bounds && clientX !== undefined
      ? Math.max(0, Math.min(1, (clientX - bounds.left - (dimensions.width < 640 ? 40 : 60)) / (bounds.width * (dimensions.width < 640 ? 0.92 : 0.95)))) : 0.5;
    const yFraction = bounds && clientY !== undefined
      ? Math.max(0, Math.min(1, 1 - (clientY - bounds.top - 10) / (dimensions.height * 0.9))) : 0.5;
    const xSpan = axisRanges.xMax - axisRanges.xMin;
    const ySpan = axisRanges.yMax - axisRanges.yMin;
    setPanOffset({
      x: axisRanges.xMin + xFraction * xSpan + (0.5 - xFraction) * (baseAxisRanges.xMax - baseAxisRanges.xMin) / next - (baseAxisRanges.xMin + baseAxisRanges.xMax) / 2,
      y: axisRanges.yMin + yFraction * ySpan + (0.5 - yFraction) * (baseAxisRanges.yMax - baseAxisRanges.yMin) / next - (baseAxisRanges.yMin + baseAxisRanges.yMax) / 2
    });
    setZoomLevel(next);
  }, [visibleCategoryData.length, dimensions, axisRanges, baseAxisRanges]);

  const zoomIn = useCallback(() => changeZoom(zoomLevel * 1.5), [changeZoom, zoomLevel]);
  const zoomOut = useCallback(() => changeZoom(zoomLevel / 1.5), [changeZoom, zoomLevel]);

  const handleWheelZoom = useCallback((event: WheelEvent) => {
    // Require a modifier so scrolling the page over the chart still works.
    if (!(event.ctrlKey || event.metaKey) || !visibleCategoryData.length) return;
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? dimensions.height : 1);
    changeZoom(zoomLevel * Math.exp(-Math.max(-100, Math.min(100, delta)) * 0.005), event.clientX, event.clientY);
  }, [changeZoom, zoomLevel, visibleCategoryData.length, dimensions.height]);

  const handleDoubleClickZoom = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    changeZoom(event.shiftKey ? zoomLevel / 1.5 : zoomLevel * 1.5, event.clientX, event.clientY);
  }, [changeZoom, zoomLevel]);

  const handleChartKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !visibleCategoryData.length) return;
    if (event.key === '+' || event.key === '=') changeZoom(zoomLevel * 1.5);
    else if (event.key === '-') changeZoom(zoomLevel / 1.5);
    else if (event.key === '0' || event.key === 'Escape') resetZoom();
    else if (zoomLevel > 1 && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      const x = (axisRanges.xMin + axisRanges.xMax - baseAxisRanges.xMin - baseAxisRanges.xMax) / 2;
      const y = (axisRanges.yMin + axisRanges.yMax - baseAxisRanges.yMin - baseAxisRanges.yMax) / 2;
      setPanOffset({
        x: x + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0) * (axisRanges.xMax - axisRanges.xMin) * 0.1,
        y: y + (event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0) * (axisRanges.yMax - axisRanges.yMin) * 0.1
      });
    } else return;
    event.preventDefault();
  }, [visibleCategoryData.length, changeZoom, zoomLevel, resetZoom, axisRanges, baseAxisRanges]);

  const fitToData = useCallback(() => {
    if (!visibleCategoryData.length) return;
    const xs = visibleCategoryData.map(category => category.averageAmount);
    const ys = visibleCategoryData.map(category => category.transactionCount);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const xPadding = Math.max((xMax - xMin) * 0.2, Math.abs(xMax) * 0.1, 1);
    const yPadding = Math.max((yMax - yMin) * 0.2, yMax * 0.1, 1);
    setCustomXRange({ min: xMin - xPadding, max: xMax + xPadding });
    setCustomYRange({ min: yMin - yPadding, max: yMax + yPadding });
  }, [visibleCategoryData]);

  const handlePanStart = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (zoomLevel <= 1 || event.button !== 0 || !event.isPrimary || !chartRef.current) return;
    const bounds = chartRef.current.getBoundingClientRect();
    const plotWidth = bounds.width * (dimensions.width < 640 ? 0.92 : 0.95);
    const plotHeight = dimensions.height * 0.9;
    if (plotWidth <= 0 || plotHeight <= 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: (axisRanges.xMin + axisRanges.xMax - baseAxisRanges.xMin - baseAxisRanges.xMax) / 2,
      offsetY: (axisRanges.yMin + axisRanges.yMax - baseAxisRanges.yMin - baseAxisRanges.yMax) / 2,
      xPerPixel: (axisRanges.xMax - axisRanges.xMin) / plotWidth,
      yPerPixel: (axisRanges.yMax - axisRanges.yMin) / plotHeight
    };
    setIsPanning(true);
  }, [zoomLevel, dimensions, axisRanges, baseAxisRanges]);

  const handlePanMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPanOffset({
      x: drag.offsetX - (event.clientX - drag.x) * drag.xPerPixel,
      y: drag.offsetY + (event.clientY - drag.y) * drag.yPerPixel
    });
  }, []);

  const handlePanEnd = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

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
        Math.round(category.totalAmount * 100) / 100 // Use actual total amount for bubble size
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
            fontSize: dimensions.width < 640 ? 10 : 12,
            fontName: 'Arial, sans-serif',
            color: '#FFFFFF',
            bold: true
          }
        },
        sizeAxis: {
          minSize: 15,  // Minimum bubble size
          maxSize: 50   // Maximum bubble size
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
      const newSet = new Set(prev ?? excludedCategories);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
    if (customXRange) setCustomXRange(null);
  }, [customXRange, excludedCategories]);

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
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Average amount filter handlers
  const handleMinAverageChange = useCallback((value: number) => {
    setMinAverage(value);
  }, []);

  const handleMaxAverageChange = useCallback((value: number) => {
    setMaxAverage(value);
  }, []);

  const resetAverageFilters = useCallback(() => {
    setMinAverage(0);
    setMaxAverage(Infinity);
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
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    changeZoom,
    handleWheelZoom,
    handleDoubleClickZoom,
    handleChartKeyDown,
    fitToData,
    isPanning,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
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
    isDefaultTimeframe: !startDate && !endDate
  };
}
