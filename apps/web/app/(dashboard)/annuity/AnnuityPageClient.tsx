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
  UI_STYLES,
} from "../../config/colorConfig";
import { CalculatorInputsFields } from "./components/CalculatorInputsFields";
import { SavedPresetsSection } from "./components/SavedPresetsSection";
import { clampYears } from "./calculator-input-utils";
import {
  updateAnnuityCalculatorPresetProgress,
  type AnnuityCalculatorPresetDTO,
} from "./actions/annuity-calculator-presets";
import type { CalculatorInputs, CompoundingFrequency } from "./types";
import { DEFAULT_ANNUITY_INPUTS, normalizeAnnuityInputs } from "./types";

interface MonthlyAnnuityRow {
  month: number;
  year: number;
  investmentAmount: number;
  interestCalculationBase: number;
  interestGainedPeriod: number;
  totalInterestGained: number;
  accumulatedInvestment: number;
  finalBalance: number;
}

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

export default function AnnuityPageClient() {
  const { currency: userCurrency } = useCurrency();
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

  const effectiveCompoundingFrequency: CompoundingFrequency = inputs.compoundingFrequency;

  const periodConfig = useMemo(() => {
    return getCompoundingConfig(effectiveCompoundingFrequency);
  }, [effectiveCompoundingFrequency]);

  const effectiveMonthlyInvestment = useMemo(() => {
    return getEffectiveMonthlyInvestment(inputs, periodConfig);
  }, [inputs, periodConfig]);

  const rows = useMemo(() => {
    return calculateMonthlyAnnuityRows(inputs, periodConfig, effectiveMonthlyInvestment);
  }, [inputs, periodConfig, effectiveMonthlyInvestment]);

  const totals = useMemo(() => {
    const lastRow = rows[rows.length - 1];
    const yearsClamped = clampYears(inputs.years);
    const totalMonths = yearsClamped * 12;
    const totalInvestedByContributions =
      inputs.calculationType === "fixed-deposit"
        ? 0
        : effectiveMonthlyInvestment * totalMonths;
    const principal = Math.max(0, inputs.initialBalance) + totalInvestedByContributions;
    const finalBalance = lastRow?.finalBalance ?? Math.max(0, inputs.initialBalance);
    const totalInterest = lastRow?.totalInterestGained ?? 0;
    return {
      principal,
      finalBalance,
      totalInterest,
      totalMonths,
    };
  }, [rows, inputs, effectiveMonthlyInvestment]);

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

  const chartXTicks = useMemo(() => {
    const monthCount = rows.length;
    if (monthCount === 0) return [];
    if (monthCount <= 24) return rows.map((row) => row.month);
    const ticks: number[] = [1];
    for (let monthNumber = 12; monthNumber < monthCount; monthNumber += 12) {
      ticks.push(monthNumber);
    }
    if (ticks[ticks.length - 1] !== monthCount) ticks.push(monthCount);
    return ticks;
  }, [rows]);

  const chartScrollWidth = useMemo(() => {
    return Math.max(800, rows.length * 5);
  }, [rows.length]);

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
      <div className={UI_STYLES.header.container}>
        <div>
          <h1 className={pageTitle}>Annuity & Fixed Deposit</h1>
          <p className={pageSubtitle}>
            Compare annuity and fixed deposit growth, including target future value planning.
          </p>
        </div>
      </div>

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
            <SummaryCard
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
            <SummaryCard
              title="Total Interest"
              value={formatAmountForDisplay(totals.totalInterest, baseCurrency, selectedCurrency)}
              subtitle={`After ${totals.totalMonths} months`}
            />
            <SummaryCard
              title="Final Balance"
              value={formatAmountForDisplay(totals.finalBalance, baseCurrency, selectedCurrency)}
              subtitle={`At end of year ${inputs.years}`}
            />
            <SummaryCard
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
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
}

