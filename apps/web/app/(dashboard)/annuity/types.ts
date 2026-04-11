export type CompoundingFrequency = "annual" | "quarterly";
export type CalculationType = "annuity" | "annuity-target-future-value" | "fixed-deposit";
export type FixedDepositInterestMode = "add-to-principal" | "not-added-to-principal";

export interface CalculatorInputs {
  calculationType: CalculationType;
  initialBalance: number;
  monthlyInvestment: number;
  targetFutureValue: number;
  annualInterestRatePercent: number;
  years: number;
  compoundingFrequency: CompoundingFrequency;
  fixedDepositInterestMode: FixedDepositInterestMode;
}

export const DEFAULT_ANNUITY_INPUTS: CalculatorInputs = {
  calculationType: "annuity",
  initialBalance: 0,
  monthlyInvestment: 0,
  targetFutureValue: 0,
  annualInterestRatePercent: 0,
  years: 0,
  compoundingFrequency: "annual",
  fixedDepositInterestMode: "add-to-principal",
};

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickString<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const t = String(value ?? "").trim();
  return (allowed as string[]).includes(t) ? (t as T) : fallback;
}

export function normalizeAnnuityInputs(raw: unknown): CalculatorInputs {
  const object = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const yearsRaw = parseNumber(object.years, DEFAULT_ANNUITY_INPUTS.years);
  return {
    calculationType: pickString(object.calculationType, ["annuity", "annuity-target-future-value", "fixed-deposit"], "annuity"),
    initialBalance: Math.max(0, parseNumber(object.initialBalance, 0)),
    monthlyInvestment: Math.max(0, parseNumber(object.monthlyInvestment, 0)),
    targetFutureValue: Math.max(0, parseNumber(object.targetFutureValue, 0)),
    annualInterestRatePercent: Math.max(0, parseNumber(object.annualInterestRatePercent, 0)),
    years: Math.min(100, Math.max(0, Math.floor(yearsRaw))),
    compoundingFrequency: pickString(object.compoundingFrequency, ["annual", "quarterly"], "annual"),
    fixedDepositInterestMode: pickString(
      object.fixedDepositInterestMode,
      ["add-to-principal", "not-added-to-principal"],
      "add-to-principal"
    ),
  };
}
