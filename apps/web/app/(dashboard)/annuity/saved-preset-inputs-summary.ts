import type { CalculatorInputs } from "./types";
import { normalizeAnnuityInputs } from "./types";

function formatAmount(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function initialBalanceLabel(inputs: CalculatorInputs): string {
  if (inputs.calculationType === "annuity-target-future-value") return "Current balance";
  if (inputs.calculationType === "fixed-deposit") return "Principal";
  return "Initial balance";
}

/** One row per calculator field for per-scenario input tables. */
export function getPresetInputsDetailRows(inputs: CalculatorInputs): { label: string; value: string }[] {
  const n = normalizeAnnuityInputs(inputs);
  const comp = n.compoundingFrequency === "quarterly" ? "Quarterly" : "Annual";
  const modeLabel =
    n.calculationType === "annuity"
      ? "Annuity (monthly investment)"
      : n.calculationType === "annuity-target-future-value"
        ? "Annuity target (find monthly investment)"
        : "Fixed deposit";

  const rows: { label: string; value: string }[] = [
    { label: "Calculation type", value: modeLabel },
    { label: initialBalanceLabel(n), value: formatAmount(n.initialBalance) },
  ];

  if (n.calculationType === "annuity") {
    rows.push({ label: "Monthly investment", value: formatAmount(n.monthlyInvestment) });
  } else if (n.calculationType === "annuity-target-future-value") {
    rows.push({ label: "Target future value", value: formatAmount(n.targetFutureValue) });
  } else {
    rows.push({
      label: "Interest handling",
      value:
        n.fixedDepositInterestMode === "add-to-principal"
          ? "Interest added to principal"
          : "Interest not added to principal",
    });
  }

  rows.push(
    { label: "Annual interest rate", value: `${formatAmount(n.annualInterestRatePercent)}%` },
    { label: "Years", value: String(n.years) },
    { label: "Compounding frequency", value: comp },
  );

  return rows;
}
