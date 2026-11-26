/**
 * Formats a user's financial records into the compact markdown block that is
 * injected into the AI chat system prompt.
 *
 * The chat context is deliberately limited to four fields per row — date,
 * category, amount and currency — so the model receives spending shape without
 * titles, counterparty names, account numbers or holdings detail.
 */

export interface FinancialDataSummary {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
  period: string;
  currency: string;
  // New fields for debts, investments, and net worth
  totalDebtAmount?: number;
  totalDebtRemaining?: number;
  totalInvestmentCost?: number;
  totalInvestmentValue?: number;
  totalInvestmentGain?: number;
  netWorthData?: {
    totalAccountBalance: number;
    totalInvestmentValue: number;
    totalInvestmentCost: number;
    totalInvestmentGain: number;
    totalInvestmentGainPercentage: number;
    totalMoneyLent: number;
    totalAssets: number;
    netWorth: number;
    asOfDate: Date;
  } | null;
  // Investment targets fields
  totalTargetAmount?: number;
  totalTargetProgress?: number;
  completedTargets?: number;
  overdueTargets?: number;
  averageProgress?: number;
  // Accounts fields
  totalAccountBalance?: number; // Total balance across all bank accounts (gross)
  totalFreeBalance?: number; // Total available balance after subtracting withheld amounts
  totalWithheldAmount?: number; // Total amount withheld from bank accounts for investments
  accountsCount?: number;
  // Budget targets fields
  totalBudgetTargets?: number;
  totalBudgetAmount?: number;
  totalBudgetUtilization?: number;
  activeBudgetTargets?: number;
  overBudgetTargets?: number;
}

/** A record carrying its category as a related object, as incomes and expenses do. */
interface CategorizedRecord {
  date: Date | string;
  amount: number;
  currency: string;
  category: { name: string };
}

/** A record carrying its category name inline, as the combined transaction view does. */
interface TransactionRecord {
  date: Date | string;
  amount: number;
  currency: string;
  category: string;
}

/** A single row of chat context: the only shape the model is given. */
interface ContextRow {
  date: string;
  category: string;
  amount: number;
  currency: string;
}

/**
 * Render a date as `YYYY-MM-DD` so the model can do date arithmetic unambiguously.
 *
 * Uses the server's local calendar fields rather than `toISOString`, which would
 * shift a record back a day for any timezone ahead of UTC and misreport the
 * date the user actually recorded.
 *
 * @param value - A Date instance or any string Date can parse.
 * @returns The local calendar date, or the original string if it is unparseable.
 */
function toIsoDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Reduce an income or expense record to a context row.
 *
 * @param record - The record to normalize.
 * @returns The four fields the chat context exposes.
 */
function fromCategorized(record: CategorizedRecord): ContextRow {
  return {
    date: toIsoDate(record.date),
    category: record.category?.name ?? "Uncategorized",
    amount: record.amount,
    currency: record.currency,
  };
}

/**
 * Reduce a combined transaction record to a context row.
 *
 * @param record - The record to normalize.
 * @returns The four fields the chat context exposes.
 */
function fromTransaction(record: TransactionRecord): ContextRow {
  return {
    date: toIsoDate(record.date),
    category: record.category || "Uncategorized",
    amount: record.amount,
    currency: record.currency,
  };
}

/**
 * Render context rows as a markdown table under their own heading.
 *
 * @param heading - Section heading, excluding the item count.
 * @param rows - Rows to render; an empty list renders nothing.
 * @returns A markdown section, or an empty string when there are no rows.
 */
function renderTable(heading: string, rows: ContextRow[]): string {
  if (rows.length === 0) return "";

  const header = `## ${heading} (${rows.length} items)\n\n`
    + `| Date | Category | Amount | Currency |\n`
    + `|------|----------|--------|----------|\n`;

  const body = rows
    .map((row) => `| ${row.date} | ${row.category} | ${row.amount.toFixed(2)} | ${row.currency} |\n`)
    .join("");

  return `${header}${body}\n`;
}

/**
 * Build the markdown financial context for the AI chat system prompt.
 *
 * Amounts are the records' own values in their own currency; no conversion is
 * applied, so rows of differing currencies must not be summed together.
 *
 * @param incomes - Income records for the period.
 * @param expenses - Expense records for the period.
 * @param transactions - Combined income and expense records for the period.
 * @param period - Human-readable description of the date range.
 * @returns The markdown block to embed in the system prompt.
 */
export function formatFinancialDataAsMarkdown(
  incomes: CategorizedRecord[],
  expenses: CategorizedRecord[],
  transactions: TransactionRecord[],
  period: string,
): string {
  return `# Financial Data for ${period}\n\n`
    + renderTable("Income", incomes.map(fromCategorized))
    + renderTable("Expenses", expenses.map(fromCategorized))
    + renderTable("All Transactions", transactions.map(fromTransaction));
}

// Predefined date range helpers
export function getDateRangePresets() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  return {
    thisMonth: {
      startDate: new Date(currentYear, currentMonth, 1),
      endDate: new Date(currentYear, currentMonth + 1, 0),
      label: "This Month"
    },
    lastMonth: {
      startDate: new Date(currentYear, currentMonth - 1, 1),
      endDate: new Date(currentYear, currentMonth, 0),
      label: "Last Month"
    },
    thisQuarter: {
      startDate: new Date(currentYear, Math.floor(currentMonth / 3) * 3, 1),
      endDate: new Date(currentYear, Math.floor(currentMonth / 3) * 3 + 3, 0),
      label: "This Quarter"
    },
    thisYear: {
      startDate: new Date(currentYear, 0, 1),
      endDate: new Date(currentYear, 11, 31),
      label: "This Year"
    },
    lastYear: {
      startDate: new Date(currentYear - 1, 0, 1),
      endDate: new Date(currentYear - 1, 11, 31),
      label: "Last Year"
    },
    last30Days: {
      startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      endDate: now,
      label: "Last 30 Days"
    },
    last90Days: {
      startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      endDate: now,
      label: "Last 90 Days"
    }
  };
}
