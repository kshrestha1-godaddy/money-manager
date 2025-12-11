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
  Cell,
  LabelList,
} from "recharts";
import type { TooltipProps } from "recharts";
import { ChartControls } from "../../../components/ChartControls";
import { formatCurrency, getCurrencySymbol } from "../../../utils/currency";
import { useChartExpansion } from "../../../utils/chartUtils";
import type { DebtInterface } from "../../../types/debts";
import { calculateRemainingWithInterest } from "../../../utils/interestCalculation";

interface DebtStatusWaterfallChartProps {
  debts: DebtInterface[];
  currency: string;
  hasPageFilters?: boolean;
  pageStartDate?: string;
  pageEndDate?: string;
}

interface WaterfallDataPoint {
  name: string;
  value: number;
  displayValue: number;
  start: number;
  end: number;
  type: "total" | "decrease" | "partial" | "result";
  count: number;
  description: string;
}

// Subtle/muted colors for each bar type
const COLORS = {
  total: "#9ca3af",      // Soft gray for total lendings
  decrease: "#f87171",   // Soft coral for active (outstanding)
  partial: "#fbbf24",    // Soft amber for partially paid
  result: "#009933",     // Soft mint green for fully paid
};

// Pattern IDs for textures
const PATTERN_IDS = {
  total: "pattern-total",
  decrease: "pattern-decrease",
  partial: "pattern-partial",
  result: "pattern-result",
};

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

  // Filter debts based on date range
  const filteredDebts = useMemo(() => {
    const effectiveStartDate = startDate || (hasPageFilters ? pageStartDate : '');
    const effectiveEndDate = endDate || (hasPageFilters ? pageEndDate : '');

    if (!effectiveStartDate && !effectiveEndDate) return debts || [];
    if (!debts) return [];

    return debts.filter(debt => {
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
  }, [debts, startDate, endDate, pageStartDate, pageEndDate, hasPageFilters]);

  const waterfallData = useMemo(() => {
    let totalWithInterest = 0;
    let activeAmount = 0;
    let partialRemainingAmount = 0; // Only the remaining balance for partially paid
    let fullyPaidAmount = 0;
    
    const counts = { total: 0, active: 0, partial: 0, full: 0 };

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
      counts.total += 1;

      if (debt.status === "FULLY_PAID") {
        fullyPaidAmount += total;
        counts.full += 1;
      } else if (debt.status === "PARTIALLY_PAID") {
        // Use remainingAmount (what's still owed) instead of total
        partialRemainingAmount += result.remainingAmount;
        counts.partial += 1;
      } else {
        activeAmount += total;
        counts.active += 1;
      }
    });

    // Total outstanding = active + remaining from partial
    const totalOutstanding = activeAmount + partialRemainingAmount;

    // Build waterfall: Total → Fully Paid → Partially Paid (remaining) → Active
    const data: WaterfallDataPoint[] = [
      {
        name: "Total Lendings",
        value: totalWithInterest,
        displayValue: totalWithInterest,
        start: 0,
        end: totalWithInterest,
        type: "total",
        count: counts.total,
        description: "Total amount lent including interest"
      },
      {
        name: "Fully Paid",
        value: fullyPaidAmount,
        displayValue: fullyPaidAmount,
        start: totalWithInterest - fullyPaidAmount,
        end: totalWithInterest,
        type: "result",
        count: counts.full,
        description: "Debts completely repaid"
      },
      {
        name: "Partial Remaining",
        value: partialRemainingAmount,
        displayValue: partialRemainingAmount,
        start: activeAmount,
        end: activeAmount + partialRemainingAmount,
        type: "partial",
        count: counts.partial,
        description: "Remaining balance on partially paid debts"
      },
      {
        name: "Active",
        value: activeAmount,
        displayValue: activeAmount,
        start: 0,
        end: activeAmount,
        type: "decrease",
        count: counts.active,
        description: "Outstanding debts to be recovered"
      },
    ];

    const csvData: (string | number)[][] = [
      ["Category", "Amount", "Count", "Description"],
      ...data.map((d) => [d.name, d.displayValue, d.count, d.description]),
    ];

    return { data, totalWithInterest, totalOutstanding, csvData, totalDebts: counts.total };
  }, [filteredDebts]);

  // Get currency symbol for the user's selected currency
  const currencySymbol = getCurrencySymbol(currency);

  // Format large numbers compactly with proper currency symbol
  const formatCompact = (value: number): string => {
    if (value >= 1000000) {
      return `${currencySymbol}${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${currencySymbol}${(value / 1000).toFixed(1)}K`;
    }
    return formatCurrency(value, currency);
  };

  // Custom label component for values inside the bars
  const renderCustomLabel = (props: any) => {
    const { x, y, width, height, index } = props;
    const dataPoint = waterfallData.data[index];
    if (!dataPoint || dataPoint.displayValue === 0) return null;

    // Calculate percentage of total
    const percent = waterfallData.totalWithInterest > 0
      ? ((dataPoint.displayValue / waterfallData.totalWithInterest) * 100).toFixed(1)
      : "0.0";

    const amountText = formatCurrency(dataPoint.displayValue, currency);
    const percentText = `(${percent}%)`;
    
    // Check if bar is tall enough to fit text inside
    const minHeightForInside = 50;
    const isInsideBar = height >= minHeightForInside;
    
    // White text for inside bars, colored text for outside
    const textColor = isInsideBar ? "#ffffff" : 
      dataPoint.type === "total" ? "#4b5563" :
      dataPoint.type === "decrease" ? "#dc2626" :
      dataPoint.type === "partial" ? "#d97706" : "#16a34a";

    if (isInsideBar) {
      // Render inside the bar with amount and percentage
      return (
        <g>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            fill={textColor}
            textAnchor="middle"
            fontSize={isExpanded ? 13 : 11}
            fontWeight="600"
          >
            {amountText}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 12}
            fill={textColor}
            textAnchor="middle"
            fontSize={isExpanded ? 12 : 10}
            fontWeight="500"
            opacity={0.9}
          >
            {percentText}
          </text>
        </g>
      );
    }

    // Render outside the bar for small bars
    const isFloatingBar = dataPoint.type === "decrease" || dataPoint.type === "partial";
    return (
      <text
        x={x + width / 2}
        y={isFloatingBar ? y + height + 16 : y - 8}
        fill={textColor}
        textAnchor="middle"
        fontSize={isExpanded ? 11 : 9}
        fontWeight="600"
      >
        {`${amountText} ${percentText}`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const dataPoint = waterfallData.data.find(d => d.name === label);
    if (!dataPoint) return null;

    const percent = waterfallData.totalWithInterest > 0
      ? ((dataPoint.displayValue / waterfallData.totalWithInterest) * 100).toFixed(1)
      : "0.0";

    const avgPerDebt = dataPoint.count > 0 
      ? dataPoint.displayValue / dataPoint.count 
      : 0;

    const colorClass = 
      dataPoint.type === 'total' ? 'text-gray-600' :
      dataPoint.type === 'decrease' ? 'text-red-500' :
      dataPoint.type === 'partial' ? 'text-amber-500' : 'text-green-600';

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 min-w-[200px]">
        <div className="font-semibold text-gray-800 mb-2">{label}</div>
        
        <div className={`text-xl font-bold ${colorClass} mb-2`}>
          {formatCurrency(dataPoint.displayValue, currency)}
        </div>
        
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>% of Total:</span>
            <span className="font-medium text-gray-800">{percent}%</span>
          </div>
          <div className="flex justify-between">
            <span>Debts:</span>
            <span className="font-medium text-gray-800">{dataPoint.count}</span>
          </div>
          {dataPoint.count > 0 && (
            <div className="flex justify-between">
              <span>Avg per Debt:</span>
              <span className="font-medium text-gray-800">{formatCompact(avgPerDebt)}</span>
            </div>
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
    const start = new Date(today);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const targetMonth = currentMonth - months;

    if (targetMonth >= 0) {
      start.setMonth(targetMonth);
    } else {
      const yearsBack = Math.ceil(Math.abs(targetMonth) / 12);
      const newMonth = 12 + (targetMonth % 12);
      start.setFullYear(currentYear - yearsBack);
      start.setMonth(newMonth === 12 ? 0 : newMonth);
    }

    return {
      start: start.toISOString().split('T')[0] || '',
      end: today.toISOString().split('T')[0] || ''
    };
  };

  const handleQuickFilter = (months: number) => {
    const { start, end } = getDateRange(months);
    setStartDate(start);
    setEndDate(end);
  };

  // Download functions
  const downloadCustomPNG = async () => {
    const element = rechartRef.current;
    if (!element) return;

    const svgElement = element.querySelector('svg');
    if (!svgElement) return;

    try {
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      const bbox = svgElement.getBoundingClientRect();
      const width = bbox.width || 800;
      const height = bbox.height || 400;
      const titleHeight = 60;
      const exportHeight = height + titleHeight;
      
      clonedSvg.setAttribute('width', width.toString());
      clonedSvg.setAttribute('height', exportHeight.toString());
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      
      // Add background
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '100%');
      rect.setAttribute('height', '100%');
      rect.setAttribute('fill', 'white');
      clonedSvg.insertBefore(rect, clonedSvg.firstChild);
      
      // Add title
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      title.setAttribute('x', (width / 2).toString());
      title.setAttribute('y', '30');
      title.setAttribute('font-family', 'system-ui, sans-serif');
      title.setAttribute('font-size', '18');
      title.setAttribute('font-weight', 'bold');
      title.setAttribute('fill', '#111827');
      title.setAttribute('text-anchor', 'middle');
      title.textContent = 'Debt Recovery Waterfall';
      clonedSvg.appendChild(title);
      
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      canvas.width = width * 2;
      canvas.height = exportHeight * 2;
      
      img.onload = () => {
        if (ctx) {
          ctx.scale(2, 2);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.download = 'debt-waterfall.png';
              link.href = url;
              link.click();
              URL.revokeObjectURL(url);
            }
          }, 'image/png', 1.0);
        }
        URL.revokeObjectURL(svgUrl);
      };
      
      img.src = svgUrl;
    } catch (error) {
      console.error('Error downloading PNG:', error);
    }
  };

  const downloadCustomSVG = () => {
    const element = rechartRef.current;
    if (!element) return;

    const svgElement = element.querySelector('svg');
    if (!svgElement) return;

    try {
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'debt-waterfall.svg';
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading SVG:', error);
    }
  };

  // Empty state
  if (waterfallData.data.length === 0 || waterfallData.totalWithInterest === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 sm:p-6 ${isExpanded ? 'fixed inset-4 z-50 overflow-auto' : ''}`} ref={chartRef}>
        <ChartControls
          chartRef={chartRef}
          isExpanded={isExpanded}
          onToggleExpanded={toggleExpanded}
          title="Debt Recovery Waterfall"
          subtitle="Flow from total lendings to outstanding balance"
          fileName="debt-waterfall"
          csvData={[["Category", "Amount"]]}
          csvFileName="debt-waterfall-data"
          tooltipText="Waterfall chart showing how total lendings flow through repayment statuses to outstanding balance"
          customDownloadPNG={downloadCustomPNG}
          customDownloadSVG={downloadCustomSVG}
        />
        
        <DateFilterControls
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          handleQuickFilter={handleQuickFilter}
          clearFilters={clearFilters}
          hasPageFilters={hasPageFilters}
          pageStartDate={pageStartDate}
          pageEndDate={pageEndDate}
        />

        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">💰</div>
            <p>No debt data to display</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-4 sm:p-6 ${isExpanded ? 'fixed inset-4 z-50 overflow-auto' : ''}`} ref={chartRef}>
      <ChartControls
        chartRef={chartRef}
        isExpanded={isExpanded}
        onToggleExpanded={toggleExpanded}
        title={`Debt Recovery Waterfall${waterfallData.totalDebts > 0 ? ` • ${waterfallData.totalDebts} debt${waterfallData.totalDebts !== 1 ? 's' : ''}` : ''}`}
        subtitle="Flow from total lendings to outstanding balance"
        fileName="debt-waterfall"
        csvData={waterfallData.csvData}
        csvFileName="debt-waterfall-data"
        tooltipText="Waterfall chart showing how total lendings flow through repayment statuses to outstanding balance"
        customDownloadPNG={downloadCustomPNG}
        customDownloadSVG={downloadCustomSVG}
      />

      <DateFilterControls
        startDate={startDate}
        endDate={endDate}
        setStartDate={setStartDate}
        setEndDate={setEndDate}
        handleQuickFilter={handleQuickFilter}
        clearFilters={clearFilters}
        hasPageFilters={hasPageFilters}
        pageStartDate={pageStartDate}
        pageEndDate={pageEndDate}
      />

      <div className={`w-full ${isExpanded ? 'h-[75vh]' : 'h-96 sm:h-[450px]'}`} ref={rechartRef}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={waterfallData.data}
            margin={{ top: 36, right: 20, left: 16, bottom: 12 }}
            barCategoryGap="15%"
          >
            {/* SVG Pattern Definitions for Textures */}
            <defs>
              {/* Total - Subtle diagonal lines */}
              <pattern id={PATTERN_IDS.total} patternUnits="userSpaceOnUse" width="8" height="8">
                <rect width="8" height="8" fill={COLORS.total} />
                <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="#7c8591" strokeWidth="1" opacity="0.3" />
              </pattern>
              
              {/* Decrease (Active) - Horizontal lines */}
              <pattern id={PATTERN_IDS.decrease} patternUnits="userSpaceOnUse" width="6" height="6">
                <rect width="6" height="6" fill={COLORS.decrease} />
                <line x1="0" y1="3" x2="6" y2="3" stroke="#dc2626" strokeWidth="1" opacity="0.25" />
              </pattern>
              
              {/* Partial - Dots pattern */}
              <pattern id={PATTERN_IDS.partial} patternUnits="userSpaceOnUse" width="8" height="8">
                <rect width="8" height="8" fill={COLORS.partial} />
                <circle cx="4" cy="4" r="1.5" fill="#d97706" opacity="0.3" />
              </pattern>
              
              {/* Result (Fully Paid) - Subtle crosshatch */}
              <pattern id={PATTERN_IDS.result} patternUnits="userSpaceOnUse" width="8" height="8">
                <rect width="8" height="8" fill={COLORS.result} />
                <path d="M0,0 l8,8 M8,0 l-8,8" stroke="#10b981" strokeWidth="0.8" opacity="0.2" />
              </pattern>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#e5e7eb" 
              horizontal={true} 
              vertical={true} 
            />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: isExpanded ? 13 : 12, fill: '#374151' }}
              axisLine={{ stroke: '#9ca3af', strokeWidth: 1.5 }}
              tickLine={{ stroke: '#9ca3af' }}
              interval={0}
              dy={8}
            />
            <YAxis 
              tickFormatter={(v) => formatCompact(Number(v))}
              tick={{ fontSize: isExpanded ? 12 : 11, fill: '#6b7280' }}
              axisLine={{ stroke: '#9ca3af', strokeWidth: 1.5 }}
              tickLine={{ stroke: '#d1d5db' }}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />

            {/* Invisible spacer bar */}
            <Bar 
              dataKey="start" 
              stackId="waterfall" 
              fill="transparent"
              isAnimationActive={false}
            />
            
            {/* Main value bar */}
            <Bar 
              dataKey="value" 
              stackId="waterfall"
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={600}
            >
              <LabelList content={renderCustomLabel} />
              {waterfallData.data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#${PATTERN_IDS[entry.type]})`}
                  stroke={COLORS[entry.type]}
                  strokeWidth={1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.total }} />
          <span className="text-gray-600">Total</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.decrease }} />
          <span className="text-gray-600">Active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.partial }} />
          <span className="text-gray-600">Partially Paid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.result }} />
          <span className="text-gray-600">Fully Paid</span>
        </div>
      </div>
    </div>
  );
}

