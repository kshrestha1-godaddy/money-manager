import type { DebtInterface } from "../types/debts";
import { getDebtSectionKey } from "./interestCalculation";

export type DebtTableSection = "ACTIVE" | "PARTIALLY_PAID" | "FULLY_PAID";

export function getDebtSectionForTable(debt: DebtInterface): DebtTableSection {
  return getDebtSectionKey(debt);
}

export function getDebtDisplayStatus(debt: DebtInterface): DebtInterface["status"] {
  const section = getDebtSectionForTable(debt);
  if (section === "FULLY_PAID") return "FULLY_PAID";
  if (section === "PARTIALLY_PAID") return "PARTIALLY_PAID";
  if (debt.status === "OVERDUE" || debt.status === "DEFAULTED") return debt.status;
  return "ACTIVE";
}
