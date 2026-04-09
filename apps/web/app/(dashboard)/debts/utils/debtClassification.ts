import type { DebtInterface } from "../../../types/debts";
import { calculateRemainingWithInterest } from "../../../utils/interestCalculation";

function roundToCents(value: number): number {
  return Math.round(Number(value) * 100) / 100;
}

export type DebtTableSection = "ACTIVE" | "PARTIALLY_PAID" | "FULLY_PAID";

export function getDebtSectionForTable(debt: DebtInterface): DebtTableSection {
  const calculation = calculateRemainingWithInterest(
    debt.amount,
    debt.interestRate,
    debt.lentDate,
    debt.dueDate,
    debt.repayments || [],
    new Date(),
    debt.status
  );

  const totalToBePaid = Math.max(0, roundToCents(calculation.totalWithInterest));
  const remaining = Math.max(0, roundToCents(calculation.remainingAmount));

  // Requested rule: if remaining is 0 => fully paid.
  if (remaining <= 0) return "FULLY_PAID";
  if (remaining < totalToBePaid) return "PARTIALLY_PAID";
  return "ACTIVE";
}

export function getDebtDisplayStatus(debt: DebtInterface): DebtInterface["status"] {
  const section = getDebtSectionForTable(debt);
  if (section === "FULLY_PAID") return "FULLY_PAID";
  if (section === "PARTIALLY_PAID") return "PARTIALLY_PAID";
  if (debt.status === "OVERDUE" || debt.status === "DEFAULTED") return debt.status;
  return "ACTIVE";
}
