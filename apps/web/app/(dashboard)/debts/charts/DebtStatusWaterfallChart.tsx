"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
  Cell,
} from "recharts";
import type { TooltipProps } from "recharts";
import { ChartControls } from "../../../components/ChartControls";
import { formatCurrency } from "../../../utils/currency";
import { useChartExpansion } from "../../../utils/chartUtils";
import type { DebtInterface } from "../../../types/debts";
import { calculateRemainingWithInterest } from "../../../utils/interestCalculation";

interface DebtStatusWaterfallChartProps {
  debts: DebtInterface[];
  currency: string;
  hasPageFilters?: boolean; // New prop to indicate if page-level filters are applied
  pageStartDate?: string; // Page-level start date filter
  pageEndDate?: string; // Page-level end date filter
}

interface ChartRow {
  name: string;
  value: number;
  cumulative: number;
  start: number;
  key: "TOTAL" | "ACTIVE" | "PARTIAL" | "FULL";
  count: number;
  averageAmount: number;
  minAmount: number;
  maxAmount: number;
  description: string;
  percentageOfTotal: number;
}

function getColor(key: ChartRow["key"]): string {
  switch (key) {
    case "TOTAL":
      return "#6b7280"; // gray
    case "ACTIVE":
      return "#ef4444"; // red
    case "PARTIAL":
      return "#f59e0b"; // amber
    case "FULL":
      return "#10b981"; // emerald
  }
}

