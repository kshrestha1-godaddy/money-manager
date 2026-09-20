import type { DebtInterface } from "../types/debts";
import { calculateRemainingWithInterest } from "./interestCalculation";
import { getDebtSectionForTable } from "./debtClassification";

export type LendingGroupByOption = "status" | "borrower";

export interface LendingGroupedSection {
  key: string;
  title: string;
  debts: DebtInterface[];
  totalAmount: number;
  totalRemaining: number;
}

interface GroupPart {
  key: string;
  title: string;
  order: number;
}

const GROUP_BY_ORDER: LendingGroupByOption[] = [
  "status",
  "borrower",
];

const STATUS_GROUP_META: Record<string, { title: string; order: number }> = {
  ACTIVE: { title: "Active Lendings", order: 0 },
  PARTIALLY_PAID: { title: "Partially Paid Lendings", order: 1 },
  FULLY_PAID: { title: "Fully Paid Lendings", order: 2 },
};

function summarizeSection(debts: DebtInterface[]) {
  const totalAmount = debts.reduce((sum, debt) => sum + debt.amount, 0);
  const totalRemaining = debts.reduce((sum, debt) => {
    const remaining = calculateRemainingWithInterest(
      debt.amount,
      debt.interestRate,
      debt.lentDate,
      debt.dueDate,
      debt.repayments || [],
      new Date(),
      debt.status
    );
    return sum + remaining.remainingAmount;
  }, 0);

  return { totalAmount, totalRemaining };
}

function getStatusPart(debt: DebtInterface): GroupPart {
  const section = getDebtSectionForTable(debt);
  const meta = STATUS_GROUP_META[section];
  return { key: section, title: meta.title, order: meta.order };
}

function getBorrowerPart(debt: DebtInterface): GroupPart {
  const title = debt.borrowerName?.trim() || "Unknown Borrower";
  return { key: title, title, order: Number.MAX_SAFE_INTEGER };
}

function getGroupPart(debt: DebtInterface, groupBy: LendingGroupByOption): GroupPart {
  switch (groupBy) {
    case "borrower":
      return getBorrowerPart(debt);
    case "status":
    default:
      return getStatusPart(debt);
  }
}

function normalizeGroupBySelection(selection: LendingGroupByOption[]): LendingGroupByOption[] {
  const set = new Set(selection);
  const ordered = GROUP_BY_ORDER.filter((key) => set.has(key));
  return ordered.length > 0 ? ordered : ["status"];
}

export function groupLendings(
  debts: DebtInterface[],
  groupBySelection: LendingGroupByOption[]
): LendingGroupedSection[] {
  const activeGroupBy = normalizeGroupBySelection(groupBySelection);

  const groups = new Map<
    string,
    { title: string; orders: number[]; debts: DebtInterface[] }
  >();

  for (const debt of debts) {
    const parts = activeGroupBy.map((groupBy) => getGroupPart(debt, groupBy));
    const key = parts
      .map((part, index) => `${activeGroupBy[index]}:${part.key}`)
      .join("|");
    const title =
      parts.length === 1
        ? parts[0]?.title ?? "Unknown"
        : parts
            .map((part, index) => `${activeGroupBy[index]}: ${part.title}`)
            .join(" | ");

    const existing = groups.get(key);
    if (existing) {
      existing.debts.push(debt);
    } else {
      groups.set(key, {
        title,
        orders: parts.map((part) => part.order),
        debts: [debt],
      });
    }
  }

  const toSection = Array.from(groups.entries()).map(([key, value]) => {
    const { totalAmount, totalRemaining } = summarizeSection(value.debts);
    return {
      key,
      title: value.title,
      debts: value.debts,
      totalAmount,
      totalRemaining,
      orders: value.orders,
    };
  });

  toSection.sort((a, b) => {
    const len = Math.max(a.orders.length, b.orders.length);
    for (let i = 0; i < len; i++) {
      const av = a.orders[i] ?? Number.MAX_SAFE_INTEGER;
      const bv = b.orders[i] ?? Number.MAX_SAFE_INTEGER;
      if (av !== bv) return av - bv;
    }
    return a.title.localeCompare(b.title);
  });

  return toSection.map(({ orders: _orders, ...section }) => section);
}
