import type { Expense } from "../../../types/financial";

type BreakdownExpense = Pick<Expense, "account" | "category" | "categoryId">;
type ExpenseAmount = (expense: Expense) => number;

export const CATEGORY_MIN_DISPLAY_PERCENT = 1;

const categoryColors = [
    "#6366f1", "#f59e0b", "#ef4444", "#10b981", "#3b82f6",
    "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
    "#06b6d4", "#a855f7", "#d946ef", "#22c55e", "#e11d48",
];

export interface AccountBarRow {
    key: string;
    name: string;
    count: number;
    totalAmount: number;
    percentOfTotal: number;
}

export interface CategoryRow {
    key: string;
    name: string;
    color: string;
    transactionCount: number;
    totalAmount: number;
    percentOfTotal: number;
    memberCategories?: CategoryRow[];
}

function normalizeLabel(value: string | undefined) {
    return (value ?? "").replace(/\u200b/g, "").replace(/\s+/g, " ").trim();
}

function accountLabel(account: BreakdownExpense["account"]) {
    if (!account) return "No account";
    const name = [normalizeLabel(account.bankName), normalizeLabel(account.holderName)]
        .filter(Boolean).join(" – ");
    return normalizeLabel(account.nickname) || name || "Unnamed account";
}

export function buildExpenseBreakdown(expenses: Expense[], getAmount: ExpenseAmount) {
    const accounts = new Map<string, AccountBarRow>();
    const categories = new Map<string, CategoryRow>();
    const accountLastDigits = new Map<string, string>();
    let totalAmount = 0;

    for (const expense of expenses) {
        const amount = getAmount(expense);
        totalAmount += amount;
        const account = expense.account;
        const accountKey = account ? String(account.id) : "unassigned";
        const accountRow = accounts.get(accountKey) ?? {
            key: accountKey, name: accountLabel(account), count: 0, totalAmount: 0, percentOfTotal: 0,
        };
        accountRow.count++;
        accountRow.totalAmount += amount;
        accounts.set(accountKey, accountRow);
        if (account?.accountNumber) accountLastDigits.set(accountKey, account.accountNumber.slice(-4));

        const categoryKey = expense.category ? String(expense.categoryId) : "uncategorized";
        const categoryRow = categories.get(categoryKey) ?? {
            key: categoryKey,
            name: expense.category?.name ?? "Uncategorized",
            color: expense.category?.color || categoryColors[categories.size % categoryColors.length]!,
            transactionCount: 0,
            totalAmount: 0,
            percentOfTotal: 0,
        };
        categoryRow.transactionCount++;
        categoryRow.totalAmount += amount;
        categories.set(categoryKey, categoryRow);
    }

    const labelCounts = new Map<string, number>();
    for (const { name } of accounts.values()) labelCounts.set(name, (labelCounts.get(name) ?? 0) + 1);

    const accountRows = [...accounts.values()].sort((a, b) => b.count - a.count);
    for (const row of accountRows) {
        row.percentOfTotal = row.count / expenses.length * 100;
        const lastDigits = accountLastDigits.get(row.key);
        if ((labelCounts.get(row.name) ?? 0) > 1 && lastDigits) row.name += ` · ••${lastDigits}`;
    }

    const categoryRows = [...categories.values()].sort((a, b) => b.totalAmount - a.totalAmount);
    const positiveTotal = categoryRows.reduce((sum, row) => sum + Math.max(0, row.totalAmount), 0);
    const displayedCategories: CategoryRow[] = [];
    const grouped: CategoryRow[] = [];
    for (const row of categoryRows) {
        if (row.totalAmount > 0) row.percentOfTotal = row.totalAmount / positiveTotal * 100;
        if (row.totalAmount > 0 && row.percentOfTotal < CATEGORY_MIN_DISPLAY_PERCENT) {
            grouped.push(row);
        } else {
            displayedCategories.push(row);
        }
    }

    if (grouped.length) {
        displayedCategories.push({
            key: "grouped-others",
            name: "Others",
            color: "#94a3b8",
            transactionCount: grouped.reduce((sum, row) => sum + row.transactionCount, 0),
            totalAmount: grouped.reduce((sum, row) => sum + row.totalAmount, 0),
            percentOfTotal: grouped.reduce((sum, row) => sum + row.percentOfTotal, 0),
            memberCategories: grouped,
        });
        displayedCategories.sort((a, b) => b.totalAmount - a.totalAmount);
    }

    return { accountRows, categoryRows, displayedCategories, totalAmount };
}