export function DebtStatusWaterfallChart({ 
  debts, 
  currency,
  hasPageFilters = false,
  pageStartDate,
  pageEndDate
}: DebtStatusWaterfallChartProps) {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const { isExpanded, toggleExpanded } = useChartExpansion();
  const chartRef = useRef<HTMLDivElement>(null);
  const rechartRef = useRef<HTMLDivElement>(null);

  // Filter debts based on date range (by lentDate)
  const filteredDebts = useMemo(() => {
    // Use chart filters if they exist, otherwise use page filters
    const effectiveStartDate = startDate || (hasPageFilters ? pageStartDate : '');
    const effectiveEndDate = endDate || (hasPageFilters ? pageEndDate : '');

    if (!effectiveStartDate && !effectiveEndDate) return debts || [];

    if (!debts) return [];

    const filtered = debts.filter(debt => {
      const lentDate = debt.lentDate instanceof Date ? debt.lentDate : new Date(debt.lentDate);
      const lentDateStr = `${lentDate.getFullYear()}-${String(lentDate.getMonth() + 1).padStart(2, '0')}-${String(lentDate.getDate()).padStart(2, '0')}`;

      if (effectiveStartDate && effectiveEndDate) {
        return lentDateStr >= effectiveStartDate && lentDateStr <= effectiveEndDate;
      } else if (effectiveStartDate) {
        return lentDateStr >= effectiveStartDate;
      } else if (effectiveEndDate) {
        return lentDateStr <= effectiveEndDate;
      }
      return true;
    });

    return filtered;
  }, [debts, startDate, endDate, pageStartDate, pageEndDate, hasPageFilters]);

  const metrics = useMemo(() => {
    let totalWithInterest = 0;
    let activeAmount = 0;
    let partialAmount = 0;
    let fullyPaidAmount = 0;

    // Track detailed statistics for each category
    const categoryStats = {
      total: { count: 0, amounts: [] as number[] },
      active: { count: 0, amounts: [] as number[] },
      partial: { count: 0, amounts: [] as number[] },
      full: { count: 0, amounts: [] as number[] }
    };

    filteredDebts.forEach((debt) => {
      const result = calculateRemainingWithInterest(
        debt.amount,
        debt.interestRate,
        debt.lentDate instanceof Date ? debt.lentDate : new Date(debt.lentDate),
        debt.dueDate ? (debt.dueDate instanceof Date ? debt.dueDate : new Date(debt.dueDate)) : undefined,
        debt.repayments || [],
        new Date(),
        debt.status
      );

      const total = result.totalWithInterest;
      totalWithInterest += total;
      categoryStats.total.count += 1;
      categoryStats.total.amounts.push(total);

      if (debt.status === "FULLY_PAID") {
        // For fully paid, show the full amount with interest
        fullyPaidAmount += total;
        categoryStats.full.count += 1;
        categoryStats.full.amounts.push(total);
      } else if (debt.status === "PARTIALLY_PAID") {
        // For partially paid, show the full amount with interest
        partialAmount += total;
        categoryStats.partial.count += 1;
        categoryStats.partial.amounts.push(total);
      } else {
        // Treat ACTIVE/OVERDUE/DEFAULTED as active bucket, show full amount with interest
        activeAmount += total;
        categoryStats.active.count += 1;
        categoryStats.active.amounts.push(total);
      }
    });

    const safeTotal = totalWithInterest || 1; // avoid divide-by-zero

    // Helper function to calculate stats
    const calculateStats = (amounts: number[]) => ({
      average: amounts.length > 0 ? amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length : 0,
      min: amounts.length > 0 ? Math.min(...amounts) : 0,
      max: amounts.length > 0 ? Math.max(...amounts) : 0
    });

    const totalStats = calculateStats(categoryStats.total.amounts);
    const activeStats = calculateStats(categoryStats.active.amounts);
    const partialStats = calculateStats(categoryStats.partial.amounts);
    const fullStats = calculateStats(categoryStats.full.amounts);

    // Create waterfall chart data with enhanced statistics
    const rows: ChartRow[] = [
      { 
        name: "Total Lendings", 
        value: totalWithInterest, 
        cumulative: totalWithInterest,
        start: 0,
        key: "TOTAL",
        count: categoryStats.total.count,
        averageAmount: totalStats.average,
        minAmount: totalStats.min,
        maxAmount: totalStats.max,
        description: `All lendings including interest calculations. This represents the complete portfolio of debt instruments.`,
        percentageOfTotal: 100
      },
      { 
        name: "Active", 
        value: activeAmount, 
        cumulative: activeAmount,
        start: 0,
        key: "ACTIVE",
        count: categoryStats.active.count,
        averageAmount: activeStats.average,
        minAmount: activeStats.min,
        maxAmount: activeStats.max,
        description: `Outstanding debts requiring attention. Includes active, overdue, and defaulted loans with no repayments yet.`,
        percentageOfTotal: (activeAmount / safeTotal) * 100
      },
      { 
        name: "Partially Paid", 
        value: partialAmount, 
        cumulative: activeAmount + partialAmount,
        start: activeAmount,
        key: "PARTIAL",
        count: categoryStats.partial.count,
        averageAmount: partialStats.average,
        minAmount: partialStats.min,
        maxAmount: partialStats.max,
        description: `Debts with some repayments received but not fully settled. Progress made but balance remains.`,
        percentageOfTotal: (partialAmount / safeTotal) * 100
      },
      { 
        name: "Fully Paid", 
        value: fullyPaidAmount, 
        cumulative: activeAmount + partialAmount + fullyPaidAmount,
        start: activeAmount + partialAmount,
        key: "FULL",
        count: categoryStats.full.count,
        averageAmount: fullStats.average,
        minAmount: fullStats.min,
        maxAmount: fullStats.max,
        description: `Successfully completed debt agreements. All principal and interest have been repaid in full.`,
        percentageOfTotal: (fullyPaidAmount / safeTotal) * 100
      },
    ];

    const csvData: (string | number)[][] = [
      ["Category", "Amount", "Percent", "Count", "Average Amount", "Min Amount", "Max Amount", "Description"],
      ...rows.map((r) => [
        r.name, 
        r.value, 
        Number(((r.value / safeTotal) * 100).toFixed(2)),
        r.count,
        r.averageAmount.toFixed(2),
        r.minAmount.toFixed(2),
        r.maxAmount.toFixed(2),
        r.description
      ]),
    ];

    return { rows, totalWithInterest, csvData, totalDebts: categoryStats.total.count };
  }, [filteredDebts]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null;
    
    // Find the actual value (not the transparent spacer)
    const valuePayload = payload.find(p => p.dataKey === 'value');
    const value = valuePayload?.value as number || 0;
    
    // Find the corresponding row data for detailed information
    const rowData = metrics.rows.find(r => r.name === label);
    if (!rowData) return null;

    const percent = metrics.totalWithInterest
      ? ((value / metrics.totalWithInterest) * 100).toFixed(1)
      : "0.0";

    const cumulative = rowData.cumulative || 0;
    const cumulativePercent = metrics.totalWithInterest
      ? ((cumulative / metrics.totalWithInterest) * 100).toFixed(1)
      : "0.0";

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80 max-w-md">
        <div className="font-bold text-gray-900 mb-3 text-base">{label}</div>
        
        {/* Main Amount */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-gray-700">Total Amount:</span>
          <span className={`font-bold text-lg ${
            rowData.key === 'ACTIVE' ? 'text-red-600' :
            rowData.key === 'PARTIAL' ? 'text-yellow-600' :
            rowData.key === 'FULL' ? 'text-green-600' : 'text-gray-700'
          }`}>
            {formatCurrency(value, currency)}
          </span>
        </div>

        {/* Percentage and Cumulative */}
        <div className="space-y-2 mb-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Percentage of Total:</span>
            <span className="font-medium">{percent}%</span>
          </div>
          
          {rowData.key !== "TOTAL" && (
            <div className="flex justify-between">
              <span className="text-gray-600">Cumulative Amount:</span>
              <span className="font-medium text-blue-600">{formatCurrency(cumulative, currency)} ({cumulativePercent}%)</span>
            </div>
          )}
        </div>

        {/* Debt Statistics */}
        {rowData.count > 0 && (
          <div className="border-t border-gray-200 pt-3 mb-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Number of Debts:</span>
                <span className="font-medium">{rowData.count}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Average per Debt:</span>
                <span className="font-medium">{formatCurrency(rowData.averageAmount, currency)}</span>
              </div>
              
              {rowData.count > 1 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Range:</span>
                  <span className="font-medium">
                    {formatCurrency(rowData.minAmount, currency)} - {formatCurrency(rowData.maxAmount, currency)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Portfolio Context */}
        {rowData.key !== "TOTAL" && metrics.totalDebts > 0 && (
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between text-sm">
                <span className="text-gray-600">Portfolio Share:</span>
                <span className="font-medium">
                  {rowData.count} of {metrics.totalDebts} debt{metrics.totalDebts !== 1 ? 's' : ''} ({((rowData.count / metrics.totalDebts) * 100).toFixed(1)}%)
                </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  const getDateRange = (months: number) => {
    const today = new Date();
    const startDate = new Date(today);

    // Handle month rollover properly
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const targetMonth = currentMonth - months;

    if (targetMonth >= 0) {
      startDate.setMonth(targetMonth);
    } else {
      // Handle year rollover
      const yearsBack = Math.ceil(Math.abs(targetMonth) / 12);
      const newMonth = 12 + (targetMonth % 12);
      startDate.setFullYear(currentYear - yearsBack);
      startDate.setMonth(newMonth === 12 ? 0 : newMonth);
    }

    const start = startDate.toISOString().split('T')[0] || '';
    const end = today.toISOString().split('T')[0] || '';

    return { start, end };
  };

  const handleQuickFilter = (months: number) => {
    const { start, end } = getDateRange(months);
    setStartDate(start);
    setEndDate(end);
  };

  // Custom download functions for Recharts
  const downloadCustomPNG = async () => {
    const element = rechartRef.current;
    if (!element) return;

    const svgElement = element.querySelector('svg');
    if (!svgElement) return;

    try {
      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Get computed styles and dimensions
      const bbox = svgElement.getBoundingClientRect();
      const width = bbox.width || 800;
      const height = bbox.height || 600;
      
      // Add extra height for title and subtitle
      const titleHeight = 80;
      const exportHeight = height + titleHeight;
      
      // Set explicit dimensions on cloned SVG
      clonedSvg.setAttribute('width', width.toString());
      clonedSvg.setAttribute('height', exportHeight.toString());
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      
      // Adjust the chart position to make room for title
      const chartGroup = clonedSvg.querySelector('g');
      if (chartGroup) {
        const transform = chartGroup.getAttribute('transform') || '';
        const newTransform = transform ? `translate(0,${titleHeight}) ${transform}` : `translate(0,${titleHeight})`;
        chartGroup.setAttribute('transform', newTransform);
      }
      
      // Add white background
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '100%');
      rect.setAttribute('height', '100%');
      rect.setAttribute('fill', 'white');
      clonedSvg.insertBefore(rect, clonedSvg.firstChild);
      
      // Add title to the SVG
      const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      titleElement.setAttribute('x', (width / 2).toString());
      titleElement.setAttribute('y', '35');
      titleElement.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
      titleElement.setAttribute('font-size', '20');
      titleElement.setAttribute('font-weight', 'bold');
      titleElement.setAttribute('fill', '#111827');
      titleElement.setAttribute('text-anchor', 'middle');
      titleElement.textContent = 'Debts Waterfall';
      
      // Add subtitle
      const subtitleElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      subtitleElement.setAttribute('x', (width / 2).toString());
      subtitleElement.setAttribute('y', '55');
      subtitleElement.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
      subtitleElement.setAttribute('font-size', '14');
      subtitleElement.setAttribute('fill', '#6b7280');
      subtitleElement.setAttribute('text-anchor', 'middle');
      subtitleElement.textContent = 'Cumulative breakdown of lendings by repayment status';
      
      // Insert after the background rect (which is the first child)
      if (clonedSvg.children.length > 1 && clonedSvg.children[1]) {
        clonedSvg.insertBefore(titleElement, clonedSvg.children[1]);
        if (clonedSvg.children.length > 2 && clonedSvg.children[2]) {
          clonedSvg.insertBefore(subtitleElement, clonedSvg.children[2]);
        } else {
          clonedSvg.appendChild(subtitleElement);
        }
      } else {
        clonedSvg.appendChild(titleElement);
        clonedSvg.appendChild(subtitleElement);
      }
      
      // Convert to string
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      // Create canvas and image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      canvas.width = width * 2; // Higher resolution
      canvas.height = exportHeight * 2;
      
      img.onload = () => {
        if (ctx) {
          // Scale for higher quality
          ctx.scale(2, 2);
          ctx.drawImage(img, 0, 0);
          
          // Convert to PNG and download
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const downloadLink = document.createElement('a');
              downloadLink.download = 'debts-waterfall.png';
              downloadLink.href = url;
              document.body.appendChild(downloadLink);
              downloadLink.click();
              document.body.removeChild(downloadLink);
              URL.revokeObjectURL(url);
            }
          }, 'image/png', 1.0);
        }
        URL.revokeObjectURL(svgUrl);
      };
      
      img.onerror = () => {
        console.error('Failed to load SVG for PNG conversion');
        URL.revokeObjectURL(svgUrl);
        // Fallback: download as SVG
        downloadCustomSVG();
      };
      
      img.src = svgUrl;
      
    } catch (error) {
      console.error('Error converting to PNG:', error);
      // Fallback: download as SVG
      downloadCustomSVG();
    }
  };

  const downloadCustomSVG = () => {
    const element = rechartRef.current;
    if (!element) return;

    const svgElement = element.querySelector('svg');
    if (!svgElement) return;

    try {
      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Get computed styles and dimensions
      const bbox = svgElement.getBoundingClientRect();
      const width = bbox.width || 800;
      const height = bbox.height || 600;
      
      // Add extra height for title and subtitle
      const titleHeight = 80;
      const exportHeight = height + titleHeight;
      
      // Set explicit dimensions on cloned SVG
      clonedSvg.setAttribute('width', width.toString());
      clonedSvg.setAttribute('height', exportHeight.toString());
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      
      // Adjust the chart position to make room for title
      const chartGroup = clonedSvg.querySelector('g');
      if (chartGroup) {
        const transform = chartGroup.getAttribute('transform') || '';
        const newTransform = transform ? `translate(0,${titleHeight}) ${transform}` : `translate(0,${titleHeight})`;
        chartGroup.setAttribute('transform', newTransform);
      }
      
      // Add white background
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '100%');
      rect.setAttribute('height', '100%');
      rect.setAttribute('fill', 'white');
      clonedSvg.insertBefore(rect, clonedSvg.firstChild);
      
      // Add title to the SVG
      const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      titleElement.setAttribute('x', (width / 2).toString());
      titleElement.setAttribute('y', '35');
      titleElement.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
      titleElement.setAttribute('font-size', '20');
      titleElement.setAttribute('font-weight', 'bold');
      titleElement.setAttribute('fill', '#111827');
      titleElement.setAttribute('text-anchor', 'middle');
      titleElement.textContent = 'Debts Waterfall';
      
      // Add subtitle
      const subtitleElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      subtitleElement.setAttribute('x', (width / 2).toString());
      subtitleElement.setAttribute('y', '55');
      subtitleElement.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
      subtitleElement.setAttribute('font-size', '14');
      subtitleElement.setAttribute('fill', '#6b7280');
      subtitleElement.setAttribute('text-anchor', 'middle');
      subtitleElement.textContent = 'Cumulative breakdown of lendings by repayment status';
      
      // Insert after the background rect (which is the first child)
      if (clonedSvg.children.length > 1 && clonedSvg.children[1]) {
        clonedSvg.insertBefore(titleElement, clonedSvg.children[1]);
        if (clonedSvg.children.length > 2 && clonedSvg.children[2]) {
          clonedSvg.insertBefore(subtitleElement, clonedSvg.children[2]);
        } else {
          clonedSvg.appendChild(subtitleElement);
        }
      } else {
        clonedSvg.appendChild(titleElement);
        clonedSvg.appendChild(subtitleElement);
      }
      
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.download = 'debts-waterfall.svg';
      downloadLink.href = url;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading SVG:', error);
    }
  };

  // Handle empty data case
  if (metrics.rows.length === 0 || metrics.totalWithInterest === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-3 sm:p-6 ${isExpanded ? 'fixed inset-2 sm:inset-4 z-50 overflow-auto' : ''}`} role="region" aria-label="Debt Status Waterfall Chart" ref={chartRef}>
        <ChartControls
          chartRef={chartRef}
          isExpanded={isExpanded}
          onToggleExpanded={toggleExpanded}
          title="Debts Waterfall"
          subtitle="Cumulative breakdown of lendings by repayment status"
          fileName="debts-waterfall"
          csvData={[["Category", "Amount", "Percent"]]}
          csvFileName="debts-waterfall-data"
          tooltipText="Waterfall chart showing cumulative breakdown of total lendings across repayment statuses with detailed statistics including debt counts, averages, and ranges."
          customDownloadPNG={downloadCustomPNG}
          customDownloadSVG={downloadCustomSVG}
        />
        
        {/* Date Filter Controls */}
        <div className="mb-3 sm:mb-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg border">
            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <button
                onClick={() => handleQuickFilter(1)}
                className="px-2 sm:px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
              >
                1M
              </button>
              <button
                onClick={() => handleQuickFilter(3)}
                className="px-2 sm:px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
              >
                3M
              </button>
              <button
                onClick={() => handleQuickFilter(6)}
                className="px-2 sm:px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
              >
                6M
              </button>
              <button
                onClick={() => handleQuickFilter(12)}
                className="px-2 sm:px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
              >
                1Y
              </button>
            </div>

            {/* Divider - Hidden on mobile */}
            <div className="hidden sm:block h-4 w-px bg-gray-300"></div>

            {/* Custom Date Range */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">From:</span>
                <input
                  id="debt-chart-start-date"
                  type="date"
                  value={startDate || (hasPageFilters ? pageStartDate : '') || ''}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder={hasPageFilters && pageStartDate ? `Page filter: ${pageStartDate}` : ''}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white flex-1 sm:flex-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">to</span>
                <input
                  id="debt-chart-end-date"
                  type="date"
                  value={endDate || (hasPageFilters ? pageEndDate : '') || ''}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder={hasPageFilters && pageEndDate ? `Page filter: ${pageEndDate}` : ''}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white flex-1 sm:flex-none"
                />
              </div>
            </div>

            {/* Clear Button */}
            {(startDate || endDate || (hasPageFilters && (pageStartDate || pageEndDate))) && (
              <button
                onClick={clearFilters}
                className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors w-full sm:w-auto text-center"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">💰</div>
            <p>No debt data to display{(startDate || endDate) ? ' for the selected date range' : ''}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-3 sm:p-6 ${isExpanded ? 'fixed inset-2 sm:inset-4 z-50 overflow-auto' : ''}`} role="region" aria-label="Debt Status Waterfall Chart" ref={chartRef}>
      <ChartControls
        chartRef={chartRef}
        isExpanded={isExpanded}
        onToggleExpanded={toggleExpanded}
        title={`Debts Waterfall${metrics.totalDebts > 0 ? ` • ${metrics.totalDebts} debt${metrics.totalDebts !== 1 ? 's' : ''}` : ''}`}
        subtitle="Cumulative breakdown of lendings by repayment status with detailed portfolio analytics"
        fileName="debts-waterfall"
        csvData={metrics.csvData}
        csvFileName="debts-waterfall-data"
        tooltipText="Waterfall chart showing cumulative breakdown of total lendings across repayment statuses with detailed statistics including debt counts, averages, ranges, and portfolio share."
        customDownloadPNG={downloadCustomPNG}
        customDownloadSVG={downloadCustomSVG}
      />

      {/* Date Filter Controls */}
      <div className="mb-3 sm:mb-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg border">
          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <button
              onClick={() => handleQuickFilter(1)}
              className="px-2 sm:px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
            >
              1M
            </button>
            <button
              onClick={() => handleQuickFilter(3)}
              className="px-2 sm:px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
            >
              3M
            </button>
            <button
              onClick={() => handleQuickFilter(6)}
              className="px-2 sm:px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
            >
              6M
            </button>
            <button
              onClick={() => handleQuickFilter(12)}
              className="px-2 sm:px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
            >
              1Y
            </button>
          </div>

          {/* Divider - Hidden on mobile */}
          <div className="hidden sm:block h-4 w-px bg-gray-300"></div>

          {/* Custom Date Range */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">From:</span>
              <input
                id="debt-chart-start-date"
                type="date"
                value={startDate || (hasPageFilters ? pageStartDate : '') || ''}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder={hasPageFilters && pageStartDate ? `Page filter: ${pageStartDate}` : ''}
                className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white flex-1 sm:flex-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">to</span>
              <input
                id="debt-chart-end-date"
                type="date"
                value={endDate || (hasPageFilters ? pageEndDate : '') || ''}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder={hasPageFilters && pageEndDate ? `Page filter: ${pageEndDate}` : ''}
                className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white flex-1 sm:flex-none"
              />
            </div>
          </div>

          {/* Clear Button */}
          {(startDate || endDate || (hasPageFilters && (pageStartDate || pageEndDate))) && (
            <button
              onClick={clearFilters}
              className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors w-full sm:w-auto text-center"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className={`w-full ${isExpanded ? 'h-[70vh]' : 'h-[320px] sm:h-[420px]'}`} ref={rechartRef}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={metrics.rows} margin={{ 
            top: 16, 
            right: isExpanded ? 30 : 24, 
            left: 8, 
            bottom: 8 
          }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" strokeWidth={1} horizontal={true} vertical={true} />
            <XAxis dataKey="name" tick={{ fontSize: isExpanded ? 12 : 10 }} interval={0} />
            <YAxis tickFormatter={(v) => formatCurrency(Number(v), currency)} tick={{ fontSize: isExpanded ? 12 : 10 }} />
            <Tooltip content={<CustomTooltip />} />

            {/* Reference lines for waterfall levels */}
            {metrics.rows.slice(1).map((r) => (
              <ReferenceLine key={r.key} y={r.cumulative} stroke={getColor(r.key)} strokeDasharray="2 2" opacity={0.6} />
            ))}

            {/* Invisible/transparent bars for spacing in waterfall */}
            <Bar dataKey="start" fill="transparent" stackId="waterfall" barSize={300}/>
            
            {/* Main bars for waterfall effect */}
            <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]} barSize={300}>
              <LabelList
                position="center"
                formatter={(v: number, _n: any, entry: any) => {
                  const percent = metrics.totalWithInterest
                    ? ((v / metrics.totalWithInterest) * 100).toFixed(1)
                    : "0.0";
                  return `${formatCurrency(v, currency)}\n(${percent}%)`;
                }}
                className="fill-white text-[10px] leading-tight font-medium"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}
              />
              {metrics.rows.map((row, index) => (
                <Cell key={row.key} fill={getColor(row.key)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-6 text-xs sm:text-sm">
        {["TOTAL", "ACTIVE", "PARTIAL", "FULL"].map((k) => (
          <div key={k} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: getColor(k as ChartRow["key"]) }} />
            <span>
              {k === "TOTAL" ? "Total" : k === "ACTIVE" ? "Active" : k === "PARTIAL" ? "Partially Paid" : "Fully Paid"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DebtStatusWaterfallChart;


