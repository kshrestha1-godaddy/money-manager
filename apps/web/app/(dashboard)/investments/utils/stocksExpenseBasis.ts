import prisma from "@repo/db/client";
import { CategoryType } from "@prisma/client";
import { getCurrencyRateConfigQuery } from "../../../data/currency-rate-config";
import { convertCurrencySync } from "../../../utils/currencyConversion";
import { getInvestmentTypeLabel } from "./investmentTypeUi";

/**
 * Expense category name must match the label for investment type STOCKS (same string users see when
 * they pick category "Stocks" on expenses / FinancialList).
 */
const STOCKS_EXPENSE_CATEGORY_NAME = getInvestmentTypeLabel("STOCKS");

/**
 * Sum of all-time expense rows in the Stocks category, in the user's preferred currency.
 *
 * Matches how `useOptimizedFinancialData` builds `totalAmount`: each row is converted with the same
 * sync rules as `convertForDisplaySync` (DB-backed rate matrix on the server via
 * `getCurrencyRateConfigQuery`).
 *
 * Differences vs a number you eyeball on the expenses page:
 * - This is **all-time**; the expenses UI often defaults to **current month** unless you clear filters
 *   or use "Show All Expenses".
 * - With **multiple** STOCKS investment positions, purchase price uses **equal split** of this total
 *   across positions (see `resolvePurchasePriceForInvestmentDisplay`).
 */
export async function sumStocksCategoryExpenseAmountsForUser(userId: number): Promise<number> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { currency: true },
    });
    const userCurrency = (user?.currency?.trim() || "USD").toUpperCase();

    const expenses = await prisma.expense.findMany({
        where: {
            userId,
            category: {
                type: CategoryType.EXPENSE,
                name: { equals: STOCKS_EXPENSE_CATEGORY_NAME, mode: "insensitive" },
            },
        },
        select: { amount: true, currency: true },
    });

    const { matrix } = await getCurrencyRateConfigQuery();

    let total = 0;
    for (const e of expenses) {
        const amt = parseFloat(e.amount.toString());
        const stored = (e.currency?.trim() || "USD").toUpperCase();
        total += convertCurrencySync(amt, stored, userCurrency, matrix);
    }
    return total;
}

export async function countStocksInvestmentsForUser(userId: number): Promise<number> {
    return prisma.investment.count({
        where: { userId, type: "STOCKS" },
    });
}

type PurchaseFields = {
    type: string;
    quantity: unknown;
    purchasePrice: unknown;
};

/**
 * For STOCKS positions, cost basis per unit is derived from the sum of Stocks-category expenses
 * (converted to user currency), split equally across STOCKS positions, then divided by quantity.
 * When there are no such expenses, falls back to stored purchasePrice.
 */
export function resolvePurchasePriceForInvestmentDisplay(
    investment: PurchaseFields,
    stocksExpenseTotal: number,
    stocksPositionCount: number
): number {
    const dbPrice = parseFloat(String(investment.purchasePrice));
    if (investment.type !== "STOCKS" || stocksExpenseTotal <= 0 || stocksPositionCount <= 0) {
        return dbPrice;
    }
    const quantity = Math.max(parseFloat(String(investment.quantity)) || 0, 1e-12);
    const shareOfExpenses = stocksExpenseTotal / stocksPositionCount;
    return shareOfExpenses / quantity;
}

export function investedAmountForPosition(
    investment: PurchaseFields,
    stocksExpenseTotal: number,
    stocksPositionCount: number
): number {
    const q = parseFloat(String(investment.quantity)) || 0;
    const p = resolvePurchasePriceForInvestmentDisplay(
        investment,
        stocksExpenseTotal,
        stocksPositionCount
    );
    return q * p;
}

/** Position market value: quantity × current price (used for savings-target progress / timeline). */
export function presentValueForPosition(investment: {
    quantity: unknown;
    currentPrice: unknown;
}): number {
    const q = parseFloat(String(investment.quantity)) || 0;
    const c = parseFloat(String(investment.currentPrice)) || 0;
    return q * c;
}
