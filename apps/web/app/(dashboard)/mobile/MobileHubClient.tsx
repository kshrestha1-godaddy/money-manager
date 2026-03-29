"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import { Income, Expense } from "../../types/financial";
import { PasswordInterface } from "../../types/passwords";
import { getIncomes } from "../incomes/actions/incomes";
import { getExpenses } from "../expenses/actions/expenses";
import { getPasswords } from "../passwords/actions/passwords";
import { getLifeEvents } from "../life-events/actions/life-events";
import { matchesLifeEventSearch } from "../life-events/life-event-helpers";
import type { LifeEventItem } from "../../types/life-event";
import { getUserInvestments } from "../investments/actions/investments";
import { getUserDebts } from "../debts/actions/debts";
import type { InvestmentInterface } from "../../types/investments";
import type { DebtInterface } from "../../types/debts";
import {
  getInvestmentTypeLabel,
  INVESTMENT_TYPE_LABELS,
} from "../investments/utils/investmentTypeUi";
import { MobileTransactionViewSheet } from "./components/mobile-transaction-view-sheet";
import { MobileLifeEventDetailSheet } from "./components/mobile-life-event-detail-sheet";
import { MobileLifeEventsTimeline } from "./components/mobile-life-events-timeline";
import { MobileInvestmentDetailSheet } from "./components/mobile-investment-detail-sheet";
import { MobileDebtDetailSheet } from "./components/mobile-debt-detail-sheet";
import {
  MobileGroupedTransactionList,
  groupTransactionsByYearAndMonth,
} from "./components/mobile-grouped-transaction-list";
import { PasswordTable } from "../passwords/components/PasswordTable";
import { useCurrency } from "../../providers/CurrencyProvider";
import { formatCurrency } from "../../utils/currency";
import { convertForDisplaySync } from "../../utils/currencyDisplay";
import { SUPPORTED_CURRENCIES } from "../../utils/currencyConversion";
import { LOADING_COLORS } from "../../config/colorConfig";
import { CurrencyConverterModal } from "../../components/CurrencyConverterModal";

type MobileTab =
  | "incomes"
  | "expenses"
  | "passwords"
  | "life-events"
  | "investments"
  | "debts";

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

