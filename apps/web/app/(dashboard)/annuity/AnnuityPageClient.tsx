"use client";

import { useMemo, useState } from "react";
import { useCurrency } from "../../providers/CurrencyProvider";
import { formatCurrency } from "../../utils/currency";
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
const cardLargeContainer = CONTAINER_COLORS.cardLarge;
const whiteContainer = CONTAINER_COLORS.white;
const pageTitle = TEXT_COLORS.title;
const pageSubtitle = TEXT_COLORS.subtitle;
const cardTitle = TEXT_COLORS.cardTitle;
const cardSubtitle = TEXT_COLORS.cardSubtitle;
const cardValue = TEXT_COLORS.cardValue;
const standardInput = INPUT_COLORS.standard;

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

      <div className={`${whiteContainer} p-6`}>
        <h2 className="text-lg font-semibold text-gray-900">Calculator Inputs</h2>
        <p className="mt-1 text-sm text-gray-600">
          Configure your investment type and compounding setup. Interest is applied at the end of each selected compounding period.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Calculation Type</label>
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
            value={inputs.initialBalance}
            onChange={(value) => setInputs((previous) => ({ ...previous, initialBalance: value }))}
            min={0}
            step={100}
            className={standardInput}
          />
          {inputs.calculationType === "annuity" ? (
            <NumericInput
              label="Monthly Investment"
              value={inputs.monthlyInvestment}
              onChange={(value) => setInputs((previous) => ({ ...previous, monthlyInvestment: value }))}
              min={0}
              step={100}
              className={standardInput}
            />
          ) : inputs.calculationType === "annuity-target-future-value" ? (
            <NumericInput
              label="Target Future Value"
              value={inputs.targetFutureValue}
              onChange={(value) => setInputs((previous) => ({ ...previous, targetFutureValue: value }))}
              min={0}
              step={1000}
              className={standardInput}
            />
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Fixed Deposit Interest Handling
              </label>
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
            value={inputs.years}
            onChange={(value) => setInputs((previous) => ({ ...previous, years: clampYears(value) }))}
            min={1}
            max={100}
            step={1}
            className={standardInput}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Compounding Frequency
            </label>
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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        <SummaryCard
          title={
            inputs.calculationType === "annuity-target-future-value"
              ? "Required Monthly Investment"
              : "Total Principal"
          }
          value={
            inputs.calculationType === "annuity-target-future-value"
              ? formatCurrency(effectiveMonthlyInvestment, userCurrency)
              : formatCurrency(totals.principal, userCurrency)
          }
          subtitle={
            inputs.calculationType === "annuity"
              ? "Initial + monthly deposits"
              : inputs.calculationType === "annuity-target-future-value"
              ? `To target ${formatCurrency(inputs.targetFutureValue, userCurrency)}`
              : "Initial fixed deposit amount"
          }
        />
        <SummaryCard
          title="Total Interest"
          value={formatCurrency(totals.totalInterest, userCurrency)}
          subtitle={`After ${totals.totalMonths} months`}
        />
        <SummaryCard
          title="Final Balance"
          value={formatCurrency(totals.finalBalance, userCurrency)}
          subtitle={`At end of year ${inputs.years}`}
        />
        <SummaryCard
          title="Interest Share"
          value={`${getInterestSharePercent(totals.finalBalance, totals.totalInterest).toFixed(2)}%`}
          subtitle="Interest as share of final balance"
        />
      </div>

      <div className={`${whiteContainer} mt-6 p-6`}>
        <h2 className="text-lg font-semibold text-gray-900">Month-by-Month Detailed Table</h2>
        <p className="mt-1 text-sm text-gray-600">
          Full monthly breakdown with growth, {periodConfig.periodLabelLowercase} interest events, and running balance.
          Rows at month {highlightedMonthsText} are marked with top and bottom separators.
        </p>
        <div className="mt-4 rounded-md border border-gray-100">
          <table className="w-full table-auto text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="px-3 py-2">Month</th>
                <th className="px-3 py-2">Year</th>
                {inputs.calculationType !== "fixed-deposit" ? (
                  <th className="px-3 py-2">Investment Amount</th>
                ) : null}
                <th className="px-3 py-2">Interest Base</th>
                <th className="px-3 py-2">{periodConfig.interestColumnLabel}</th>
                <th className="px-3 py-2">Interest Accrued</th>
                {inputs.calculationType !== "fixed-deposit" ? (
                  <th className="px-3 py-2">Total Investment</th>
                ) : null}
                <th className="px-3 py-2">Final Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isCompoundingMonth = row.month % periodConfig.periodMonths === 0;
                return (
                <tr
                  key={row.month}
                  className={`text-gray-800 ${
                    isCompoundingMonth
                      ? "border-y-2 border-gray-400 bg-gray-50"
                      : "border-b border-gray-100"
                  }`}
                >
                  <td className="px-3 py-2">{row.month}</td>
                  <td className="px-3 py-2">{row.year}</td>
                  {inputs.calculationType !== "fixed-deposit" ? (
                    <td className="px-3 py-2">
                      {formatCurrency(row.investmentAmount, userCurrency)}
                    </td>
                  ) : null}
                  <td className="px-3 py-2">
                    {formatCurrency(row.interestCalculationBase, userCurrency)}
                  </td>
                  <td
                    className={`px-3 py-2 ${
                      row.interestGainedPeriod > 0 ? "text-emerald-700" : "text-gray-500"
                    }`}
                  >
                    {formatCurrency(row.interestGainedPeriod, userCurrency)}
                  </td>
                  <td
                    className={`px-3 py-2 ${
                      row.totalInterestGained > 0 ? "text-emerald-700" : "text-gray-500"
                    }`}
                  >
                    {formatCurrency(row.totalInterestGained, userCurrency)}
                  </td>
                  {inputs.calculationType !== "fixed-deposit" ? (
                    <td className="px-3 py-2">
                      {formatCurrency(row.accumulatedInvestment, userCurrency)}
                    </td>
                  ) : null}
                  <td className={`px-3 py-2 ${isCompoundingMonth ? "font-semibold" : ""}`}>
                    {formatCurrency(row.finalBalance, userCurrency)}
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface NumericInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className: string;
}

function NumericInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  className,
}: NumericInputProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
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

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
}

function SummaryCard({ title, value, subtitle }: SummaryCardProps) {
  return (
    <div className={`${cardLargeContainer} relative`}>
      <div className="flex h-full flex-col items-center justify-center pt-2 text-center">
        <h3 className={`${cardTitle} mb-2`}>{title}</h3>
        <p className={`${cardValue} mb-1`}>{value}</p>
        <p className={cardSubtitle}>{subtitle}</p>
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
