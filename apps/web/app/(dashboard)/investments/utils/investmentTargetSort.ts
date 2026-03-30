import type { InvestmentInterface } from "../../../types/investments";

/**
 * Sort key: 0–100 = completion % toward linked target; no valid target → +Infinity (sorts last).
 */
export function investmentTargetCompletionSortKey(inv: InvestmentInterface): number {
  const t = inv.investmentTarget;
  if (!t || t.targetAmount <= 0 || typeof t.fulfilledAmount !== "number") {
    return Number.POSITIVE_INFINITY;
  }
  return Math.min(100, (t.fulfilledAmount / t.targetAmount) * 100);
}

/** Least complete toward goal first; fully complete (100%) later; no target last. */
export function sortInvestmentsByTargetCompletionAsc(
  items: InvestmentInterface[]
): InvestmentInterface[] {
  return [...items].sort(
    (a, b) => investmentTargetCompletionSortKey(a) - investmentTargetCompletionSortKey(b)
  );
}
