import { formatCurrency } from "../../utils/currency";
import { convertForDisplaySync } from "../../utils/currencyDisplay";
import type { CalculatorInputs, CompoundingFrequency } from "./types";
import { clampYears } from "./calculator-input-utils";

export interface MonthlyAnnuityRow {
  month: number;
  year: number;
  investmentAmount: number;
  interestCalculationBase: number;
  interestGainedPeriod: number;
  totalInterestGained: number;
  accumulatedInvestment: number;
  finalBalance: number;
}

export interface CompoundingConfig {
  periodMonths: number;
  periodsPerYear: number;
  periodLabelLowercase: string;
  interestColumnLabel: string;
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getCompoundingConfig(frequency: CompoundingFrequency): CompoundingConfig {
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

export function getInterestSharePercent(finalBalance: number, totalInterest: number): number {
  if (finalBalance <= 0) return 0;
  return (totalInterest / finalBalance) * 100;
}

export function getEffectiveMonthlyInvestment(
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

export function calculateMonthlyAnnuityRows(
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

export interface AnnuityTotals {
  principal: number;
  finalBalance: number;
  totalInterest: number;
  totalMonths: number;
}

export interface AnnuitySnapshot {
  periodConfig: CompoundingConfig;
  effectiveMonthlyInvestment: number;
  rows: MonthlyAnnuityRow[];
  totals: AnnuityTotals;
  /** (finalBalance − principal) / principal × 100 when principal > 0 */
  roiPercent: number;
}

export function computeAnnuitySnapshot(inputs: CalculatorInputs): AnnuitySnapshot {
  const periodConfig = getCompoundingConfig(inputs.compoundingFrequency);
  const effectiveMonthlyInvestment = getEffectiveMonthlyInvestment(inputs, periodConfig);
  const rows = calculateMonthlyAnnuityRows(inputs, periodConfig, effectiveMonthlyInvestment);
  const yearsClamped = clampYears(inputs.years);
  const totalMonths = yearsClamped * 12;
  const totalInvestedByContributions =
    inputs.calculationType === "fixed-deposit"
      ? 0
      : effectiveMonthlyInvestment * totalMonths;
  const principal = Math.max(0, inputs.initialBalance) + totalInvestedByContributions;
  const lastRow = rows[rows.length - 1];
  const finalBalance = lastRow?.finalBalance ?? Math.max(0, inputs.initialBalance);
  const totalInterest = lastRow?.totalInterestGained ?? 0;
  const roiPercent = principal > 0 ? ((finalBalance - principal) / principal) * 100 : 0;

  return {
    periodConfig,
    effectiveMonthlyInvestment,
    rows,
    totals: { principal, finalBalance, totalInterest, totalMonths },
    roiPercent,
  };
}

export function formatChartAxisValue(value: number, currency: string): string {
  const absoluteValue = Math.abs(value);
  if (absoluteValue >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absoluteValue >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatCurrency(value, currency);
}

export interface StackedBarChartPoint {
  month: number;
  principal: number;
  interest: number;
  finalBalance: number;
}

export function buildChartXTicks(rows: MonthlyAnnuityRow[]): number[] {
  const monthCount = rows.length;
  if (monthCount === 0) return [];
  if (monthCount <= 24) return rows.map((row) => row.month);
  const ticks: number[] = [1];
  for (let monthNumber = 12; monthNumber < monthCount; monthNumber += 12) {
    ticks.push(monthNumber);
  }
  if (ticks[ticks.length - 1] !== monthCount) ticks.push(monthCount);
  return ticks;
}

export function buildChartScrollWidth(rowCount: number): number {
  return Math.max(800, rowCount * 5);
}

export function buildStackedBarChartData(
  rows: MonthlyAnnuityRow[],
  baseCurrency: string,
  displayCurrency: string
): StackedBarChartPoint[] {
  const display = (displayCurrency || baseCurrency).trim();
  return rows.map((row) => {
    const interestBase = Math.max(0, row.totalInterestGained);
    const principalBase = Math.max(0, roundCurrency(row.finalBalance - interestBase));
    return {
      month: row.month,
      principal: roundCurrency(convertForDisplaySync(principalBase, baseCurrency, display)),
      interest: roundCurrency(convertForDisplaySync(interestBase, baseCurrency, display)),
      finalBalance: roundCurrency(convertForDisplaySync(row.finalBalance, baseCurrency, display)),
    };
  });
}

function csvQuoteCell(value: string | number | undefined | null): string {
  const normalizedValue = String(value ?? "");
  return `"${normalizedValue.replace(/"/g, '""')}"`;
}

function formatAmountCsvPlain(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function buildCsvFromCalculationRows(
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
