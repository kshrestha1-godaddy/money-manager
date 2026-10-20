"use client";

import React, { useMemo, useRef, useState } from "react";
import { ChartControls } from "../../../components/ChartControls";
import { formatCurrency } from "../../../utils/currency";
import { useChartExpansion } from "../../../utils/chartUtils";
import type { DebtInterface } from "../../../types/debts";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { calculateDebtRecovery } from "../../../utils/debtRecovery";

interface DebtStatusWaterfallChartProps {
  debts: DebtInterface[];
  currency: string;
  baseCurrency?: string;
  hasPageFilters?: boolean;
  pageStartDate?: string;
  pageEndDate?: string;
}

const RECOVERED_COLOR = "#0d9488";
const OUTSTANDING_COLOR = "#f59e0b";
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function DebtStatusWaterfallChart({
  debts,
  currency,
  baseCurrency = currency,
  hasPageFilters = false,
  pageStartDate,
  pageEndDate,
}: DebtStatusWaterfallChartProps) {
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { isExpanded, toggleExpanded } = useChartExpansion();
  const chartRef = useRef<HTMLDivElement>(null);

  const filteredDebts = useMemo(() => {
    const from = startDate || (hasPageFilters ? pageStartDate : "");
    const to = endDate || (hasPageFilters ? pageEndDate : "");
    return (debts || []).filter(debt => {
      if (!from && !to) return true;
      const date = localDate(new Date(debt.lentDate));
      return (!from || date >= from) && (!to || date <= to);
    });
  }, [debts, startDate, endDate, hasPageFilters, pageStartDate, pageEndDate]);

  const recovery = useMemo(() => calculateDebtRecovery(filteredDebts), [filteredDebts]);
  const convert = (value: number) => convertForDisplaySync(value, baseCurrency, currency);
  const money = (value: number) => formatCurrency(convert(value), currency);
  const recoveryPercent = recovery.totalWithInterest > 0
    ? (recovery.totalRepaid / recovery.totalWithInterest) * 100 : 0;
  const rows = [
    { name: "Fully repaid", count: recovery.counts.full, recovered: convert(recovery.fullyPaidAmount), outstanding: 0, description: "Loans with no remaining balance." },
    { name: "Partially repaid", count: recovery.counts.partial, recovered: convert(recovery.partialRepaidAmount), outstanding: convert(recovery.partialRemainingAmount), description: "Repayments received and the balance still to collect." },
    { name: "Awaiting repayment", count: recovery.counts.active, recovered: 0, outstanding: convert(recovery.activeAmount), description: "Loans with no repayments received." },
  ];
  const csvData: (string | number)[][] = [
    ["Loan group", "Loans", `Recovered (${currency})`, `Outstanding (${currency})`, `Total including interest (${currency})`],
    ...rows.map(row => [row.name, row.count, row.recovered, row.outstanding, row.recovered + row.outstanding]),
    ["Total", recovery.counts.total, convert(recovery.totalRepaid), convert(recovery.totalOutstanding), convert(recovery.totalWithInterest)],
  ];
  const donutSegments = [
    { name: "Fully paid", amount: recovery.fullyPaidAmount, count: recovery.counts.full, color: RECOVERED_COLOR },
    { name: "Partially paid", amount: recovery.partialRepaidAmount + recovery.partialRemainingAmount, count: recovery.counts.partial, color: "#3b82f6" },
    { name: "Awaiting repayment", amount: recovery.activeAmount, count: recovery.counts.active, color: OUTSTANDING_COLOR },
  ];
  const hoveredSegment = activeSegment === null ? null : donutSegments[activeSegment];
  const hoveredRow = activeSegment === null ? null : rows[activeSegment];
  const outstandingLoans = recovery.counts.partial + recovery.counts.active;
  const segments = [
    { name: "Recovered", amount: recovery.totalRepaid, color: RECOVERED_COLOR },
    { name: "Outstanding", amount: recovery.totalOutstanding, color: OUTSTANDING_COLOR },
  ];

  const handleQuickFilter = (months: number) => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(1);
    from.setMonth(from.getMonth() - months);
    const lastDay = new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate();
    from.setDate(Math.min(today.getDate(), lastDay));
    setStartDate(localDate(from));
    setEndDate(localDate(today));
  };

  return (
    <div ref={chartRef} className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 ${isExpanded ? "fixed inset-4 z-50 overflow-auto" : "h-full"}`}>
      <ChartControls
        chartRef={chartRef}
        isExpanded={isExpanded}
        onToggleExpanded={toggleExpanded}
        title="Debt recovery"
        subtitle="Loan status by value, with recovered and outstanding balances."
        fileName="debt-recovery"
        csvData={csvData}
        csvFileName="debt-recovery-data"
      />
      <DateFilterControls
        startDate={startDate} endDate={endDate}
        setStartDate={setStartDate} setEndDate={setEndDate}
        handleQuickFilter={handleQuickFilter}
        clearFilters={() => { setStartDate(""); setEndDate(""); }}
        hasPageFilters={hasPageFilters} pageStartDate={pageStartDate} pageEndDate={pageEndDate}
      />
      {filteredDebts.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
          <p className="font-medium text-gray-700">No loans in this period</p>
          <p className="text-sm text-gray-500">Adjust the lending dates to see your recovery breakdown.</p>
        </div>
      ) : (
        <>
          <div className="mx-auto grid max-w-5xl items-center gap-6 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-6 md:py-8">
            <div className="relative text-center">
              <svg
                viewBox="0 0 320 320"
                className={`mx-auto w-full ${isExpanded ? "max-w-[420px]" : "max-w-[320px]"}`}
                role="group"
                aria-label={`Loan status by value: ${donutSegments.map(segment => `${segment.name}: ${money(segment.amount)}`).join(", ")}. Overall ${recoveryPercent.toFixed(1)}% recovered.`}
              >
                <title>Loan value by repayment status, including interest</title>
                <circle cx="160" cy="160" r="120" fill="none" stroke="#f1f5f9" strokeWidth="28" />
                {donutSegments.map((segment, index) => {
                  const percent = recovery.totalWithInterest > 0 ? segment.amount / recovery.totalWithInterest * 100 : 0;
                  const precedingAmount = donutSegments.slice(0, index).reduce((sum, item) => sum + item.amount, 0);
                  const offset = recovery.totalWithInterest > 0 ? precedingAmount / recovery.totalWithInterest * 100 : 0;
                  const gap = Math.min(percent * 0.2, 0.8);
                  const arcLength = percent - gap;
                  const cornerRadius = Math.min(3, (arcLength / 100) * Math.PI * 120 * 0.4);
                  const cornerAngle = cornerRadius / 120;
                  const startAngle = ((offset + gap / 2) / 100) * Math.PI * 2 - Math.PI / 2 + cornerAngle;
                  const endAngle = startAngle + (arcLength / 100) * Math.PI * 2 - 2 * cornerAngle;
                  const outerRadius = 134 - cornerRadius;
                  const innerRadius = 106 + cornerRadius;
                  const point = (radius: number, angle: number) => `${160 + radius * Math.cos(angle)},${160 + radius * Math.sin(angle)}`;
                  const largeArc = arcLength > 50 ? 1 : 0;
                  const arcPath = `M ${point(outerRadius, startAngle)} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${point(outerRadius, endAngle)} L ${point(innerRadius, endAngle)} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${point(innerRadius, startAngle)} Z`;
                  return percent > 0 ? (
                    <path
                      key={segment.name}
                      d={arcPath}
                      fill={segment.color} stroke={segment.color} strokeWidth={cornerRadius * 2}
                      strokeLinejoin="round"
                      tabIndex={0}
                      role="graphics-symbol"
                      aria-label={`${segment.name}: ${segment.count} loans, ${money(segment.amount)}, ${percent.toFixed(1)}% of total loan value`}
                      aria-describedby={activeSegment === index ? "debt-recovery-segment-tooltip" : undefined}
                      onMouseEnter={() => setActiveSegment(index)}
                      onMouseLeave={() => setActiveSegment(null)}
                      onFocus={() => setActiveSegment(index)}
                      onBlur={() => setActiveSegment(null)}
                      onClick={() => setActiveSegment(activeSegment === index ? null : index)}
                      onKeyDown={(event) => { if (event.key === "Escape") setActiveSegment(null); }}
                      className="cursor-pointer outline-none transition-opacity hover:opacity-80 focus:opacity-70"
                    >
                      <title>{segment.name}: {money(segment.amount)} ({percent.toFixed(1)}%)</title>
                    </path>
                  ) : null;
                })}
                <text x="160" y="155" textAnchor="middle" fill="#0f172a" fontSize="44" fontWeight="600" fontFamily="system-ui, sans-serif">{recoveryPercent.toFixed(1)}%</text>
                <text x="160" y="184" textAnchor="middle" fill="#64748b" fontSize="14" fontFamily="system-ui, sans-serif">recovered</text>
                <text x="160" y="207" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="system-ui, sans-serif">overall recovery rate</text>
              </svg>
              {hoveredSegment && hoveredRow && (
                <div id="debt-recovery-segment-tooltip" role="tooltip" className="pointer-events-none absolute left-1/2 top-2 z-10 w-64 max-w-full -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-4 text-left text-xs shadow-lg">
                  <p className="font-semibold text-gray-900">{hoveredSegment.name} · {hoveredSegment.count} {hoveredSegment.count === 1 ? "loan" : "loans"}</p>
                  <p className="mt-1 leading-relaxed text-gray-500">{hoveredRow.description}</p>
                  <dl className="mt-3 space-y-2 tabular-nums">
                    <div className="flex justify-between gap-2"><dt>Loan value</dt><dd className="font-medium">{money(hoveredSegment.amount)}</dd></div>
                    <div className="flex justify-between gap-2"><dt>Share of total</dt><dd>{recovery.totalWithInterest > 0 ? (hoveredSegment.amount / recovery.totalWithInterest * 100).toFixed(1) : "0.0"}%</dd></div>
                    <div className="flex justify-between gap-2 text-teal-700"><dt>Recovered</dt><dd>{formatCurrency(hoveredRow.recovered, currency)}</dd></div>
                    <div className="flex justify-between gap-2 text-amber-700"><dt>Outstanding</dt><dd>{formatCurrency(hoveredRow.outstanding, currency)}</dd></div>
                    <div className="flex justify-between gap-2 border-t border-gray-100 pt-2"><dt>Average loan value</dt><dd>{money(hoveredSegment.count > 0 ? hoveredSegment.amount / hoveredSegment.count : 0)}</dd></div>
                  </dl>
                </div>
              )}
              <p className="mb-3 text-xs text-gray-500">Loan status · share of total value including interest</p>
              <ul className="mx-auto max-w-xs space-y-2 text-xs text-gray-600">
                {donutSegments.map(segment => (
                  <li key={segment.name} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />{segment.name} ({segment.count})</span>
                    <span className="tabular-nums">{recovery.totalWithInterest > 0 ? (segment.amount / recovery.totalWithInterest * 100).toFixed(1) : "0.0"}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0">
              <div className="mb-6 border-b border-gray-100 pb-5">
                <p className="text-xs font-medium text-gray-500">Total loan value</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 tabular-nums sm:text-3xl">{money(recovery.totalWithInterest)}</p>
                <p className="mt-2 text-xs leading-relaxed text-gray-500">{money(recovery.totalPrincipal)} principal + {money(recovery.totalInterest)} interest</p>
              </div>
              <div className="space-y-6">
                {segments.map((segment, index) => (
                  <div key={segment.name}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm font-medium text-gray-700"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />{segment.name}</span>
                      <span className="text-xs text-gray-500 tabular-nums">{recovery.totalWithInterest > 0 ? (segment.amount / recovery.totalWithInterest * 100).toFixed(1) : "0.0"}%</span>
                    </div>
                    <p className={`mt-1.5 text-xl font-semibold tabular-nums ${index === 0 ? "text-teal-700" : "text-amber-700"}`}>{money(segment.amount)}</p>
                    <dl className="mt-3 space-y-2 border-l border-gray-200 pl-4 text-xs">
                      {(index === 0
                        ? [{ label: `Fully repaid loans (${recovery.counts.full})`, amount: recovery.fullyPaidAmount }, { label: `Partial repayments (${recovery.counts.partial})`, amount: recovery.partialRepaidAmount }]
                        : [{ label: `Partially repaid loans (${recovery.counts.partial})`, amount: recovery.partialRemainingAmount }, { label: `Awaiting repayment (${recovery.counts.active})`, amount: recovery.activeAmount }]
                      ).map(item => (
                        <div key={item.label} className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt className="text-gray-500">{item.label}</dt><dd className="font-medium text-gray-700 tabular-nums">{money(item.amount)}</dd></div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50/70 p-4 sm:grid-cols-3">
            {[
              { label: "Loans fully repaid", value: `${recovery.counts.full} / ${recovery.counts.total}`, detail: `${recovery.counts.total > 0 ? (recovery.counts.full / recovery.counts.total * 100).toFixed(1) : "0.0"}% of loan count` },
              { label: "Loans still outstanding", value: String(outstandingLoans), detail: `${recovery.counts.partial} partial · ${recovery.counts.active} awaiting repayment` },
              { label: "Average outstanding balance", value: money(outstandingLoans > 0 ? recovery.totalOutstanding / outstandingLoans : 0), detail: "Per loan with a balance due" },
            ].map(item => <div key={item.label}><dt className="text-xs text-gray-500">{item.label}</dt><dd className="mt-1 text-base font-semibold text-gray-900 tabular-nums">{item.value}</dd><dd className="mt-1 text-xs text-gray-500">{item.detail}</dd></div>)}
          </dl>
          <p className="mt-4 border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-400">Filtered by lending date. Amounts reflect current repayments and include interest.</p>
        </>
      )}
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
  const hasFilters = startDate || endDate;
  
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
      
      <label htmlFor="debt-recovery-start-date" className="text-gray-500">From:</label>
      <input
        type="date"
        id="debt-recovery-start-date"
        value={startDate || (hasPageFilters ? pageStartDate : '') || ''}
        onChange={(e) => setStartDate(e.target.value)}
        className="px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
      />
      <label htmlFor="debt-recovery-end-date" className="text-gray-400">to</label>
      <input
        type="date"
        id="debt-recovery-end-date"
        value={endDate || (hasPageFilters ? pageEndDate : '') || ''}
        onChange={(e) => setEndDate(e.target.value)}
        className="px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
      />

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="px-2 py-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        >
          Reset dates
        </button>
      )}
    </div>
  );
}

export default DebtStatusWaterfallChart;
