import { Category, Expense } from "../types/financial";
import { BaseFormData } from "./formUtils";
import { SupportedCurrency } from "./currency";

export interface ExpenseSuggestion {
  fingerprint: string;
  displayTitle: string;
  categoryId: number;
  category: Category;
  medianAmount: number;
  currency: string;
  occurrenceCount: number;
  lastUsed: Date;
  score: number;
}

export interface ExpenseSuggestionOptions {
  months?: number;
  limit?: number;
  minOccurrences?: number;
  validCategoryIds?: Set<number>;
}

interface ExpenseGroup {
  fingerprint: string;
  displayTitle: string;
  categoryId: number;
  category: Category;
  amounts: number[];
  currencies: string[];
  dates: Date[];
  lastUsed: Date;
  hasRecurring: boolean;
}

function getMonthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

function filterExpensesByDateRange(
  expenses: Expense[],
  fromDate: Date
): Expense[] {
  return expenses.filter((expense) => {
    const expenseDate = new Date(expense.date);
    return expenseDate >= fromDate;
  });
}

export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildFingerprint(title: string, categoryId: number): string {
  return `${normalizeTitle(title)}|${categoryId}`;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function modeCurrency(currencies: string[]): string {
  if (currencies.length === 0) return "USD";
  const counts = new Map<string, number>();
  for (const currency of currencies) {
    counts.set(currency, (counts.get(currency) ?? 0) + 1);
  }
  let bestCurrency = currencies[currencies.length - 1]!;
  let bestCount = 0;
  for (const [currency, count] of counts.entries()) {
    if (count > bestCount) {
      bestCount = count;
      bestCurrency = currency;
    }
  }
  return bestCurrency;
}

function computeIntervalRegularity(dates: Date[]): number {
  if (dates.length < 3) return 0;

  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gapDays =
      (sorted[i]!.getTime() - sorted[i - 1]!.getTime()) / (1000 * 60 * 60 * 24);
    gaps.push(gapDays);
  }

  const medianGap = median(gaps);
  const expectedCadences = [7, 30];

  let bestMatch = 0;
  for (const cadence of expectedCadences) {
    const ratio = Math.min(medianGap, cadence) / Math.max(medianGap, cadence);
    bestMatch = Math.max(bestMatch, ratio);
  }

  return bestMatch;
}

function computeScore(
  occurrenceCount: number,
  lastUsed: Date,
  hasRecurring: boolean,
  dates: Date[],
  windowDays: number
): number {
  const countScore = Math.log1p(occurrenceCount);
  const daysSinceLast =
    (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 1 - daysSinceLast / windowDays);
  const recurringBoost = hasRecurring ? 0.15 : 0;
  const regularityBonus = computeIntervalRegularity(dates) * 0.1;

  return (
    countScore * 0.6 +
    recencyScore * 0.25 +
    recurringBoost +
    regularityBonus
  );
}

function groupExpenses(expenses: Expense[]): Map<string, ExpenseGroup> {
  const groups = new Map<string, ExpenseGroup>();

  for (const expense of expenses) {
    const categoryId = expense.categoryId ?? expense.category.id;
    const fingerprint = buildFingerprint(expense.title, categoryId);
    const expenseDate = new Date(expense.date);
    const existing = groups.get(fingerprint);

    if (!existing) {
      groups.set(fingerprint, {
        fingerprint,
        displayTitle: expense.title.trim(),
        categoryId,
        category: expense.category,
        amounts: [expense.amount],
        currencies: [expense.currency],
        dates: [expenseDate],
        lastUsed: expenseDate,
        hasRecurring: expense.isRecurring,
      });
      continue;
    }

    existing.amounts.push(expense.amount);
    existing.currencies.push(expense.currency);
    existing.dates.push(expenseDate);
    existing.hasRecurring = existing.hasRecurring || expense.isRecurring;

    if (expenseDate >= existing.lastUsed) {
      existing.displayTitle = expense.title.trim();
      existing.category = expense.category;
      existing.lastUsed = expenseDate;
    }
  }

  return groups;
}

export function getTopFrequentExpenseSuggestions(
  expenses: Expense[],
  options?: ExpenseSuggestionOptions
): ExpenseSuggestion[] {
  const {
    months = 3,
    limit = 5,
    minOccurrences = 2,
    validCategoryIds,
  } = options ?? {};

  const windowDays = months * 30;
  const fromDate = getMonthsAgo(months);
  const filtered = filterExpensesByDateRange(expenses, fromDate);
  const groups = groupExpenses(filtered);

  const suggestions: ExpenseSuggestion[] = [];

  for (const group of groups.values()) {
    if (group.amounts.length < minOccurrences) continue;
    if (validCategoryIds && !validCategoryIds.has(group.categoryId)) continue;

    suggestions.push({
      fingerprint: group.fingerprint,
      displayTitle: group.displayTitle,
      categoryId: group.categoryId,
      category: group.category,
      medianAmount: median(group.amounts),
      currency: modeCurrency(group.currencies),
      occurrenceCount: group.amounts.length,
      lastUsed: group.lastUsed,
      score: computeScore(
        group.amounts.length,
        group.lastUsed,
        group.hasRecurring,
        group.dates,
        windowDays
      ),
    });
  }

  suggestions.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.occurrenceCount !== b.occurrenceCount) {
      return b.occurrenceCount - a.occurrenceCount;
    }
    if (a.lastUsed.getTime() !== b.lastUsed.getTime()) {
      return b.lastUsed.getTime() - a.lastUsed.getTime();
    }
    return a.displayTitle.localeCompare(b.displayTitle);
  });

  return suggestions.slice(0, limit);
}

export function applySuggestionToFormData(
  form: BaseFormData,
  suggestion: ExpenseSuggestion
): BaseFormData {
  const currency = suggestion.currency as SupportedCurrency;

  return {
    ...form,
    title: suggestion.displayTitle,
    categoryId: String(suggestion.categoryId),
    amount: suggestion.medianAmount.toFixed(2),
    amountCurrency: currency,
  };
}
