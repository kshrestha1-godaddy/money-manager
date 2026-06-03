import { roundCurrency } from "./annuity-math";

export interface FdIncomeCorpusInputs {
  /** Annual interest income you want after tax (I). */
  targetAnnualIncome: number;
  /** Nominal annual FD rate as a percent (e.g. 5 for 5%). */
  annualInterestRatePercent: number;
  /** Tax withheld on interest as a percent of gross interest (e.g. 5 for 5% TDS). */
  taxRatePercent: number;
  /** Safety margin added on top of tax-adjusted corpus (e.g. 10 for +10%). */
  bufferPercent: number;
}

export interface FdIncomeCorpusResult {
  targetAnnualIncome: number;
  interestRateDecimal: number;
  taxRateDecimal: number;
  bufferRateDecimal: number;
  /** r × (1 − τ) — net yield on corpus after tax. */
  effectiveRateAfterTax: number;
  corpusGrossNoTax: number;
  corpusAfterTax: number;
  corpusAfterTaxWithBuffer: number;
  /** Gross interest on corpusAfterTax at nominal r (before tax). */
  grossInterestAtTaxAdjustedCorpus: number;
  /** Net interest after tax at corpusAfterTax. */
  netInterestAtTaxAdjustedCorpus: number;
}

function clampPercent(value: number, max = 100): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, value));
}

export function computeFdIncomeCorpus(inputs: FdIncomeCorpusInputs): FdIncomeCorpusResult | null {
  const targetAnnualIncome = Math.max(0, inputs.targetAnnualIncome);
  const interestRateDecimal = clampPercent(inputs.annualInterestRatePercent) / 100;
  const taxRateDecimal = clampPercent(inputs.taxRatePercent, 99.99) / 100;
  const bufferRateDecimal = clampPercent(inputs.bufferPercent) / 100;

  if (targetAnnualIncome <= 0 || interestRateDecimal <= 0) return null;

  const effectiveRateAfterTax = interestRateDecimal * (1 - taxRateDecimal);
  if (effectiveRateAfterTax <= 0) return null;

  const corpusGrossNoTax = roundCurrency(targetAnnualIncome / interestRateDecimal);
  const corpusAfterTax = roundCurrency(targetAnnualIncome / effectiveRateAfterTax);
  const corpusAfterTaxWithBuffer = roundCurrency(corpusAfterTax * (1 + bufferRateDecimal));

  const grossInterestAtTaxAdjustedCorpus = roundCurrency(corpusAfterTax * interestRateDecimal);
  const netInterestAtTaxAdjustedCorpus = roundCurrency(
    grossInterestAtTaxAdjustedCorpus * (1 - taxRateDecimal)
  );

  return {
    targetAnnualIncome,
    interestRateDecimal,
    taxRateDecimal,
    bufferRateDecimal,
    effectiveRateAfterTax,
    corpusGrossNoTax,
    corpusAfterTax,
    corpusAfterTaxWithBuffer,
    grossInterestAtTaxAdjustedCorpus,
    netInterestAtTaxAdjustedCorpus,
  };
}

export interface FdInterestCalculationStep {
  label: string;
  expression: string;
  amount: number;
}

export interface FdInterestFromPrincipalBreakdown {
  scenarioLabel: string;
  principal: number;
  annualInterestRatePercent: number;
  taxRatePercent: number;
  steps: FdInterestCalculationStep[];
  grossInterest: number;
  taxOnInterest: number;
  netInterestAfterTax: number;
}

export function computeInterestFromPrincipal(params: {
  principal: number;
  annualInterestRatePercent: number;
  taxRatePercent: number;
  scenarioLabel: string;
}): FdInterestFromPrincipalBreakdown | null {
  const principal = Math.max(0, params.principal);
  const ratePercent = clampPercent(params.annualInterestRatePercent);
  const taxPercent = clampPercent(params.taxRatePercent, 99.99);
  const rateDecimal = ratePercent / 100;
  const taxDecimal = taxPercent / 100;

  if (principal <= 0 || rateDecimal <= 0) return null;

  const grossInterest = roundCurrency(principal * rateDecimal);
  const taxOnInterest = roundCurrency(grossInterest * taxDecimal);
  const netInterestAfterTax = roundCurrency(grossInterest - taxOnInterest);

  const rateLabel = `${ratePercent}%`;
  const taxLabel = `${taxPercent}%`;
  const principalFormatted = principal.toLocaleString();
  const grossFormatted = grossInterest.toLocaleString();

  const steps: FdInterestCalculationStep[] = [
    {
      label: "Principal (C)",
      expression: "Starting FD amount",
      amount: principal,
    },
    {
      label: "Gross interest",
      expression: `C × ${rateLabel} = ${principalFormatted} × ${rateDecimal}`,
      amount: grossInterest,
    },
    taxPercent > 0
      ? {
          label: "Tax on interest",
          expression: `Gross × ${taxLabel} = ${grossFormatted} × ${taxDecimal}`,
          amount: taxOnInterest,
        }
      : {
          label: "Tax on interest",
          expression: "No tax (τ = 0%)",
          amount: 0,
        },
    taxPercent > 0
      ? {
          label: "Net interest (after tax)",
          expression: `Gross − Tax = ${grossFormatted} − ${taxOnInterest.toLocaleString()}`,
          amount: netInterestAfterTax,
        }
      : {
          label: "Net interest (after tax)",
          expression: `Same as gross at ${rateLabel}`,
          amount: netInterestAfterTax,
        },
  ];

  return {
    scenarioLabel: params.scenarioLabel,
    principal,
    annualInterestRatePercent: ratePercent,
    taxRatePercent: taxPercent,
    steps,
    grossInterest,
    taxOnInterest,
    netInterestAfterTax,
  };
}

export function buildInterestBreakdownsForCorpusResult(
  result: FdIncomeCorpusResult,
  annualInterestRatePercent: number,
  taxRatePercent: number,
  bufferPercent: number
): FdInterestFromPrincipalBreakdown[] {
  const breakdowns: FdInterestFromPrincipalBreakdown[] = [];

  const afterTax = computeInterestFromPrincipal({
    principal: result.corpusAfterTax,
    annualInterestRatePercent,
    taxRatePercent,
    scenarioLabel: "At tax-adjusted corpus",
  });
  if (afterTax) breakdowns.push(afterTax);

  if (bufferPercent > 0) {
    const withBuffer = computeInterestFromPrincipal({
      principal: result.corpusAfterTaxWithBuffer,
      annualInterestRatePercent,
      taxRatePercent,
      scenarioLabel: "At corpus with buffer",
    });
    if (withBuffer) breakdowns.push(withBuffer);
  }

  const grossOnly = computeInterestFromPrincipal({
    principal: result.corpusGrossNoTax,
    annualInterestRatePercent,
    taxRatePercent: 0,
    scenarioLabel: "At gross corpus (no tax in formula)",
  });
  if (grossOnly) breakdowns.push(grossOnly);

  return breakdowns;
}
