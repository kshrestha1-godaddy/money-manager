import { Transaction, UnifiedTransactionType } from "../types/financial";
import { convertCurrencySync } from "../utils/currencyConversion";
import type { ConversionRateMatrix } from "../utils/currencyRates";

export interface BalanceSheetBuildResult {
  rows: string[][];
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  transactionCount: number;
}

export type ConvertAmountFn = (amount: number, currency: string) => number;

function formatAmount(n: number): string {
  return n.toFixed(2);
}

function formatDateOnly(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isIncomeType(type: UnifiedTransactionType): boolean {
  return type === "INCOME";
}

export function isOutflowType(type: UnifiedTransactionType): boolean {
  return type === "EXPENSE" || type === "DEBT" || type === "INVESTMENT";
}

export function sortTransactionsAsc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const da = a.date instanceof Date ? a.date : new Date(a.date);
    const db = b.date instanceof Date ? b.date : new Date(b.date);
    const t = da.getTime() - db.getTime();
    if (t !== 0) return t;
    return String(a.id).localeCompare(String(b.id));
  });
}

export function computeNetBalance(
  transactions: Transaction[],
  displayCurrency: string,
  convertAmount: ConvertAmountFn
): number {
  return transactions.reduce((sum, transaction) => {
    const displayAmount = convertAmount(transaction.amount, transaction.currency);
    return sum + (isIncomeType(transaction.type) ? displayAmount : -displayAmount);
  }, 0);
}

export function buildBalanceSheetRows(
  sortedTransactions: Transaction[],
  displayCurrency: string,
  openingBalance: number,
  convertAmount: ConvertAmountFn
): BalanceSheetBuildResult {
  const headers = [
    "SN",
    "Date",
    "Type",
    "Title",
    "Description",
    "Category",
    "Account",
    "Tags",
    "Location",
    "Notes",
    "Original currency",
    "Amount (original)",
    `Debit (${displayCurrency})`,
    `Credit (${displayCurrency})`,
    `Balance (${displayCurrency})`,
  ];

  const rows: string[][] = [headers];

  rows.push([
    "",
    "",
    "",
    "OPENING BALANCE",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    formatAmount(openingBalance),
  ]);

  let runningBalance = openingBalance;

  sortedTransactions.forEach((transaction, index) => {
    const displayAmount = convertAmount(transaction.amount, transaction.currency);
    const debit = isOutflowType(transaction.type) ? formatAmount(displayAmount) : "";
    const credit = isIncomeType(transaction.type) ? formatAmount(displayAmount) : "";
    runningBalance += isIncomeType(transaction.type) ? displayAmount : -displayAmount;

    rows.push([
      String(index + 1),
      formatDateOnly(transaction.date),
      transaction.type,
      transaction.title,
      transaction.description ?? "",
      transaction.category,
      transaction.account,
      (transaction.tags ?? []).join("; "),
      (transaction.location ?? []).join("; "),
      transaction.notes ?? "",
      transaction.currency,
      formatAmount(transaction.amount),
      debit,
      credit,
      formatAmount(runningBalance),
    ]);
  });

  const totalDebit = sortedTransactions
    .filter((t) => isOutflowType(t.type))
    .reduce((sum, t) => sum + convertAmount(t.amount, t.currency), 0);
  const totalCredit = sortedTransactions
    .filter((t) => isIncomeType(t.type))
    .reduce((sum, t) => sum + convertAmount(t.amount, t.currency), 0);
  const closingBalance = runningBalance;

  rows.push([]);
  rows.push([
    "TOTALS",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    formatAmount(totalDebit),
    formatAmount(totalCredit),
    formatAmount(closingBalance),
  ]);
  rows.push([
    "",
    "",
    "",
    "CLOSING BALANCE",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    formatAmount(closingBalance),
  ]);

  return {
    rows,
    openingBalance,
    closingBalance,
    totalDebit,
    totalCredit,
    transactionCount: sortedTransactions.length,
  };
}

export function createSyncConvertAmount(
  displayCurrency: string,
  matrix?: ConversionRateMatrix
): ConvertAmountFn {
  return (amount: number, currency: string) =>
    convertCurrencySync(amount, currency, displayCurrency, matrix);
}
