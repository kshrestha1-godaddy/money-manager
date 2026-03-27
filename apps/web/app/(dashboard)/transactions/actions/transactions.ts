"use server";

import prisma from "@repo/db/client";
import { Transaction } from "../../../types/financial";
import {
    getUserIdFromSession,
    getAuthenticatedSession,
    decimalToNumber,
} from "../../../utils/auth";

async function getUserDisplayCurrency(userId: number): Promise<string> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { currency: true },
    });
    return user?.currency || "USD";
}

function buildBookmarkLookup(userId: number): Promise<Map<string, boolean>> {
    return prisma.transactionBookmark
        .findMany({ where: { userId } })
        .then((bookmarks) => {
            const map = new Map<string, boolean>();
            for (const b of bookmarks) {
                map.set(
                    `${b.transactionType.toLowerCase()}-${b.transactionId}`,
                    true
                );
            }
            return map;
        });
}

function mapExpenseToTransaction(
    expense: any,
    bookmarkMap: Map<string, boolean>
): Transaction {
    return {
        id: `expense-${expense.id}`,
        type: "EXPENSE",
        title: expense.title,
        amount: decimalToNumber(expense.amount, "expense amount"),
        currency: expense.currency,
        date: new Date(expense.date),
        category: expense.category.name,
        account: expense.account?.bankName || "Cash",
        description: expense.description || undefined,
        notes: expense.notes || undefined,
        tags: expense.tags,
        location: expense.location ?? undefined,
        isBookmarked: bookmarkMap.get(`expense-${expense.id}`) || false,
    };
}

function mapIncomeToTransaction(
    income: any,
    bookmarkMap: Map<string, boolean>
): Transaction {
    return {
        id: `income-${income.id}`,
        type: "INCOME",
        title: income.title,
        amount: decimalToNumber(income.amount, "income amount"),
        currency: income.currency,
        date: new Date(income.date),
        category: income.category.name,
        account: income.account?.bankName || "Cash",
        description: income.description || undefined,
        notes: income.notes || undefined,
        tags: income.tags,
        location: income.location ?? undefined,
        isBookmarked: bookmarkMap.get(`income-${income.id}`) || false,
    };
}

function formatInvestmentCategory(type: string): string {
    return type
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapDebtToTransaction(
    debt: any,
    bookmarkMap: Map<string, boolean>,
    displayCurrency: string
): Transaction {
    return {
        id: `debt-${debt.id}`,
        type: "DEBT",
        title: `Lent to ${debt.borrowerName}`,
        amount: decimalToNumber(debt.amount, "debt amount"),
        currency: displayCurrency,
        date: new Date(debt.lentDate),
        category: "Lending",
        account: debt.account?.bankName || "Cash",
        description: debt.purpose || undefined,
        notes: debt.notes || undefined,
        tags: [],
        isBookmarked: bookmarkMap.get(`debt-${debt.id}`) || false,
    };
}

function mapInvestmentToTransaction(
    inv: any,
    bookmarkMap: Map<string, boolean>,
    displayCurrency: string
): Transaction {
    const qty = decimalToNumber(inv.quantity, "investment quantity");
    const purchasePrice = decimalToNumber(
        inv.purchasePrice,
        "investment purchase price"
    );
    return {
        id: `investment-${inv.id}`,
        type: "INVESTMENT",
        title: inv.name,
        amount: qty * purchasePrice,
        currency: displayCurrency,
        date: new Date(inv.purchaseDate),
        category: formatInvestmentCategory(inv.type),
        account: inv.account?.bankName || "Cash",
        description: inv.symbol ? `Symbol: ${inv.symbol}` : undefined,
        notes: inv.notes || undefined,
        tags: [],
        isBookmarked: bookmarkMap.get(`investment-${inv.id}`) || false,
    };
}

async function loadUnifiedTransactions(
    userId: number,
    opts: { limit?: number; startDate?: Date; endDate?: Date }
): Promise<Transaction[]> {
    const displayCurrency = await getUserDisplayCurrency(userId);
    const bookmarkMap = await buildBookmarkLookup(userId);

    const expenseWhere: any = { userId };
    const incomeWhere: any = { userId };
    const debtWhere: any = { userId };
    const investmentWhere: any = { userId };

    if (opts.startDate && opts.endDate) {
        expenseWhere.date = { gte: opts.startDate, lte: opts.endDate };
        incomeWhere.date = { gte: opts.startDate, lte: opts.endDate };
        debtWhere.lentDate = { gte: opts.startDate, lte: opts.endDate };
        investmentWhere.purchaseDate = {
            gte: opts.startDate,
            lte: opts.endDate,
        };
    }

    const expenseInclude = { category: true, account: true, user: true };
    const incomeInclude = { category: true, account: true, user: true };
    const debtInclude = { account: true };
    const investmentInclude = { account: true };

    const take = opts.limit;

    const [expenses, incomes, debts, investments] = await Promise.all([
        prisma.expense.findMany({
            where: expenseWhere,
            include: expenseInclude,
            orderBy: { date: "desc" },
            ...(take ? { take } : {}),
        }),
        prisma.income.findMany({
            where: incomeWhere,
            include: incomeInclude,
            orderBy: { date: "desc" },
            ...(take ? { take } : {}),
        }),
        prisma.debt.findMany({
            where: debtWhere,
            include: debtInclude,
            orderBy: { lentDate: "desc" },
            ...(take ? { take } : {}),
        }),
        prisma.investment.findMany({
            where: investmentWhere,
            include: investmentInclude,
            orderBy: { purchaseDate: "desc" },
            ...(take ? { take } : {}),
        }),
    ]);

    const expenseTx = expenses.map((e) =>
        mapExpenseToTransaction(e, bookmarkMap)
    );
    const incomeTx = incomes.map((i) => mapIncomeToTransaction(i, bookmarkMap));
    const debtTx = debts.map((d) =>
        mapDebtToTransaction(d, bookmarkMap, displayCurrency)
    );
    const invTx = investments.map((i) =>
        mapInvestmentToTransaction(i, bookmarkMap, displayCurrency)
    );

    return [...expenseTx, ...incomeTx, ...debtTx, ...invTx].sort(
        (a, b) => b.date.getTime() - a.date.getTime()
    );
}

export async function getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        const merged = await loadUnifiedTransactions(userId, { limit });
        return merged.slice(0, limit);
    } catch (error) {
        console.error(`Failed to fetch recent transactions (limit: ${limit}):`, error);
        throw new Error("Failed to fetch recent transactions");
    }
}

export async function getTransactionsByDateRange(
    startDate: Date,
    endDate: Date
): Promise<Transaction[]> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        return loadUnifiedTransactions(userId, { startDate, endDate });
    } catch (error) {
        console.error(
            `Failed to fetch transactions by date range (${startDate.toISOString()} - ${endDate.toISOString()}):`,
            error
        );
        throw new Error("Failed to fetch transactions by date range");
    }
}

export async function getAllTransactions(): Promise<Transaction[]> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        return loadUnifiedTransactions(userId, {});
    } catch (error) {
        console.error("Failed to fetch all transactions:", error);
        throw new Error("Failed to fetch all transactions");
    }
}
