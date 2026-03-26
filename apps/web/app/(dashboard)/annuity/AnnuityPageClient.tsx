"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
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

type CompoundingFrequency = "annual" | "quarterly";
type CalculationType = "annuity" | "annuity-target-future-value" | "fixed-deposit";
type FixedDepositInterestMode = "add-to-principal" | "not-added-to-principal";

interface CalculatorInputs {
  calculationType: CalculationType;
  initialBalance: number;
  monthlyInvestment: number;
  targetFutureValue: number;
  annualInterestRatePercent: number;
  years: number;
  compoundingFrequency: CompoundingFrequency;
  fixedDepositInterestMode: FixedDepositInterestMode;
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

const DEFAULT_INPUTS: CalculatorInputs = {
  calculationType: "annuity",
  initialBalance: 0,
  monthlyInvestment: 5000,
  targetFutureValue: 10000000,
  annualInterestRatePercent: 10,
  years: 15,
  compoundingFrequency: "annual",
  fixedDepositInterestMode: "add-to-principal",
};

export default function AnnuityPageClient() {
  const { currency: userCurrency } = useCurrency();
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS);
  const [selectedCurrency, setSelectedCurrency] = useState(userCurrency || "USD");

  useEffect(() => {
    setSelectedCurrency(userCurrency || "USD");
  }, [userCurrency]);

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
    const totalInvestedByContributions =
      inputs.calculationType === "fixed-deposit"
        ? 0
        : effectiveMonthlyInvestment * (inputs.years * 12);
    const principal = Math.max(0, inputs.initialBalance) + totalInvestedByContributions;
    const finalBalance = lastRow?.finalBalance ?? Math.max(0, inputs.initialBalance);
    const totalInterest = lastRow?.totalInterestGained ?? 0;
    return {
      principal,
      finalBalance,
      totalInterest,
      totalMonths: inputs.years * 12,
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
      return {
        month: row.month,
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
  }, [rows, baseCurrency, selectedCurrency]);

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

      <section className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Calculator Inputs</h2>
          <p className="mt-1 text-sm text-gray-600">
            Configure your investment type and compounding setup. Interest is applied at the end of each selected compounding period.
          </p>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div>
            <InfoLabel
              label="Calculation Type"
              description="Choose the calculator mode: standard annuity, target annuity (find required monthly contribution), or fixed deposit."
            />
            <select
              value={inputs.calculationType}
              onChange={(event) =>
                setInputs((previous) => ({
                  ...previous,
                  calculationType: event.target.value as CalculationType,
                }))
              }
              className={standardInput}
            >
              <option value="annuity">Annuity (Monthly Investment)</option>
              <option value="annuity-target-future-value">
                Annuity Target (Find Monthly Investment)
              </option>
              <option value="fixed-deposit">Fixed Deposit</option>
            </select>
          </div>
          <NumericInput
            label={
              inputs.calculationType === "annuity-target-future-value"
                ? "Current Balance (Optional)"
                : "Initial Balance"
            }
            description={
              inputs.calculationType === "annuity-target-future-value"
                ? "Money you already have invested now. This amount also grows with compounding and reduces required monthly contribution."
                : "Starting amount at month 0 before new deposits and future interest are applied."
            }
            value={inputs.initialBalance}
            onChange={(value) => setInputs((previous) => ({ ...previous, initialBalance: value }))}
            min={0}
            step={100}
            className={standardInput}
          />
          {inputs.calculationType === "annuity" ? (
            <NumericInput
              label="Monthly Investment"
              description="Amount invested at the beginning of each month."
              value={inputs.monthlyInvestment}
              onChange={(value) => setInputs((previous) => ({ ...previous, monthlyInvestment: value }))}
              min={0}
              step={100}
              className={standardInput}
            />
          ) : inputs.calculationType === "annuity-target-future-value" ? (
            <NumericInput
              label="Target Future Value"
              description="Goal amount you want to reach at the end of the selected time period."
              value={inputs.targetFutureValue}
              onChange={(value) => setInputs((previous) => ({ ...previous, targetFutureValue: value }))}
              min={0}
              step={1000}
              className={standardInput}
            />
          ) : (
            <div>
              <InfoLabel
                label="Fixed Deposit Interest Handling"
                description="Choose whether each compounding period's interest is added back into principal (compounding) or kept separate (simple-style accrual)."
              />
              <select
                value={inputs.fixedDepositInterestMode}
                onChange={(event) =>
                  setInputs((previous) => ({
                    ...previous,
                    fixedDepositInterestMode: event.target.value as FixedDepositInterestMode,
                  }))
                }
                className={standardInput}
              >
                <option value="add-to-principal">Interest Added to Principal</option>
                <option value="not-added-to-principal">Interest Not Added to Principal</option>
              </select>
            </div>
          )}
          <NumericInput
            label="Annual Interest Rate (%)"
            description="Nominal yearly interest rate used to derive the per-compounding-period rate."
            value={inputs.annualInterestRatePercent}
            onChange={(value) =>
              setInputs((previous) => ({ ...previous, annualInterestRatePercent: value }))
            }
            min={0}
            step={0.1}
            className={standardInput}
          />
          <NumericInput
            label="Years"
            description="Total investment duration in years. The table shows all months in this period."
            value={inputs.years}
            onChange={(value) => setInputs((previous) => ({ ...previous, years: clampYears(value) }))}
            min={1}
            max={100}
            step={1}
            className={standardInput}
          />
          <div>
            <InfoLabel
              label="Compounding Frequency"
              description="How often interest is applied to the balance: annually (every 12 months) or quarterly (every 3 months)."
            />
            <select
              value={effectiveCompoundingFrequency}
              onChange={(event) =>
                setInputs((previous) => ({
                  ...previous,
                  compoundingFrequency: event.target.value as CompoundingFrequency,
                }))
              }
              className={standardInput}
            >
              <option value="annual">Annually</option>
              <option value="quarterly">Quarterly</option>
            </select>
            {inputs.calculationType === "annuity-target-future-value" ? (
              <p className="mt-1 text-xs text-gray-500">
                Target mode calculates required monthly investment for the selected compounding frequency.
              </p>
            ) : null}
          </div>
        </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
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

      <section className="mt-6 bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Balance over time</h2>
          <p className="mt-1 text-sm text-gray-600">
            Stacked bars: principal (initial + contributions) and cumulative interest. Total bar height is final balance for each month.
          </p>
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

interface NumericInputProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className: string;
}

function NumericInput({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
  className,
}: NumericInputProps) {
  return (
    <div>
      <InfoLabel label={label} description={description} />
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(parseSafeNumber(event.target.value))}
        className={className}
      />
    </div>
  );
}

interface InfoLabelProps {
  label: string;
  description: string;
}

function InfoLabel({ label, description }: InfoLabelProps) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="group relative inline-flex">
        <button
          type="button"
          tabIndex={0}
          aria-label={`${label} information`}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-[10px] font-semibold text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          i
        </button>
        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
          {description}
        </div>
      </div>
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

function parseSafeNumber(value: string): number {
  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function clampYears(years: number): number {
  if (!Number.isFinite(years)) return 1;
  if (years < 1) return 1;
  if (years > 100) return 100;
  return Math.floor(years);
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
