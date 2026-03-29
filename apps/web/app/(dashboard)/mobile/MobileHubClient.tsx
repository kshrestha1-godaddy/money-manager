"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Income, Expense } from "../../types/financial";
import { PasswordInterface } from "../../types/passwords";
import { getIncomes } from "../incomes/actions/incomes";
import { getExpenses } from "../expenses/actions/expenses";
import { getPasswords } from "../passwords/actions/passwords";
import { MobileTransactionViewSheet } from "./components/mobile-transaction-view-sheet";
import { PasswordTable } from "../passwords/components/PasswordTable";
import { useCurrency } from "../../providers/CurrencyProvider";
import { formatCurrency } from "../../utils/currency";
import { convertForDisplaySync } from "../../utils/currencyDisplay";
import { formatDate } from "../../utils/date";
import { LOADING_COLORS } from "../../config/colorConfig";

type MobileTab = "incomes" | "expenses" | "passwords";

const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

function transactionMatchesQuery(item: Income | Expense, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const parts = [
    item.title,
    item.description,
    item.notes,
    item.category?.name,
    item.account?.name,
    ...(item.tags || []),
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  return parts.some((p) => p.includes(q));
}

function passwordMatchesQuery(p: PasswordInterface, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const parts = [
    p.websiteName,
    p.description,
    p.username,
    p.category,
    p.notes,
    ...(p.tags || []),
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  return parts.some((s) => s.includes(q));
}

export default function MobileHubClient() {
  const { currency: userCurrency } = useCurrency();
  const [tab, setTab] = useState<MobileTab>("incomes");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [passwords, setPasswords] = useState<PasswordInterface[]>([]);

  const [incomeToView, setIncomeToView] = useState<Income | null>(null);
  const [expenseToView, setExpenseToView] = useState<Expense | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const [inc, exp, pwd] = await Promise.all([
        getIncomes(),
        getExpenses(),
        getPasswords(),
      ]);
      setIncomes(inc);
      setExpenses(exp);
      setPasswords(pwd);
    } catch (e) {
      console.error(e);
      setLoadError("Could not load your data. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredIncomes = useMemo(
    () => incomes.filter((i) => transactionMatchesQuery(i, search)),
    [incomes, search]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => transactionMatchesQuery(e, search)),
    [expenses, search]
  );

  const filteredPasswords = useMemo(
    () => passwords.filter((p) => passwordMatchesQuery(p, search)),
    [passwords, search]
  );

  function formatDisplayAmount(amount: number, storedCurrency: string): string {
    const converted = convertForDisplaySync(amount, storedCurrency, userCurrency);
    return formatCurrency(converted, userCurrency);
  }

  const tabs: { id: MobileTab; label: string; count: number }[] = [
    { id: "incomes", label: "Incomes", count: filteredIncomes.length },
    { id: "expenses", label: "Expenses", count: filteredExpenses.length },
    { id: "passwords", label: "Passwords", count: filteredPasswords.length },
  ];

  if (loading) {
    return (
      <div className={loadingContainer}>
        <div className={loadingSpinner} />
        <p className={loadingText}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg w-full min-w-0 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Mobile hub</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Search incomes, expenses, and passwords without the sidebar.
        </p>
      </header>

      {loadError && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          {loadError}
          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-2 block w-full rounded-lg bg-amber-100 px-3 py-2.5 font-medium text-amber-950 min-h-[44px]"
          >
            Retry
          </button>
        </div>
      )}

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 pointer-events-none"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            tab === "passwords"
              ? "Search name, username, notes…"
              : "Search title, category, notes…"
          }
          className="w-full min-h-[48px] rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium min-h-[44px] transition-colors ${
                isActive
                  ? "bg-brand-600 text-white shadow"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 tabular-nums ${isActive ? "text-white/90" : "text-gray-500"}`}>
                ({t.count})
              </span>
            </button>
          );
        })}
      </div>

      {tab === "incomes" && (
        <section aria-label="Incomes" className="space-y-3">
          {filteredIncomes.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">
              {search.trim() ? "No incomes match your search." : "No incomes yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredIncomes.map((income) => (
                <li key={income.id}>
                  <button
                    type="button"
                    onClick={() => setIncomeToView(income)}
                    className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm min-h-[72px] active:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between gap-3 items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{income.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(income.date)}
                          {income.category?.name ? ` · ${income.category.name}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-base font-semibold text-emerald-700 tabular-nums">
                        {formatDisplayAmount(income.amount, income.currency)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "expenses" && (
        <section aria-label="Expenses" className="space-y-3">
          {filteredExpenses.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">
              {search.trim() ? "No expenses match your search." : "No expenses yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredExpenses.map((expense) => (
                <li key={expense.id}>
                  <button
                    type="button"
                    onClick={() => setExpenseToView(expense)}
                    className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm min-h-[72px] active:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between gap-3 items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{expense.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(expense.date)}
                          {expense.category?.name ? ` · ${expense.category.name}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-base font-semibold text-red-700 tabular-nums">
                        {formatDisplayAmount(expense.amount, expense.currency)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "passwords" && (
        <section aria-label="Passwords" className="space-y-3">
          {filteredPasswords.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">
              {search.trim() ? "No passwords match your search." : "No passwords stored yet."}
            </p>
          ) : (
            <PasswordTable
              passwords={filteredPasswords}
              hideHeader
              hideCategoryColumn={false}
              forceCardLayout
            />
          )}
        </section>
      )}

      <MobileTransactionViewSheet
        transaction={incomeToView}
        transactionType="INCOME"
        isOpen={incomeToView !== null}
        onClose={() => setIncomeToView(null)}
      />

      <MobileTransactionViewSheet
        transaction={expenseToView}
        transactionType="EXPENSE"
        isOpen={expenseToView !== null}
        onClose={() => setExpenseToView(null)}
      />

      <p className="text-center text-xs text-gray-400 pt-2">
        <button
          type="button"
          className="text-brand-600 font-medium min-h-[44px] px-2"
          onClick={() => void loadData()}
        >
          Refresh data
        </button>
      </p>
    </div>
  );
}
