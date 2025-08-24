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

      if (debt.status === "FULLY_PAID") {
        // For fully paid, show the full amount with interest
        fullyPaidAmount += total;
      } else if (debt.status === "PARTIALLY_PAID") {
        // For partially paid, show the full amount with interest
        partialAmount += total;
      } else {
        // Treat ACTIVE/OVERDUE/DEFAULTED as active bucket, show full amount with interest
        activeAmount += total;
      }
    });

    const safeTotal = totalWithInterest || 1; // avoid divide-by-zero

    // Create waterfall chart data with cumulative stacking
    const rows: ChartRow[] = [
      { 
        name: "Total Lendings", 
        value: totalWithInterest, 
        cumulative: totalWithInterest,
        start: 0,
        key: "TOTAL" 
      },
      { 
        name: "Active", 
        value: activeAmount, 
        cumulative: activeAmount,
        start: 0,
        key: "ACTIVE" 
      },
      { 
        name: "Partially Paid", 
        value: partialAmount, 
        cumulative: activeAmount + partialAmount,
        start: activeAmount,
        key: "PARTIAL" 
      },
      { 
        name: "Fully Paid", 
        value: fullyPaidAmount, 
        cumulative: activeAmount + partialAmount + fullyPaidAmount,
        start: activeAmount + partialAmount,
        key: "FULL" 
      },
    ];

    const csvData: (string | number)[][] = [
      ["Category", "Amount", "Percent"],
      ...rows.map((r) => [r.name, r.value, Number(((r.value / safeTotal) * 100).toFixed(2))]),
    ];



    return { rows, totalWithInterest, csvData };
  }, [filteredDebts]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null;
    
    // Find the actual value (not the transparent spacer)
    const valuePayload = payload.find(p => p.dataKey === 'value');
    const value = valuePayload?.value as number || 0;
    
    const percent = metrics.totalWithInterest
      ? ((value / metrics.totalWithInterest) * 100).toFixed(1)
      : "0.0";

    // Find the corresponding row data for cumulative information
    const rowData = metrics.rows.find(r => r.name === label);
    const cumulative = rowData?.cumulative || 0;
    const cumulativePercent = metrics.totalWithInterest
      ? ((cumulative / metrics.totalWithInterest) * 100).toFixed(1)
      : "0.0";

    return (
      <div className="bg-white border border-gray-200 shadow-md rounded-md p-3 text-xs">
        <div className="font-medium text-gray-800 mb-2">{label}</div>
        <div className="text-gray-600 space-y-1">
          <div>Amount: {formatCurrency(value, currency)} ({percent}%)</div>
          {rowData?.key !== "TOTAL" && (
            <div className="text-blue-600">Cumulative: {formatCurrency(cumulative, currency)} ({cumulativePercent}%)</div>
          )}
        </div>
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
          tooltipText="Waterfall chart showing cumulative breakdown of total lendings across repayment statuses (with interest)."
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
        title="Debts Waterfall"
        subtitle="Cumulative breakdown of lendings by repayment status"
        fileName="debts-waterfall"
        csvData={metrics.csvData}
        csvFileName="debts-waterfall-data"
                  tooltipText="Waterfall chart showing cumulative breakdown of total lendings across repayment statuses (with interest)."
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
            <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" strokeWidth={4} horizontal={true} vertical={true} />
            <XAxis dataKey="name" tick={{ fontSize: isExpanded ? 12 : 10 }} interval={0} />
            <YAxis tickFormatter={(v) => formatCurrency(Number(v), currency)} tick={{ fontSize: isExpanded ? 12 : 10 }} />
            <Tooltip content={<CustomTooltip />} />

            {/* Reference lines for waterfall levels */}
            {metrics.rows.slice(1).map((r) => (
              <ReferenceLine key={r.key} y={r.cumulative} stroke={getColor(r.key)} strokeDasharray="4 4" opacity={0.6} />
            ))}

            {/* Invisible/transparent bars for spacing in waterfall */}
            <Bar dataKey="start" fill="transparent" stackId="waterfall" />
            
            {/* Main bars for waterfall effect */}
            <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]}>
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


