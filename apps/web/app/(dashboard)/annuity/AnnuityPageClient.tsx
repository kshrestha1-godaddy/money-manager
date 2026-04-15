"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCurrency } from "../../providers/CurrencyProvider";
import { formatCurrency } from "../../utils/currency";
import { convertForDisplaySync } from "../../utils/currencyDisplay";
import { SUPPORTED_CURRENCIES } from "../../utils/currencyConversion";
import {
  CONTAINER_COLORS,
  INPUT_COLORS,
  TEXT_COLORS,
} from "../../config/colorConfig";
import { CalculatorInputsFields } from "./components/CalculatorInputsFields";
import { AnnuityCompareView } from "./components/AnnuityCompareView";
import { AnnuitySummaryCard } from "./components/AnnuitySummaryCard";
import { PremiumIrrCalculator } from "./components/PremiumIrrCalculator";
import { SavedPresetsSection } from "./components/SavedPresetsSection";
import {
  buildChartScrollWidth,
  buildChartXTicks,
  buildCsvFromCalculationRows,
  computeAnnuitySnapshot,
  formatChartAxisValue,
  getInterestSharePercent,
  roundCurrency,
} from "./annuity-math";
import { clampYears } from "./calculator-input-utils";
import {
  updateAnnuityCalculatorPresetProgress,
  type AnnuityCalculatorPresetDTO,
} from "./actions/annuity-calculator-presets";
import type { CalculatorInputs } from "./types";
import { DEFAULT_ANNUITY_INPUTS, normalizeAnnuityInputs } from "./types";

const pageContainer = CONTAINER_COLORS.page;
const pageTitle = TEXT_COLORS.title;
const pageSubtitle = TEXT_COLORS.subtitle;
const standardInput = INPUT_COLORS.standard;

function formatAmountForDisplay(
  amount: number,
  baseCurrencyCode: string,
  displayCurrencyCode: string
): string {
  const converted = convertForDisplaySync(amount, baseCurrencyCode, displayCurrencyCode);
  return formatCurrency(converted, displayCurrencyCode);
}

type PageMode = "single" | "compare" | "premium-irr";