function investmentMatchesQuery(inv: InvestmentInterface, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const parts = [
    inv.name,
    inv.symbol,
    inv.type,
    inv.notes,
    inv.account?.bankName,
    inv.account?.holderName,
    inv.investmentTarget?.nickname ?? "",
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  return parts.some((s) => s.includes(q));
}

function debtMatchesQuery(d: DebtInterface, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const parts = [
    d.borrowerName,
    d.purpose,
    d.notes,
    d.status,
    d.borrowerContact,
    d.borrowerEmail,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  return parts.some((s) => s.includes(q));
}

const DEBT_STATUS_ORDER: DebtInterface["status"][] = [
  "ACTIVE",
  "PARTIALLY_PAID",
  "OVERDUE",
  "DEFAULTED",
  "FULLY_PAID",
];

function debtStatusSectionLabel(status: DebtInterface["status"]): string {
  const map: Record<DebtInterface["status"], string> = {
    ACTIVE: "Active",
    PARTIALLY_PAID: "Partially paid",
    OVERDUE: "Overdue",
    DEFAULTED: "Defaulted",
    FULLY_PAID: "Fully paid",
  };
  return map[status];
}

function groupInvestmentsByType(items: InvestmentInterface[]): {
  type: InvestmentInterface["type"];
  label: string;
  items: InvestmentInterface[];
}[] {
  const map = new Map<InvestmentInterface["type"], InvestmentInterface[]>();
  for (const inv of items) {
    const t = inv.type;
    if (!map.has(t)) map.set(t, []);
    map.get(t)!.push(inv);
  }
  const ordered: InvestmentInterface["type"][] = [];
  for (const { value } of INVESTMENT_TYPE_LABELS) {
    if (map.has(value)) ordered.push(value);
  }
  for (const key of map.keys()) {
    if (!ordered.includes(key)) ordered.push(key);
  }
  return ordered.map((type) => ({
    type,
    label: getInvestmentTypeLabel(type),
    items: map.get(type)!,
  }));
}

function groupDebtsByStatus(items: DebtInterface[]): {
  status: DebtInterface["status"];
  label: string;
  items: DebtInterface[];
}[] {
  const map = new Map<DebtInterface["status"], DebtInterface[]>();
  for (const d of items) {
    if (!map.has(d.status)) map.set(d.status, []);
    map.get(d.status)!.push(d);
  }
  return DEBT_STATUS_ORDER.filter((s) => map.has(s)).map((status) => ({
    status,
    label: debtStatusSectionLabel(status),
    items: map.get(status)!,
  }));
}

export default function MobileHubClient() {
  const { currency: userCurrency } = useCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState(userCurrency);
  const [isCurrencyConverterOpen, setIsCurrencyConverterOpen] = useState(false);
  const [tab, setTab] = useState<MobileTab>("incomes");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCurrency(userCurrency);
  }, [userCurrency]);

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [passwords, setPasswords] = useState<PasswordInterface[]>([]);
  const [lifeEvents, setLifeEvents] = useState<LifeEventItem[]>([]);
  const [investments, setInvestments] = useState<InvestmentInterface[]>([]);
  const [debts, setDebts] = useState<DebtInterface[]>([]);

  const [incomeToView, setIncomeToView] = useState<Income | null>(null);
  const [expenseToView, setExpenseToView] = useState<Expense | null>(null);
  const [lifeEventToView, setLifeEventToView] = useState<LifeEventItem | null>(null);
  const [investmentToView, setInvestmentToView] = useState<InvestmentInterface | null>(null);
  const [debtToView, setDebtToView] = useState<DebtInterface | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const [inc, exp, pwd, le, invRes, debtRes] = await Promise.all([
        getIncomes(),
        getExpenses(),
        getPasswords(),
        getLifeEvents(),
        getUserInvestments(),
        getUserDebts(),
      ]);
      setIncomes(inc);
      setExpenses(exp);
      setPasswords(pwd);
      setLifeEvents(le);
      setInvestments(invRes.error ? [] : invRes.data ?? []);
      setDebts(debtRes.error ? [] : debtRes.data ?? []);
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

  const filteredLifeEvents = useMemo(
    () => lifeEvents.filter((e) => matchesLifeEventSearch(e, search)),
    [lifeEvents, search]
  );

  const filteredInvestments = useMemo(
    () => investments.filter((i) => investmentMatchesQuery(i, search)),
    [investments, search]
  );

  const filteredDebts = useMemo(
    () => debts.filter((d) => debtMatchesQuery(d, search)),
    [debts, search]
  );

  const incomesByYearMonth = useMemo(
    () => groupTransactionsByYearAndMonth(filteredIncomes),
    [filteredIncomes]
  );

  const expensesByYearMonth = useMemo(
    () => groupTransactionsByYearAndMonth(filteredExpenses),
    [filteredExpenses]
  );

  const investmentsByType = useMemo(
    () => groupInvestmentsByType(filteredInvestments),
    [filteredInvestments]
  );

  const debtsByStatus = useMemo(
    () => groupDebtsByStatus(filteredDebts),
    [filteredDebts]
  );

  function formatDisplayAmount(amount: number, storedCurrency: string): string {
    const converted = convertForDisplaySync(amount, storedCurrency, selectedCurrency);
    return formatCurrency(converted, selectedCurrency);
  }

  const tabs: {
    id: MobileTab;
    shortLabel: string;
    ariaLabel: string;
    count: number;
  }[] = [
    { id: "incomes", shortLabel: "Income", ariaLabel: "Incomes", count: filteredIncomes.length },
    { id: "expenses", shortLabel: "Expense", ariaLabel: "Expenses", count: filteredExpenses.length },
    { id: "passwords", shortLabel: "Pass", ariaLabel: "Passwords", count: filteredPasswords.length },
    { id: "life-events", shortLabel: "Life", ariaLabel: "Life events", count: filteredLifeEvents.length },
    { id: "investments", shortLabel: "Inv", ariaLabel: "Investments", count: filteredInvestments.length },
    { id: "debts", shortLabel: "Debt", ariaLabel: "Debts", count: filteredDebts.length },
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
          Search finances, passwords, life events, investments, and debts without the sidebar.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <label htmlFor="mobile-hub-display-currency" className="sr-only">
          Display currency for amounts
        </label>
        <select
          id="mobile-hub-display-currency"
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value)}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {SUPPORTED_CURRENCIES.map((currencyOption) => (
            <option key={currencyOption} value={currencyOption}>
              {currencyOption}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setIsCurrencyConverterOpen(true)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          title="Currency converter"
        >
          <ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden />
          <span className="sr-only">Open currency converter</span>
        </button>
      </div>

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
              : tab === "life-events"
                ? "Search title, tags, location, link…"
                : tab === "investments"
                  ? "Search name, symbol, type, notes…"
                  : tab === "debts"
                    ? "Search borrower, purpose, status…"
                    : "Search title, category, notes…"
          }
          className="w-full min-h-[48px] rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>

      <div
        className="grid w-full min-w-0 grid-cols-3 gap-1.5"
        role="tablist"
        aria-label="Data type"
      >
        {tabs.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`${t.ariaLabel}, ${t.count} items`}
              onClick={() => setTab(t.id)}
              className={`flex min-h-[44px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-1.5 text-center transition-colors ${
                isActive
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
              }`}
            >
              <span className="text-[11px] font-semibold leading-tight sm:text-xs">{t.shortLabel}</span>
              <span
                className={`tabular-nums text-[10px] leading-none sm:text-[11px] ${
                  isActive ? "text-white/90" : "text-gray-500"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      <hr className="w-full border-0 border-t border-gray-200" role="separator" aria-hidden="true" />

      {tab === "incomes" && (
        <section aria-label="Incomes" className="space-y-3">
          {filteredIncomes.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">
              {search.trim() ? "No incomes match your search." : "No incomes yet."}
            </p>
          ) : (
            <MobileGroupedTransactionList
              grouped={incomesByYearMonth}
              variant="income"
              formatAmount={(item) => formatDisplayAmount(item.amount, item.currency)}
              onItemClick={setIncomeToView}
            />
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
            <MobileGroupedTransactionList
              grouped={expensesByYearMonth}
              variant="expense"
              formatAmount={(item) => formatDisplayAmount(item.amount, item.currency)}
              onItemClick={setExpenseToView}
            />
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

      {tab === "life-events" && (
        <section aria-label="Life events" className="space-y-3">
          {filteredLifeEvents.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">
              {search.trim() ? "No life events match your search." : "No life events yet."}
            </p>
          ) : (
            <MobileLifeEventsTimeline
              events={filteredLifeEvents}
              onEventClick={(ev) => setLifeEventToView(ev)}
            />
          )}
        </section>
      )}

      {tab === "investments" && (
        <section aria-label="Investments" className="space-y-3">
          {filteredInvestments.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">
              {search.trim() ? "No investments match your search." : "No investments yet."}
            </p>
          ) : (
            <div className="space-y-5">
              {investmentsByType.map((group, groupIndex) => (
                <div key={group.type}>
                  <h3
                    className={`mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 ${
                      groupIndex > 0 ? "mt-1" : ""
                    }`}
                  >
                    {group.label}{" "}
                    <span className="font-normal tabular-nums text-gray-400">({group.items.length})</span>
                  </h3>
                  <ul className="space-y-2">
                    {group.items.map((inv) => {
                      const totalValue = inv.quantity * inv.currentPrice;
                      const subtitle = [inv.symbol, inv.account?.holderName]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <li key={inv.id}>
                          <button
                            type="button"
                            onClick={() => setInvestmentToView(inv)}
                            className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm min-h-[72px] active:bg-gray-50 transition-colors"
                          >
                            <div className="flex justify-between gap-3 items-start">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900 line-clamp-2">{inv.name}</p>
                                {subtitle ? (
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{subtitle}</p>
                                ) : null}
                              </div>
                              <span className="shrink-0 text-base font-semibold text-slate-800 tabular-nums">
                                {formatCurrency(totalValue, selectedCurrency)}
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "debts" && (
        <section aria-label="Debts" className="space-y-3">
          {filteredDebts.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">
              {search.trim() ? "No debts match your search." : "No debts yet."}
            </p>
          ) : (
            <div className="space-y-5">
              {debtsByStatus.map((group, groupIndex) => (
                <div key={group.status}>
                  <h3
                    className={`mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 ${
                      groupIndex > 0 ? "mt-1" : ""
                    }`}
                  >
                    {group.label}{" "}
                    <span className="font-normal tabular-nums text-gray-400">({group.items.length})</span>
                  </h3>
                  <ul className="space-y-2">
                    {group.items.map((debt) => (
                      <li key={debt.id}>
                        <button
                          type="button"
                          onClick={() => setDebtToView(debt)}
                          className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm min-h-[72px] active:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between gap-3 items-start">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 truncate">{debt.borrowerName}</p>
                              {debt.purpose ? (
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{debt.purpose}</p>
                              ) : null}
                            </div>
                            <span className="shrink-0 text-base font-semibold text-amber-800 tabular-nums">
                              {formatCurrency(debt.amount, selectedCurrency)}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
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

      <MobileLifeEventDetailSheet
        event={lifeEventToView}
        isOpen={lifeEventToView !== null}
        onClose={() => setLifeEventToView(null)}
      />

      <MobileInvestmentDetailSheet
        investment={investmentToView}
        isOpen={investmentToView !== null}
        onClose={() => setInvestmentToView(null)}
        displayCurrency={selectedCurrency}
      />

      <MobileDebtDetailSheet
        debt={debtToView}
        isOpen={debtToView !== null}
        onClose={() => setDebtToView(null)}
        displayCurrency={selectedCurrency}
      />

      <CurrencyConverterModal
        isOpen={isCurrencyConverterOpen}
        onClose={() => setIsCurrencyConverterOpen(false)}
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