// Extracted Date Filter Controls component
function DateFilterControls({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  handleQuickFilter,
  clearFilters,
  hasPageFilters,
  pageStartDate,
  pageEndDate
}: {
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  handleQuickFilter: (months: number) => void;
  clearFilters: () => void;
  hasPageFilters: boolean;
  pageStartDate?: string;
  pageEndDate?: string;
}) {
  const hasFilters = startDate || endDate || (hasPageFilters && (pageStartDate || pageEndDate));
  
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
      {[1, 3, 6, 12].map((months) => (
        <button
          key={months}
          onClick={() => handleQuickFilter(months)}
          className="px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          {months === 12 ? '1Y' : `${months}M`}
        </button>
      ))}
      
      <span className="text-gray-300 mx-1">|</span>
      
      <span className="text-gray-500">From:</span>
      <input
        type="date"
        value={startDate || (hasPageFilters ? pageStartDate : '') || ''}
        onChange={(e) => setStartDate(e.target.value)}
        className="px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
      />
      <span className="text-gray-400">to</span>
      <input
        type="date"
        value={endDate || (hasPageFilters ? pageEndDate : '') || ''}
        onChange={(e) => setEndDate(e.target.value)}
        className="px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
      />

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="px-2 py-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}

export default DebtStatusWaterfallChart;
