"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "../../../utils/currency";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { SUPPORTED_CURRENCIES } from "../../../utils/currencyConversion";
import { INPUT_COLORS } from "../../../config/colorConfig";
import {
  buildChartScrollWidth,
  buildChartXTicks,
  buildCsvFromCalculationRows,
  buildStackedBarChartData,
  computeAnnuitySnapshot,
  formatChartAxisValue,
  getInterestSharePercent,
  type AnnuitySnapshot,
} from "../annuity-math";
import { clampYears } from "../calculator-input-utils";
import { CalculatorInputsFields } from "./CalculatorInputsFields";
import { AnnuitySummaryCard } from "./AnnuitySummaryCard";
import type { CalculatorInputs } from "../types";
import { DEFAULT_ANNUITY_INPUTS, normalizeAnnuityInputs } from "../types";
import {
  listAnnuityCalculatorPresets,
  type AnnuityCalculatorPresetDTO,
} from "../actions/annuity-calculator-presets";

const standardInput = INPUT_COLORS.standard;

interface AnnuityCompareViewProps {
  baseCurrency: string;
  selectedCurrency: string;
  onSelectedCurrencyChange: (code: string) => void;
}

function formatAmountForDisplay(
  amount: number,
  baseCurrencyCode: string,
  displayCurrencyCode: string
): string {
  const converted = convertForDisplaySync(amount, baseCurrencyCode, displayCurrencyCode);
  return formatCurrency(converted, displayCurrencyCode);
}

type WinnerSide = "a" | "b" | "tie";

function pickHigherWinner(a: number, b: number): WinnerSide {
  if (Math.abs(a - b) < 0.005) return "tie";
  return a > b ? "a" : "b";
}

function winnerLabel(side: WinnerSide, labelA: string, labelB: string): string {
  if (side === "tie") return "Tie";
  return side === "a" ? labelA : labelB;
}

const MONEY_GAP_EPS = 0.005;

interface MoneyGapDetail {
  tie: boolean;
  leaderLabel?: string;
  otherLabel?: string;
  amountFormatted?: string;
  /** (higher − lower) / lower × 100 when the lower value is positive */
  pctVsLower?: number | null;
}

function computeMoneyGapDetail(
  labelA: string,
  labelB: string,
  valueA: number,
  valueB: number,
  baseCurrency: string,
  displayCurrency: string
): MoneyGapDetail {
  if (Math.abs(valueA - valueB) < MONEY_GAP_EPS) return { tie: true };
  const aHigher = valueA > valueB;
  const high = aHigher ? valueA : valueB;
  const low = aHigher ? valueB : valueA;
  const diff = high - low;
  const amountFormatted = formatAmountForDisplay(diff, baseCurrency, displayCurrency);
  const pctVsLower = low > MONEY_GAP_EPS ? (diff / low) * 100 : null;
  return {
    tie: false,
    leaderLabel: aHigher ? labelA : labelB,
    otherLabel: aHigher ? labelB : labelA,
    amountFormatted,
    pctVsLower,
  };
}

interface RoiGapDetail {
  tie: boolean;
  leaderLabel?: string;
  otherLabel?: string;
  pp?: number;
  roiA: number;
  roiB: number;
}

function computeRoiGapDetail(labelA: string, labelB: string, roiA: number, roiB: number): RoiGapDetail {
  if (Math.abs(roiA - roiB) < MONEY_GAP_EPS) {
    return { tie: true, roiA, roiB };
  }
  const aHigher = roiA > roiB;
  return {
    tie: false,
    leaderLabel: aHigher ? labelA : labelB,
    otherLabel: aHigher ? labelB : labelA,
    pp: Math.abs(roiA - roiB),
    roiA,
    roiB,
  };
}

interface ScenarioGapsSummaryCardProps {
  balanceGap: MoneyGapDetail;
  interestGap: MoneyGapDetail;
  roiGap: RoiGapDetail;
}