function SummaryCard({ title, value, subtitle }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-100 px-5 py-4">
      <div className="flex h-full flex-col">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="mt-2 text-2xl font-semibold text-gray-900 tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function calculateMonthlyAnnuityRows(
  inputs: CalculatorInputs,
  periodConfig: CompoundingConfig,
  effectiveMonthlyInvestment: number
): MonthlyAnnuityRow[] {
  const monthlyInvestment =
    inputs.calculationType === "fixed-deposit" ? 0 : Math.max(0, effectiveMonthlyInvestment);
  const annualInterestRate = Math.max(0, inputs.annualInterestRatePercent) / 100;
  const years = clampYears(inputs.years);
  const totalMonths = years * 12;
  const periodInterestRate = annualInterestRate / periodConfig.periodsPerYear;

  let currentBalance = Math.max(0, inputs.initialBalance);
  let totalInterest = 0;
  const results: MonthlyAnnuityRow[] = [];

  for (let month = 1; month <= totalMonths; month += 1) {
    if (inputs.calculationType !== "fixed-deposit") currentBalance += monthlyInvestment;

    const interestCalculationBase =
      inputs.calculationType === "fixed-deposit" &&
      inputs.fixedDepositInterestMode === "not-added-to-principal"
        ? Math.max(0, inputs.initialBalance)
        : currentBalance;
    let interestForPeriod = 0;

    if (month % periodConfig.periodMonths === 0) {
      interestForPeriod = interestCalculationBase * periodInterestRate;
      totalInterest += interestForPeriod;
      if (
        inputs.calculationType === "fixed-deposit" &&
        inputs.fixedDepositInterestMode === "not-added-to-principal"
      ) {
        currentBalance = Math.max(0, inputs.initialBalance) + totalInterest;
      } else {
        currentBalance += interestForPeriod;
      }
    }

    results.push({
      month,
      year: Math.ceil(month / 12),
      investmentAmount: roundCurrency(monthlyInvestment),
      interestCalculationBase: roundCurrency(interestCalculationBase),
      interestGainedPeriod: roundCurrency(interestForPeriod),
      totalInterestGained: roundCurrency(totalInterest),
      accumulatedInvestment:
        inputs.calculationType !== "fixed-deposit"
          ? roundCurrency(monthlyInvestment * month)
          : roundCurrency(Math.max(0, inputs.initialBalance)),
      finalBalance: roundCurrency(currentBalance),
    });
  }

  return results;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatChartAxisValue(value: number, currency: string): string {
  const absoluteValue = Math.abs(value);
  if (absoluteValue >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absoluteValue >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatCurrency(value, currency);
}

function getInterestSharePercent(finalBalance: number, totalInterest: number): number {
  if (finalBalance <= 0) return 0;
  return (totalInterest / finalBalance) * 100;
}

function getEffectiveMonthlyInvestment(
  inputs: CalculatorInputs,
  periodConfig: CompoundingConfig
): number {
  if (inputs.calculationType === "annuity") return Math.max(0, inputs.monthlyInvestment);
  if (inputs.calculationType === "fixed-deposit") return 0;

  const annualRate = Math.max(0, inputs.annualInterestRatePercent) / 100;
  const years = clampYears(inputs.years);
  const periods = years * periodConfig.periodsPerYear;
  const periodicRate = annualRate / periodConfig.periodsPerYear;
  const initialBalance = Math.max(0, inputs.initialBalance);
  const targetFutureValue = Math.max(0, inputs.targetFutureValue);

  if (periods <= 0) return 0;

  const futureValueFromInitial =
    periodicRate === 0
      ? initialBalance
      : initialBalance * Math.pow(1 + periodicRate, periods);
  const remainingFutureValue = Math.max(0, targetFutureValue - futureValueFromInitial);

  if (remainingFutureValue <= 0) return 0;

  const requiredPerPeriod =
    periodicRate === 0
      ? remainingFutureValue / periods
      : (remainingFutureValue * periodicRate) / (Math.pow(1 + periodicRate, periods) - 1);

  return roundCurrency(requiredPerPeriod / periodConfig.periodMonths);
}

interface CompoundingConfig {
  periodMonths: number;
  periodsPerYear: number;
  periodLabelLowercase: string;
  interestColumnLabel: string;
}

function getCompoundingConfig(frequency: CompoundingFrequency): CompoundingConfig {
  if (frequency === "quarterly") {
    return {
      periodMonths: 3,
      periodsPerYear: 4,
      periodLabelLowercase: "quarterly",
      interestColumnLabel: "Interest Gained (Quarterly)",
    };
  }

  return {
    periodMonths: 12,
    periodsPerYear: 1,
    periodLabelLowercase: "annual",
    interestColumnLabel: "Interest Gained (Annual)",
  };
}

function csvQuoteCell(value: string | number | undefined | null): string {
  const normalizedValue = String(value ?? "");
  return `"${normalizedValue.replace(/"/g, '""')}"`;
}

function formatAmountCsvPlain(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

function buildCsvFromCalculationRows(
  rows: MonthlyAnnuityRow[],
  inputs: CalculatorInputs,
  periodConfig: CompoundingConfig,
  displayCurrency: string,
  baseCurrency: string
): string {
  const convert = (amount: number) =>
    convertForDisplaySync(amount, baseCurrency, displayCurrency);

  const headers = [
    "Month",
    "Year",
    ...(inputs.calculationType !== "fixed-deposit" ? ["Investment Amount"] : []),
    "Interest Base",
    periodConfig.interestColumnLabel,
    "Interest Accrued",
    ...(inputs.calculationType !== "fixed-deposit" ? ["Total Investment"] : []),
    "Final Balance",
    "Currency",
  ];

  const lines: string[][] = [headers];

  rows.forEach((row) => {
    lines.push([
      String(row.month),
      String(row.year),
      ...(inputs.calculationType !== "fixed-deposit"
        ? [formatAmountCsvPlain(convert(row.investmentAmount))]
        : []),
      formatAmountCsvPlain(convert(row.interestCalculationBase)),
      formatAmountCsvPlain(convert(row.interestGainedPeriod)),
      formatAmountCsvPlain(convert(row.totalInterestGained)),
      ...(inputs.calculationType !== "fixed-deposit"
        ? [formatAmountCsvPlain(convert(row.accumulatedInvestment))]
        : []),
      formatAmountCsvPlain(convert(row.finalBalance)),
      displayCurrency.toUpperCase(),
    ]);
  });

  return lines
    .map((line) => line.map((cell) => csvQuoteCell(cell)).join(","))
    .join("\r\n");
}