export default function AnnuityPageClient() {
  const { currency: userCurrency } = useCurrency();
  const [pageMode, setPageMode] = useState<PageMode>("single");
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_ANNUITY_INPUTS);
  const [selectedCurrency, setSelectedCurrency] = useState(userCurrency || "USD");
  const [trackedPresetId, setTrackedPresetId] = useState<number | null>(null);
  const [trackedInputsSnapshot, setTrackedInputsSnapshot] = useState<CalculatorInputs | null>(null);
  const [trackedCompletedMonths, setTrackedCompletedMonths] = useState<number[]>([]);
  const [progressSavingMonth, setProgressSavingMonth] = useState<number | null>(null);
  /** Mirrors `trackedCompletedMonths` so toggles always read the latest list (state updates are async; closure was stale). */
  const trackedCompletedMonthsRef = useRef<number[]>([]);

  useEffect(() => {
    trackedCompletedMonthsRef.current = trackedCompletedMonths;
  }, [trackedCompletedMonths]);

  useEffect(() => {
    setSelectedCurrency(userCurrency || "USD");
  }, [userCurrency]);

  const inputsMatchTrackedPreset = useMemo(() => {
    if (trackedPresetId == null || !trackedInputsSnapshot) return false;
    return (
      JSON.stringify(normalizeAnnuityInputs(inputs)) ===
      JSON.stringify(normalizeAnnuityInputs(trackedInputsSnapshot))
    );
  }, [trackedPresetId, trackedInputsSnapshot, inputs]);

  const showMonthProgressColumn = trackedPresetId !== null && inputsMatchTrackedPreset;

  const handleLoadPreset = useCallback((preset: AnnuityCalculatorPresetDTO) => {
    const months = [...preset.completedMonths];
    trackedCompletedMonthsRef.current = months;
    setInputs(preset.inputs);
    setTrackedPresetId(preset.id);
    setTrackedInputsSnapshot(normalizeAnnuityInputs(preset.inputs));
    setTrackedCompletedMonths(months);
  }, []);

  const handleStopTrackingPreset = useCallback(() => {
    trackedCompletedMonthsRef.current = [];
    setTrackedPresetId(null);
    setTrackedInputsSnapshot(null);
    setTrackedCompletedMonths([]);
  }, []);

  const handlePresetDeleted = useCallback(
    (id: number) => {
      if (id === trackedPresetId) handleStopTrackingPreset();
    },
    [trackedPresetId, handleStopTrackingPreset]
  );

  const handleToggleMonthDone = useCallback(
    async (month: number) => {
      if (trackedPresetId == null || !inputsMatchTrackedPreset) return;

      const presetId = trackedPresetId;
      const previous = trackedCompletedMonthsRef.current;
      const has = previous.includes(month);
      const next = has
        ? previous.filter((m) => m !== month)
        : [...previous, month].sort((a, b) => a - b);

      trackedCompletedMonthsRef.current = next;
      setTrackedCompletedMonths(next);
      setProgressSavingMonth(month);
      try {
        const updated = await updateAnnuityCalculatorPresetProgress(presetId, next);
        trackedCompletedMonthsRef.current = updated.completedMonths;
        setTrackedCompletedMonths(updated.completedMonths);
      } catch (errorUnknown) {
        console.error(errorUnknown);
        trackedCompletedMonthsRef.current = previous;
        setTrackedCompletedMonths(previous);
      } finally {
        setProgressSavingMonth(null);
      }
    },
    [trackedPresetId, inputsMatchTrackedPreset]
  );

  const snapshot = useMemo(() => computeAnnuitySnapshot(inputs), [inputs]);
  const periodConfig = snapshot.periodConfig;
  const effectiveMonthlyInvestment = snapshot.effectiveMonthlyInvestment;
  const rows = snapshot.rows;
  const totals = snapshot.totals;

  const highlightedMonthsText = useMemo(() => {
    if (periodConfig.periodMonths === 3) return "3, 6, 9, 12...";
    return "12, 24, 36...";
  }, [periodConfig.periodMonths]);

  const baseCurrency = (userCurrency || "USD").trim();

  const chartData = useMemo(() => {
    const displayCurrency = (selectedCurrency || baseCurrency).trim();
    return rows.map((row) => {
      const interestBase = Math.max(0, row.totalInterestGained);
      const principalBase = Math.max(0, roundCurrency(row.finalBalance - interestBase));
      const monthDone = trackedCompletedMonths.includes(row.month);
      return {
        month: row.month,
        monthDone,
        principal: roundCurrency(
          convertForDisplaySync(principalBase, baseCurrency, displayCurrency)
        ),
        interest: roundCurrency(
          convertForDisplaySync(interestBase, baseCurrency, displayCurrency)
        ),
        finalBalance: roundCurrency(
          convertForDisplaySync(row.finalBalance, baseCurrency, displayCurrency)
        ),
      };
    });
  }, [rows, baseCurrency, selectedCurrency, trackedCompletedMonths]);

  const chartXTicks = useMemo(() => buildChartXTicks(rows), [rows]);

  const chartScrollWidth = useMemo(() => buildChartScrollWidth(rows.length), [rows.length]);

  const handleDownloadCsv = useCallback(() => {
    const csvContent = buildCsvFromCalculationRows(
      rows,
      inputs,
      periodConfig,
      selectedCurrency,
      baseCurrency
    );
    const blob = new Blob(["\uFEFF", csvContent], {
      type: "text/csv;charset=utf-8",
    });
    const link = document.createElement("a");
    const modeName = inputs.calculationType.replace(/-/g, "_");
    link.download = `${modeName}-schedule-${new Date().toISOString().split("T")[0]}.csv`;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, [rows, inputs, periodConfig, selectedCurrency, baseCurrency]);

  return (
    <div className={pageContainer}>
      <div className="flex flex-col items-start gap-4">
        <div>
          <h1 className={pageTitle}>Annuity & Fixed Deposit</h1>
          <p className={pageSubtitle}>
            Compare annuity and fixed deposit growth, including target future value planning.
          </p>
        </div>
        <div
          className="flex w-full max-w-full flex-wrap gap-1 rounded-lg border border-slate-200/90 bg-slate-50/80 p-1 sm:w-fit"
          role="group"
          aria-label="Annuity calculator mode"
        >
          <button
            type="button"
            onClick={() => setPageMode("single")}
            className={`rounded-md px-2.5 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
              pageMode === "single"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
            }`}
          >
            Calculator
          </button>
          <button
            type="button"
            onClick={() => setPageMode("compare")}
            className={`rounded-md px-2.5 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
              pageMode === "compare"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
            }`}
          >
            Compare two scenarios
          </button>
          <button
            type="button"
            onClick={() => setPageMode("premium-irr")}
            className={`rounded-md px-2.5 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
              pageMode === "premium-irr"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
            }`}
          >
            Premium → lump sum (IRR)
          </button>
        </div>
      </div>

      {pageMode === "compare" ? (
        <AnnuityCompareView
          baseCurrency={baseCurrency}
          selectedCurrency={selectedCurrency}
          onSelectedCurrencyChange={setSelectedCurrency}
        />
      ) : null}

      {pageMode === "premium-irr" ? (
        <PremiumIrrCalculator baseCurrency={baseCurrency} selectedCurrency={selectedCurrency} />
      ) : null}

      {pageMode === "single" ? (
      <>
      {/* lg: saved panel height matches calculator via absolute positioning (in-flow height = calculator only). */}
      <div className="relative w-full">
        <section className="mb-6 w-full min-w-0 rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden lg:mb-0 lg:w-[calc((100%-2rem)/3)]">
        <div className="px-4 py-4 sm:px-5 sm:py-5 border-b border-slate-100 bg-slate-50/60">
          <h2 className="text-lg font-semibold text-slate-900">Calculator Inputs</h2>
          <p className="mt-1 text-sm text-slate-600">
            Configure your investment type and compounding setup. Interest is applied at the end of each selected compounding period.
          </p>
        </div>
        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <CalculatorInputsFields
            inputs={inputs}
            onInputsChange={setInputs}
            inputClassName={standardInput}
            layout="stacked"
          />
        </div>
        </section>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden lg:absolute lg:inset-y-0 lg:left-[calc((100%-2rem)/3+2rem)] lg:right-0 lg:h-full">
          <SavedPresetsSection
            currentInputs={inputs}
            onLoadPreset={handleLoadPreset}
            onPresetDeleted={handlePresetDeleted}
          />
        </div>
      </div>

      <section className="mt-6 bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Balance over time</h2>
          <p className="mt-1 text-sm text-gray-600">
            Stacked bars: principal (initial + contributions) and cumulative interest. Total bar height is final balance for each month.
          </p>
        </div>
        <div className="px-4 py-4 sm:px-6 border-b border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AnnuitySummaryCard
              title={
                inputs.calculationType === "annuity-target-future-value"
                  ? "Required Monthly Investment"
                  : "Total Principal"
              }
              value={
                inputs.calculationType === "annuity-target-future-value"
                  ? formatAmountForDisplay(effectiveMonthlyInvestment, baseCurrency, selectedCurrency)
                  : formatAmountForDisplay(totals.principal, baseCurrency, selectedCurrency)
              }
              subtitle={
                inputs.calculationType === "annuity"
                  ? "Initial + monthly deposits"
                  : inputs.calculationType === "annuity-target-future-value"
                  ? `To target ${formatAmountForDisplay(inputs.targetFutureValue, baseCurrency, selectedCurrency)}`
                  : "Initial fixed deposit amount"
              }
            />
            <AnnuitySummaryCard
              title="Total Interest"
              value={formatAmountForDisplay(totals.totalInterest, baseCurrency, selectedCurrency)}
              subtitle={`After ${totals.totalMonths} months`}
            />
            <AnnuitySummaryCard
              title="Final Balance"
              value={formatAmountForDisplay(totals.finalBalance, baseCurrency, selectedCurrency)}
              subtitle={`At end of year ${inputs.years}`}
            />
            <AnnuitySummaryCard
              title="Interest Share"
              value={`${getInterestSharePercent(totals.finalBalance, totals.totalInterest).toFixed(2)}%`}
              subtitle="Interest as share of final balance"
            />
          </div>
        </div>
        <div className="px-4 py-4 sm:px-6 sm:pb-6">
          {rows.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-500">
              Adjust inputs to see the chart.
            </div>
          ) : (
            <div className="w-full overflow-x-auto pb-2">
              <div style={{ width: chartScrollWidth, minWidth: "100%" }} className="h-[min(420px,70vh)] min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 12, left: 4, bottom: 28 }}
                    barCategoryGap="10%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="month"
                      ticks={chartXTicks}
                      tick={{ fontSize: 10 }}
                      stroke="#6b7280"
                      label={{ value: "Month", position: "insideBottom", offset: -4, fill: "#6b7280", fontSize: 11 }}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      stroke="#6b7280"
                      width={56}
                      tickFormatter={(value) => formatChartAxisValue(value, selectedCurrency)}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0]?.payload as {
                          month: number;
                          principal: number;
                          interest: number;
                          finalBalance: number;
                        };
                        return (
                          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
                            <p className="font-semibold text-gray-900">Month {data.month}</p>
                            <p className="mt-1 text-gray-700">
                              Final balance:{" "}
                              <span className="font-medium tabular-nums">
                                {formatCurrency(data.finalBalance, selectedCurrency)}
                              </span>
                            </p>
                            <p className="text-indigo-700">
                              Investment (principal):{" "}
                              <span className="font-medium tabular-nums">
                                {formatCurrency(data.principal, selectedCurrency)}
                              </span>
                            </p>
                            <p className="text-emerald-700">
                              Interest accrued:{" "}
                              <span className="font-medium tabular-nums">
                                {formatCurrency(data.interest, selectedCurrency)}
                              </span>
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                    <Bar
                      dataKey="principal"
                      stackId="balance"
                      fill="#6366f1"
                      name="Investment (principal)"
                      radius={[0, 0, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`principal-${entry.month}-${index}`}
                          stroke={entry.monthDone ? "#ea580c" : undefined}
                          strokeWidth={entry.monthDone ? 2 : 0}
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="interest"
                      stackId="balance"
                      fill="#059669"
                      name="Interest accrued"
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`interest-${entry.month}-${index}`}
                          stroke={entry.monthDone ? "#ea580c" : undefined}
                          strokeWidth={entry.monthDone ? 2 : 0}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Month-by-Month Detailed Table</h2>
              <p className="mt-1 text-sm text-gray-600">
                Full monthly breakdown with growth, {periodConfig.periodLabelLowercase} interest events, and running balance.
                Rows at month {highlightedMonthsText} are marked with top and bottom separators.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
              <select
                value={selectedCurrency}
                onChange={(event) => setSelectedCurrency(event.target.value)}
                className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                aria-label="Display currency"
              >
                {SUPPORTED_CURRENCIES.map((currencyOption) => (
                  <option key={currencyOption} value={currencyOption}>
                    {currencyOption}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <Download className="h-4 w-4 shrink-0" aria-hidden />
                Download CSV
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Calculator figures are denominated in {baseCurrency}. Choosing another currency converts amounts using the
            same rates as elsewhere in the app (see currency settings).
          </p>
        </div>
        <table className="min-w-full divide-y divide-gray-200 table-auto">
          <thead className="bg-gray-50">
            <tr>
              {showMonthProgressColumn ? (
                <th
                  className="w-14 px-2 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500"
                  scope="col"
                >
                  Done
                </th>
              ) : null}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Month</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Year</th>
                {inputs.calculationType !== "fixed-deposit" ? (
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Investment Amount
                </th>
                ) : null}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Interest Base
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {periodConfig.interestColumnLabel}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Interest Accrued
              </th>
                {inputs.calculationType !== "fixed-deposit" ? (
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Total Investment
                </th>
                ) : null}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Final Balance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white text-sm">
              {rows.map((row) => {
                const isCompoundingMonth = row.month % periodConfig.periodMonths === 0;
                const isDone = trackedCompletedMonths.includes(row.month);
                return (
                <tr
                  key={row.month}
                  className={`transition-colors ${
                    isCompoundingMonth
                      ? "bg-indigo-50/70 border-y-2 border-indigo-300"
                      : row.month % 2 === 0
                      ? "bg-gray-50/60"
                      : "bg-white"
                  }`}
                >
                  {showMonthProgressColumn ? (
                    <td className="px-2 py-3 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={isDone}
                        disabled={progressSavingMonth === row.month}
                        onChange={() => void handleToggleMonthDone(row.month)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        aria-label={`Mark month ${row.month} as done`}
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-gray-900 tabular-nums">{row.month}</td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums">{row.year}</td>
                  {inputs.calculationType !== "fixed-deposit" ? (
                    <td className="px-4 py-3 text-gray-800 tabular-nums">
                      {formatAmountForDisplay(row.investmentAmount, baseCurrency, selectedCurrency)}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-gray-800 tabular-nums">
                    {formatAmountForDisplay(row.interestCalculationBase, baseCurrency, selectedCurrency)}
                  </td>
                  <td
                    className={`px-4 py-3 tabular-nums ${
                      row.interestGainedPeriod > 0 ? "text-emerald-700 font-medium" : "text-gray-500"
                    }`}
                  >
                    {formatAmountForDisplay(row.interestGainedPeriod, baseCurrency, selectedCurrency)}
                  </td>
                  <td
                    className={`px-4 py-3 tabular-nums ${
                      row.totalInterestGained > 0 ? "text-emerald-700 font-medium" : "text-gray-500"
                    }`}
                  >
                    {formatAmountForDisplay(row.totalInterestGained, baseCurrency, selectedCurrency)}
                  </td>
                  {inputs.calculationType !== "fixed-deposit" ? (
                    <td className="px-4 py-3 text-gray-800 tabular-nums">
                      {formatAmountForDisplay(row.accumulatedInvestment, baseCurrency, selectedCurrency)}
                    </td>
                  ) : null}
                  <td
                    className={`px-4 py-3 tabular-nums ${
                      isCompoundingMonth ? "font-semibold text-gray-900" : "text-gray-700"
                    }`}
                  >
                    {formatAmountForDisplay(row.finalBalance, baseCurrency, selectedCurrency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      </>
      ) : null}
    </div>
  );
}