/** "+{amount} [{pct}%] more" or "+{amount} more" when % unavailable */
function formatAmountBracketPctMoreLine(gap: MoneyGapDetail): string {
  if (gap.tie || !gap.amountFormatted) return "—";
  const base = `+${gap.amountFormatted}`;
  if (gap.pctVsLower != null) return `${base} [${gap.pctVsLower.toFixed(2)}%] more`;
  return `${base} more`;
}

/** "+{pp} pp [{pct}%] more" — pct is lift of the higher ROI vs the lower */
function formatRoiBracketPctMoreLine(roiGap: RoiGapDetail): string {
  if (roiGap.tie) return "—";
  const low = Math.min(roiGap.roiA, roiGap.roiB);
  const high = Math.max(roiGap.roiA, roiGap.roiB);
  const diff = high - low;
  const pp = roiGap.pp ?? diff;
  const base = `+${pp.toFixed(2)} pp`;
  if (low > MONEY_GAP_EPS) return `${base} [${((diff / low) * 100).toFixed(2)}%] more`;
  return `${base} more`;
}

function ScenarioGapsSummaryCard({ balanceGap, interestGap, roiGap }: ScenarioGapsSummaryCardProps) {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-100 px-5 py-4">
      <h3 className="text-sm font-medium text-gray-500">Lead vs other scenario</h3>
      <dl className="mt-3 space-y-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Final balance</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-gray-900">
            {formatAmountBracketPctMoreLine(balanceGap)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Total interest</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-gray-900">
            {formatAmountBracketPctMoreLine(interestGap)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">ROI on principal</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-gray-900">
            {formatRoiBracketPctMoreLine(roiGap)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

interface LoadSavedPresetSelectProps {
  id: string;
  presets: AnnuityCalculatorPresetDTO[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  isReloading: boolean;
  onSelectPreset: (preset: AnnuityCalculatorPresetDTO) => void;
}

function LoadSavedPresetSelect({
  id,
  presets,
  loading,
  error,
  onReload,
  isReloading,
  onSelectPreset,
}: LoadSavedPresetSelectProps) {
  const [value, setValue] = useState("");

  const placeholder = loading
    ? "Loading saved scenarios…"
    : error
      ? "Could not load list"
      : presets.length === 0
        ? "No saved scenarios yet"
        : "Choose a saved scenario…";

  return (
    <div className="mt-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-slate-600">
          Load saved scenario
        </label>
        <button
          type="button"
          onClick={() => onReload()}
          disabled={loading || isReloading}
          className="inline-flex items-center gap-1 rounded-md p-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
          title="Refresh list (e.g. after saving in Calculator mode)"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isReloading ? "animate-spin" : ""}`} aria-hidden />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
      <select
        id={id}
        value={value}
        disabled={loading || !!error || presets.length === 0}
        onChange={(e) => {
          const next = e.target.value;
          setValue("");
          if (!next) return;
          const preset = presets.find((p) => String(p.id) === next);
          if (preset) onSelectPreset(preset);
        }}
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-500"
      >
        <option value="">{placeholder}</option>
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {!error && !loading && presets.length === 0 ? (
        <p className="text-xs text-slate-500">Save a scenario from the Calculator tab to load it here.</p>
      ) : null}
    </div>
  );
}

function ComparisonMetricRow({
  label,
  valueA,
  valueB,
  winner,
  labelA,
  labelB,
}: {
  label: string;
  valueA: string;
  valueB: string;
  winner: WinnerSide;
  labelA: string;
  labelB: string;
}) {
  const winText = winnerLabel(winner, labelA, labelB);
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 pr-4 text-sm font-medium text-gray-700">{label}</td>
      <td
        className={`py-3 px-2 text-sm tabular-nums ${
          winner === "a" ? "rounded-md bg-emerald-50 font-semibold text-emerald-900" : "text-gray-900"
        }`}
      >
        {valueA}
      </td>
      <td
        className={`py-3 px-2 text-sm tabular-nums ${
          winner === "b" ? "rounded-md bg-emerald-50 font-semibold text-emerald-900" : "text-gray-900"
        }`}
      >
        {valueB}
      </td>
      <td className="py-3 pl-2 text-right text-xs text-gray-600">{winText}</td>
    </tr>
  );
}

function ScenarioChartBlock({
  title,
  snapshot,
  inputs,
  chartData,
  chartXTicks,
  chartScrollWidth,
  selectedCurrency,
  yAxisMax,
}: {
  title: string;
  snapshot: AnnuitySnapshot;
  inputs: CalculatorInputs;
  chartData: ReturnType<typeof buildStackedBarChartData>;
  chartXTicks: number[];
  chartScrollWidth: number;
  selectedCurrency: string;
  /** Shared max so side-by-side charts use the same vertical scale */
  yAxisMax: number;
}) {
  const rows = snapshot.rows;
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <div className="mt-4 flex h-48 items-center justify-center text-sm text-gray-500">
          Adjust inputs to see the chart.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-0.5 text-xs text-gray-500">
        {inputs.years} yr · {snapshot.periodConfig.periodLabelLowercase} compounding
      </p>
      <div className="mt-3 w-full overflow-x-auto pb-2">
        <div
          style={{ width: chartScrollWidth, minWidth: "100%" }}
          className="h-[min(360px,60vh)] min-h-[240px]"
        >
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
                label={{
                  value: "Month",
                  position: "insideBottom",
                  offset: -4,
                  fill: "#6b7280",
                  fontSize: 11,
                }}
              />
              <YAxis
                domain={[0, yAxisMax]}
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
              />
              <Bar
                dataKey="interest"
                stackId="balance"
                fill="#059669"
                name="Interest accrued"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function ScenarioTableBlock({
  title,
  snapshot,
  inputs,
  baseCurrency,
  selectedCurrency,
  highlightedMonthsText,
  onDownloadCsv,
}: {
  title: string;
  snapshot: AnnuitySnapshot;
  inputs: CalculatorInputs;
  baseCurrency: string;
  selectedCurrency: string;
  highlightedMonthsText: string;
  onDownloadCsv: () => void;
}) {
  const { rows, periodConfig } = snapshot;
  return (
    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Month-by-month · {highlightedMonthsText} = compounding rows
            </p>
          </div>
          <button
            type="button"
            onClick={onDownloadCsv}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden />
            CSV
          </button>
        </div>
      </div>
      <div className="max-h-[min(520px,70vh)] overflow-auto">
        <table className="min-w-full divide-y divide-gray-200 table-auto">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Month
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Year
              </th>
              {inputs.calculationType !== "fixed-deposit" ? (
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Investment
                </th>
              ) : null}
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Interest base
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {periodConfig.interestColumnLabel}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Interest accrued
              </th>
              {inputs.calculationType !== "fixed-deposit" ? (
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Total investment
                </th>
              ) : null}
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Final balance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white text-xs sm:text-sm">
            {rows.map((row) => {
              const isCompoundingMonth = row.month % periodConfig.periodMonths === 0;
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
                  <td className="px-3 py-2 text-gray-900 tabular-nums">{row.month}</td>
                  <td className="px-3 py-2 text-gray-700 tabular-nums">{row.year}</td>
                  {inputs.calculationType !== "fixed-deposit" ? (
                    <td className="px-3 py-2 text-gray-800 tabular-nums">
                      {formatAmountForDisplay(row.investmentAmount, baseCurrency, selectedCurrency)}
                    </td>
                  ) : null}
                  <td className="px-3 py-2 text-gray-800 tabular-nums">
                    {formatAmountForDisplay(row.interestCalculationBase, baseCurrency, selectedCurrency)}
                  </td>
                  <td
                    className={`px-3 py-2 tabular-nums ${
                      row.interestGainedPeriod > 0 ? "font-medium text-emerald-700" : "text-gray-500"
                    }`}
                  >
                    {formatAmountForDisplay(row.interestGainedPeriod, baseCurrency, selectedCurrency)}
                  </td>
                  <td
                    className={`px-3 py-2 tabular-nums ${
                      row.totalInterestGained > 0 ? "font-medium text-emerald-700" : "text-gray-500"
                    }`}
                  >
                    {formatAmountForDisplay(row.totalInterestGained, baseCurrency, selectedCurrency)}
                  </td>
                  {inputs.calculationType !== "fixed-deposit" ? (
                    <td className="px-3 py-2 text-gray-800 tabular-nums">
                      {formatAmountForDisplay(row.accumulatedInvestment, baseCurrency, selectedCurrency)}
                    </td>
                  ) : null}
                  <td
                    className={`px-3 py-2 tabular-nums ${
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
      </div>
    </div>
  );
}

export function AnnuityCompareView({
  baseCurrency,
  selectedCurrency,
  onSelectedCurrencyChange,
}: AnnuityCompareViewProps) {
  const [inputsA, setInputsA] = useState<CalculatorInputs>(() => ({
    ...DEFAULT_ANNUITY_INPUTS,
  }));
  const [inputsB, setInputsB] = useState<CalculatorInputs>(() => ({
    ...DEFAULT_ANNUITY_INPUTS,
  }));
  const [labelA, setLabelA] = useState("Scenario A");
  const [labelB, setLabelB] = useState("Scenario B");

  const [savedPresets, setSavedPresets] = useState<AnnuityCalculatorPresetDTO[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [presetsReloading, setPresetsReloading] = useState(false);
  const [presetsError, setPresetsError] = useState<string | null>(null);

  const loadSavedPresets = useCallback(async (isManualRefresh: boolean) => {
    if (isManualRefresh) setPresetsReloading(true);
    else setPresetsLoading(true);
    setPresetsError(null);
    try {
      const list = await listAnnuityCalculatorPresets();
      setSavedPresets(list);
    } catch (errorUnknown) {
      console.error(errorUnknown);
      setPresetsError("Could not load saved scenarios.");
    } finally {
      setPresetsLoading(false);
      setPresetsReloading(false);
    }
  }, []);

  useEffect(() => {
    void loadSavedPresets(false);
  }, [loadSavedPresets]);

  const handleLoadSavedIntoA = useCallback((preset: AnnuityCalculatorPresetDTO) => {
    setInputsA(normalizeAnnuityInputs(preset.inputs));
    setLabelA(preset.title);
  }, []);

  const handleLoadSavedIntoB = useCallback((preset: AnnuityCalculatorPresetDTO) => {
    setInputsB(normalizeAnnuityInputs(preset.inputs));
    setLabelB(preset.title);
  }, []);

  const snapshotA = useMemo(() => computeAnnuitySnapshot(inputsA), [inputsA]);
  const snapshotB = useMemo(() => computeAnnuitySnapshot(inputsB), [inputsB]);

  const displayCurrency = (selectedCurrency || baseCurrency).trim();

  const chartDataA = useMemo(
    () => buildStackedBarChartData(snapshotA.rows, baseCurrency, displayCurrency),
    [snapshotA.rows, baseCurrency, displayCurrency]
  );
  const chartDataB = useMemo(
    () => buildStackedBarChartData(snapshotB.rows, baseCurrency, displayCurrency),
    [snapshotB.rows, baseCurrency, displayCurrency]
  );

  const sharedChartYMax = useMemo(() => {
    const maxInSeries = (data: typeof chartDataA) =>
      data.length === 0 ? 0 : Math.max(...data.map((d) => d.finalBalance));
    const m = Math.max(maxInSeries(chartDataA), maxInSeries(chartDataB));
    return m > 0 ? m : 1;
  }, [chartDataA, chartDataB]);

  const chartXTicksA = useMemo(() => buildChartXTicks(snapshotA.rows), [snapshotA.rows]);
  const chartXTicksB = useMemo(() => buildChartXTicks(snapshotB.rows), [snapshotB.rows]);
  const chartScrollWidthA = useMemo(
    () => buildChartScrollWidth(snapshotA.rows.length),
    [snapshotA.rows.length]
  );
  const chartScrollWidthB = useMemo(
    () => buildChartScrollWidth(snapshotB.rows.length),
    [snapshotB.rows.length]
  );

  const highlightedA = useMemo(() => {
    return snapshotA.periodConfig.periodMonths === 3 ? "3, 6, 9, 12…" : "12, 24, 36…";
  }, [snapshotA.periodConfig.periodMonths]);
  const highlightedB = useMemo(() => {
    return snapshotB.periodConfig.periodMonths === 3 ? "3, 6, 9, 12…" : "12, 24, 36…";
  }, [snapshotB.periodConfig.periodMonths]);

  const winners = useMemo(() => {
    const { totals: tA, roiPercent: roiA } = snapshotA;
    const { totals: tB, roiPercent: roiB } = snapshotB;
    return {
      finalBalance: pickHigherWinner(tA.finalBalance, tB.finalBalance),
      totalInterest: pickHigherWinner(tA.totalInterest, tB.totalInterest),
      roi: pickHigherWinner(roiA, roiB),
    };
  }, [snapshotA, snapshotB]);

  const overallWinner = useMemo((): WinnerSide => {
    const scores = { a: 0, b: 0 };
    (Object.keys(winners) as (keyof typeof winners)[]).forEach((key) => {
      const w = winners[key];
      if (w === "a") scores.a += 1;
      else if (w === "b") scores.b += 1;
    });
    if (scores.a === scores.b) {
      return pickHigherWinner(snapshotA.totals.finalBalance, snapshotB.totals.finalBalance);
    }
    return scores.a > scores.b ? "a" : "b";
  }, [winners, snapshotA.totals.finalBalance, snapshotB.totals.finalBalance]);

  const scenarioGaps = useMemo(
    () => ({
      balanceGap: computeMoneyGapDetail(
        labelA,
        labelB,
        snapshotA.totals.finalBalance,
        snapshotB.totals.finalBalance,
        baseCurrency,
        selectedCurrency
      ),
      interestGap: computeMoneyGapDetail(
        labelA,
        labelB,
        snapshotA.totals.totalInterest,
        snapshotB.totals.totalInterest,
        baseCurrency,
        selectedCurrency
      ),
      roiGap: computeRoiGapDetail(labelA, labelB, snapshotA.roiPercent, snapshotB.roiPercent),
    }),
    [
      labelA,
      labelB,
      snapshotA.totals.finalBalance,
      snapshotA.totals.totalInterest,
      snapshotA.roiPercent,
      snapshotB.totals.finalBalance,
      snapshotB.totals.totalInterest,
      snapshotB.roiPercent,
      baseCurrency,
      selectedCurrency,
    ]
  );

  const handleDownloadA = useCallback(() => {
    const csvContent = buildCsvFromCalculationRows(
      snapshotA.rows,
      inputsA,
      snapshotA.periodConfig,
      selectedCurrency,
      baseCurrency
    );
    const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.download = `annuity-compare-a-${new Date().toISOString().split("T")[0]}.csv`;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, [snapshotA, inputsA, selectedCurrency, baseCurrency]);

  const handleDownloadB = useCallback(() => {
    const csvContent = buildCsvFromCalculationRows(
      snapshotB.rows,
      inputsB,
      snapshotB.periodConfig,
      selectedCurrency,
      baseCurrency
    );
    const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.download = `annuity-compare-b-${new Date().toISOString().split("T")[0]}.csv`;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, [snapshotB, inputsB, selectedCurrency, baseCurrency]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200/90 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-700">
          Compare exactly two scenarios—configure them here or load saved scenarios.
          Metrics below use the same display currency as the rest of the app.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Display currency</span>
          <select
            value={selectedCurrency}
            onChange={(e) => onSelectedCurrencyChange(e.target.value)}
            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            aria-label="Display currency"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:px-5">
            <label className="block text-xs font-medium text-slate-600" htmlFor="compare-label-a">
              Name
            </label>
            <input
              id="compare-label-a"
              type="text"
              value={labelA}
              onChange={(e) => setLabelA(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
            />
            <LoadSavedPresetSelect
              id="compare-load-preset-a"
              presets={savedPresets}
              loading={presetsLoading}
              error={presetsError}
              onReload={() => void loadSavedPresets(true)}
              isReloading={presetsReloading}
              onSelectPreset={handleLoadSavedIntoA}
            />
          </div>
          <div className="px-4 py-4 sm:px-5 sm:py-5">
            <CalculatorInputsFields
              inputs={inputsA}
              onInputsChange={setInputsA}
              inputClassName={standardInput}
              layout="stacked"
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:px-5">
            <label className="block text-xs font-medium text-slate-600" htmlFor="compare-label-b">
              Name
            </label>
            <input
              id="compare-label-b"
              type="text"
              value={labelB}
              onChange={(e) => setLabelB(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
            />
            <LoadSavedPresetSelect
              id="compare-load-preset-b"
              presets={savedPresets}
              loading={presetsLoading}
              error={presetsError}
              onReload={() => void loadSavedPresets(true)}
              isReloading={presetsReloading}
              onSelectPreset={handleLoadSavedIntoB}
            />
          </div>
          <div className="px-4 py-4 sm:px-5 sm:py-5">
            <CalculatorInputsFields
              inputs={inputsB}
              onInputsChange={setInputsB}
              inputClassName={standardInput}
              layout="stacked"
            />
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">Comparison summary</h2>
          <p className="mt-1 text-sm text-gray-600">
            Higher final balance, total interest, and ROI % are highlighted. Overall pick uses wins on these metrics;
            ties break on final balance.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 sm:px-6">
          <AnnuitySummaryCard
            title={`${labelA} — final balance`}
            value={formatAmountForDisplay(
              snapshotA.totals.finalBalance,
              baseCurrency,
              selectedCurrency
            )}
            subtitle={`After ${snapshotA.totals.totalMonths} months`}
          />
          <AnnuitySummaryCard
            title={`${labelB} — final balance`}
            value={formatAmountForDisplay(
              snapshotB.totals.finalBalance,
              baseCurrency,
              selectedCurrency
            )}
            subtitle={`After ${snapshotB.totals.totalMonths} months`}
          />
          <AnnuitySummaryCard
            title="ROI on principal (%)"
            value={`A: ${snapshotA.roiPercent.toFixed(2)}% · B: ${snapshotB.roiPercent.toFixed(2)}%`}
            subtitle="(Final balance − principal) ÷ principal"
          />
          <ScenarioGapsSummaryCard
            balanceGap={scenarioGaps.balanceGap}
            interestGap={scenarioGaps.interestGap}
            roiGap={scenarioGaps.roiGap}
          />
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-5 py-4 shadow-sm">
            <h3 className="text-sm font-medium text-emerald-900">Stronger scenario (overall)</h3>
            <p className="mt-2 text-xl font-semibold text-emerald-950">
              {winnerLabel(overallWinner, labelA, labelB)}
            </p>
            <p className="mt-1 text-xs text-emerald-800">
              By final balance: {winnerLabel(winners.finalBalance, labelA, labelB)} · Interest:{" "}
              {winnerLabel(winners.totalInterest, labelA, labelB)} · ROI %:{" "}
              {winnerLabel(winners.roi, labelA, labelB)}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 px-4 pb-6 sm:px-6">
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 pr-4 text-left text-xs font-medium uppercase text-gray-500">
                    Metric
                  </th>
                  <th className="py-3 px-2 text-left text-xs font-medium uppercase text-gray-500">
                    {labelA}
                  </th>
                  <th className="py-3 px-2 text-left text-xs font-medium uppercase text-gray-500">
                    {labelB}
                  </th>
                  <th className="py-3 pl-2 text-right text-xs font-medium uppercase text-gray-500">
                    Higher
                  </th>
                </tr>
              </thead>
              <tbody>
                <ComparisonMetricRow
                  label="Principal / required flow"
                  valueA={
                    inputsA.calculationType === "annuity-target-future-value"
                      ? formatAmountForDisplay(
                          snapshotA.effectiveMonthlyInvestment,
                          baseCurrency,
                          selectedCurrency
                        ) + " / mo"
                      : formatAmountForDisplay(snapshotA.totals.principal, baseCurrency, selectedCurrency)
                  }
                  valueB={
                    inputsB.calculationType === "annuity-target-future-value"
                      ? formatAmountForDisplay(
                          snapshotB.effectiveMonthlyInvestment,
                          baseCurrency,
                          selectedCurrency
                        ) + " / mo"
                      : formatAmountForDisplay(snapshotB.totals.principal, baseCurrency, selectedCurrency)
                  }
                  winner="tie"
                  labelA={labelA}
                  labelB={labelB}
                />
                <ComparisonMetricRow
                  label="Total interest"
                  valueA={formatAmountForDisplay(
                    snapshotA.totals.totalInterest,
                    baseCurrency,
                    selectedCurrency
                  )}
                  valueB={formatAmountForDisplay(
                    snapshotB.totals.totalInterest,
                    baseCurrency,
                    selectedCurrency
                  )}
                  winner={winners.totalInterest}
                  labelA={labelA}
                  labelB={labelB}
                />
                <ComparisonMetricRow
                  label="Final balance"
                  valueA={formatAmountForDisplay(
                    snapshotA.totals.finalBalance,
                    baseCurrency,
                    selectedCurrency
                  )}
                  valueB={formatAmountForDisplay(
                    snapshotB.totals.finalBalance,
                    baseCurrency,
                    selectedCurrency
                  )}
                  winner={winners.finalBalance}
                  labelA={labelA}
                  labelB={labelB}
                />
                <ComparisonMetricRow
                  label="ROI %"
                  valueA={`${snapshotA.roiPercent.toFixed(2)}%`}
                  valueB={`${snapshotB.roiPercent.toFixed(2)}%`}
                  winner={winners.roi}
                  labelA={labelA}
                  labelB={labelB}
                />
                <ComparisonMetricRow
                  label="Interest share of final balance"
                  valueA={`${getInterestSharePercent(
                    snapshotA.totals.finalBalance,
                    snapshotA.totals.totalInterest
                  ).toFixed(2)}%`}
                  valueB={`${getInterestSharePercent(
                    snapshotB.totals.finalBalance,
                    snapshotB.totals.totalInterest
                  ).toFixed(2)}%`}
                  winner={pickHigherWinner(
                    getInterestSharePercent(
                      snapshotA.totals.finalBalance,
                      snapshotA.totals.totalInterest
                    ),
                    getInterestSharePercent(
                      snapshotB.totals.finalBalance,
                      snapshotB.totals.totalInterest
                    )
                  )}
                  labelA={labelA}
                  labelB={labelB}
                />
                <ComparisonMetricRow
                  label="Horizon (months)"
                  valueA={String(clampYears(inputsA.years) * 12)}
                  valueB={String(clampYears(inputsB.years) * 12)}
                  winner="tie"
                  labelA={labelA}
                  labelB={labelB}
                />
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Figures are denominated in {baseCurrency}. Other currencies convert using your app rates.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Balance over time</h2>
        <p className="mt-1 text-sm text-gray-600">
          Stacked bars: principal (initial + contributions) and cumulative interest for each scenario.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ScenarioChartBlock
            title={labelA}
            snapshot={snapshotA}
            inputs={inputsA}
            chartData={chartDataA}
            chartXTicks={chartXTicksA}
            chartScrollWidth={chartScrollWidthA}
            selectedCurrency={selectedCurrency}
            yAxisMax={sharedChartYMax}
          />
          <ScenarioChartBlock
            title={labelB}
            snapshot={snapshotB}
            inputs={inputsB}
            chartData={chartDataB}
            chartXTicks={chartXTicksB}
            chartScrollWidth={chartScrollWidthB}
            selectedCurrency={selectedCurrency}
            yAxisMax={sharedChartYMax}
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Month-by-month calculations</h2>
        <p className="mt-1 text-sm text-gray-600">
          Full schedules for both scenarios. Download CSV per side.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ScenarioTableBlock
            title={labelA}
            snapshot={snapshotA}
            inputs={inputsA}
            baseCurrency={baseCurrency}
            selectedCurrency={selectedCurrency}
            highlightedMonthsText={highlightedA}
            onDownloadCsv={handleDownloadA}
          />
          <ScenarioTableBlock
            title={labelB}
            snapshot={snapshotB}
            inputs={inputsB}
            baseCurrency={baseCurrency}
            selectedCurrency={selectedCurrency}
            highlightedMonthsText={highlightedB}
            onDownloadCsv={handleDownloadB}
          />
        </div>
      </section>
    </div>
  );
}
