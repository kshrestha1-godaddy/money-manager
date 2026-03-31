"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ScheduledPaymentItem } from "../../types/scheduled-payment";
import { getScheduledPayments } from "../scheduled-payments/actions/scheduled-payments";
import {
  accountDisplay,
  matchesSearch,
  recurringDisplay,
} from "../scheduled-payments/scheduled-payment-helpers";
import { ArrowLeftRight, ChevronDown, Plus, Search } from "lucide-react";
import { Income, Expense, type Category } from "../../types/financial";
import { PasswordInterface } from "../../types/passwords";
import { getIncomes } from "../incomes/actions/incomes";
import { getExpenses } from "../expenses/actions/expenses";
import { getPasswords } from "../passwords/actions/passwords";
import { getLifeEvents } from "../life-events/actions/life-events";
import { matchesLifeEventSearch } from "../life-events/life-event-helpers";
import type { LifeEventItem } from "../../types/life-event";
import { getUserInvestments } from "../investments/actions/investments";
import { getUserDebts } from "../debts/actions/debts";
import { getUserAccounts, getWithheldAmountsByBank } from "../accounts/actions/accounts";
import type { AccountInterface } from "../../types/accounts";
import type { InvestmentInterface } from "../../types/investments";
import type { DebtInterface } from "../../types/debts";
import {
  getInvestmentTypeLabel,
  INVESTMENT_TYPE_LABELS,
} from "../investments/utils/investmentTypeUi";
import { sortInvestmentsByTargetCompletionAsc } from "../investments/utils/investmentTargetSort";
import { MobileTransactionViewSheet } from "./components/mobile-transaction-view-sheet";
import { MobileLifeEventDetailSheet } from "./components/mobile-life-event-detail-sheet";
import { MobileLifeEventsTimeline } from "./components/mobile-life-events-timeline";
import { MobileInvestmentDetailSheet } from "./components/mobile-investment-detail-sheet";
import { MobileDebtDetailSheet } from "./components/mobile-debt-detail-sheet";
import {
  MobileGroupedTransactionList,
  groupTransactionsByYearAndMonth,
} from "./components/mobile-grouped-transaction-list";
import { MobileCategoryPieChart } from "./components/mobile-category-pie-chart";
import {
  MobileScheduledPaymentsList,
  groupScheduledPaymentsByYearAndMonth,
} from "./components/mobile-scheduled-payments-list";
import { MobileScheduledPaymentDetailSheet } from "./components/mobile-scheduled-payment-detail-sheet";
import { MobileAccountDetailSheet } from "./components/mobile-account-detail-sheet";
import { MobileAddIncomeSheet } from "./components/mobile-add-income-sheet";
import { MobileAddExpenseSheet } from "./components/mobile-add-expense-sheet";
import { MobileSchedulePaymentSheet } from "./components/mobile-schedule-payment-sheet";
import { MobileAddInvestmentSheet } from "./components/mobile-add-investment-sheet";
import { MobileAddDebtSheet } from "./components/mobile-add-debt-sheet";
import { MobileAddNoteSheet } from "./components/mobile-add-note-sheet";
import { MobileNoteDetailSheet } from "./components/mobile-note-detail-sheet";
import { getArchivedNotes, getNotes } from "../notes/actions/notes";
import { MobileAccountFreeWithheldBar } from "./components/mobile-account-free-withheld-bar";
import { computeAccountFreeBalance } from "./utils/account-free-balance";
import { PasswordTable } from "../passwords/components/PasswordTable";
import type { Note } from "@prisma/client";
import { useCurrency } from "../../providers/CurrencyProvider";
import { formatCurrency } from "../../utils/currency";
import { convertForDisplaySync } from "../../utils/currencyDisplay";
import { SUPPORTED_CURRENCIES } from "../../utils/currencyConversion";
import { calculateRemainingWithInterest } from "../../utils/interestCalculation";
import { getCategoriesWithFrequency } from "../../utils/categoryFrequency";
import { getCategories } from "../../actions/categories";
import { LOADING_COLORS } from "../../config/colorConfig";
import { CurrencyConverterModal } from "../../components/CurrencyConverterModal";
import { formatLockCountdown, useAppLock } from "../../providers/AppLockProvider";

type MobileTab =
  | "incomes"
  | "expenses"
  | "accounts"
  | "scheduled-payments"
  | "passwords"
  | "life-events"
  | "investments"
  | "debts"
  | "notes";

function scheduledPaymentStatusLabel(p: ScheduledPaymentItem, now: Date): string {
  if (p.resolution === "ACCEPTED") return "Accepted";
  if (p.resolution === "REJECTED") return "Rejected";
  if (p.scheduledAt > now) return "Upcoming";
  return "Awaiting confirmation";
}

function scheduledPaymentMatchesQuery(p: ScheduledPaymentItem, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  if (matchesSearch(p, raw)) return true;
  const now = new Date();
  const hay = [
    p.category.name,
    accountDisplay(p),
    recurringDisplay(p),
    scheduledPaymentStatusLabel(p, now),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

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
    item.account?.nickname,
    item.account?.bankName,
    item.account?.holderName,
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

function noteMatchesQuery(note: Note, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  if (note.title.toLowerCase().includes(q)) return true;
  if (note.content?.toLowerCase().includes(q)) return true;
  if (note.tags.some((t) => t.toLowerCase().includes(q))) return true;
  return false;
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

function accountMatchesQuery(a: AccountInterface, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const parts = [
    a.bankName,
    a.holderName,
    a.nickname,
    a.accountNumber,
    a.accountType,
    a.branchName,
    a.branchCode,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  return parts.some((p) => p.includes(q));
}

function accountsFromResponse(
  res: Awaited<ReturnType<typeof getUserAccounts>>
): AccountInterface[] {
  if (Array.isArray(res)) return res;
  return [];
}

function groupAccountsByBank(items: AccountInterface[]): {
  bank: string;
  items: AccountInterface[];
}[] {
  const map = new Map<string, AccountInterface[]>();
  for (const a of items) {
    const key = a.bankName?.trim() || "Other";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  const banks = [...map.keys()].sort((x, y) => x.localeCompare(y));
  return banks.map((bank) => ({
    bank,
    items: map.get(bank)!.sort((x, y) => {
      const ax = (x.nickname || x.holderName).toLowerCase();
      const ay = (y.nickname || y.holderName).toLowerCase();
      return ax.localeCompare(ay);
    }),
  }));
}

function maskAccountNumberShort(num: string): string {
  const s = String(num).trim();
  if (s.length <= 4) return s;
  return `****${s.slice(-4)}`;
}

function formatDebtCardDate(d: Date | string): string {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return x.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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
    items: sortInvestmentsByTargetCompletionAsc(map.get(type)!),
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
  const { isUnlocked, remainingMs } = useAppLock();
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
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPaymentItem[]>([]);
  const [passwords, setPasswords] = useState<PasswordInterface[]>([]);
  const [lifeEvents, setLifeEvents] = useState<LifeEventItem[]>([]);
  const [investments, setInvestments] = useState<InvestmentInterface[]>([]);
  const [debts, setDebts] = useState<DebtInterface[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [archivedNotes, setArchivedNotes] = useState<Note[]>([]);
  const [showArchivedNotes, setShowArchivedNotes] = useState(false);
  const [accounts, setAccounts] = useState<AccountInterface[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [withheldAmountsByBank, setWithheldAmountsByBank] = useState<Record<string, number>>({});

  const [incomeToView, setIncomeToView] = useState<Income | null>(null);
  const [incomeToEdit, setIncomeToEdit] = useState<Income | null>(null);
  const [expenseToView, setExpenseToView] = useState<Expense | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [lifeEventToView, setLifeEventToView] = useState<LifeEventItem | null>(null);
  const [investmentToView, setInvestmentToView] = useState<InvestmentInterface | null>(null);
  const [debtToView, setDebtToView] = useState<DebtInterface | null>(null);
  const [debtsFullyPaidExpanded, setDebtsFullyPaidExpanded] = useState(false);
  const [scheduledPaymentToView, setScheduledPaymentToView] = useState<ScheduledPaymentItem | null>(
    null
  );
  const [accountToView, setAccountToView] = useState<AccountInterface | null>(null);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSchedulePaymentOpen, setIsSchedulePaymentOpen] = useState(false);
  const [isAddInvestmentOpen, setIsAddInvestmentOpen] = useState(false);
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [noteToView, setNoteToView] = useState<Note | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const [
        inc,
        exp,
        sp,
        pwd,
        le,
        invRes,
        debtRes,
        accRes,
        withheldByBank,
        incomeCats,
        expenseCats,
        notesData,
        archivedNotesData,
      ] = await Promise.all([
        getIncomes(),
        getExpenses(),
        getScheduledPayments(),
        getPasswords(),
        getLifeEvents(),
        getUserInvestments(),
        getUserDebts(),
        getUserAccounts(),
        getWithheldAmountsByBank(),
        getCategories("INCOME"),
        getCategories("EXPENSE"),
        getNotes(),
        getArchivedNotes(),
      ]);
      setIncomes(inc);
      setExpenses(exp);
      setScheduledPayments(sp);
      setPasswords(pwd);
      setLifeEvents(le);
      setInvestments(invRes.error ? [] : invRes.data ?? []);
      setDebts(debtRes.error ? [] : debtRes.data ?? []);
      setNotes(Array.isArray(notesData) ? notesData : []);
      setArchivedNotes(Array.isArray(archivedNotesData) ? archivedNotesData : []);
      setAccounts(accountsFromResponse(accRes));
      setIncomeCategories(incomeCats);
      setExpenseCategories(expenseCats);
      setWithheldAmountsByBank(withheldByBank ?? {});
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

  const incomeCategoriesWithFrequency = useMemo(
    () => getCategoriesWithFrequency(incomeCategories, incomes),
    [incomeCategories, incomes]
  );

  const expenseCategoriesWithFrequency = useMemo(
    () => getCategoriesWithFrequency(expenseCategories, expenses),
    [expenseCategories, expenses]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => transactionMatchesQuery(e, search)),
    [expenses, search]
  );

  const filteredScheduledPayments = useMemo(
    () => scheduledPayments.filter((p) => scheduledPaymentMatchesQuery(p, search)),
    [scheduledPayments, search]
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

  const filteredNotes = useMemo(() => {
    const source = showArchivedNotes ? archivedNotes : notes;
    return source.filter((n) => noteMatchesQuery(n, search));
  }, [notes, archivedNotes, showArchivedNotes, search]);

  const filteredAccounts = useMemo(
    () => accounts.filter((a) => accountMatchesQuery(a, search)),
    [accounts, search]
  );

  const incomesByYearMonth = useMemo(
    () => groupTransactionsByYearAndMonth(filteredIncomes),
    [filteredIncomes]
  );

  const expensesByYearMonth = useMemo(
    () => groupTransactionsByYearAndMonth(filteredExpenses),
    [filteredExpenses]
  );

  const scheduledPaymentsByYearMonth = useMemo(
    () => groupScheduledPaymentsByYearAndMonth(filteredScheduledPayments),
    [filteredScheduledPayments]
  );

  const investmentsByType = useMemo(
    () => groupInvestmentsByType(filteredInvestments),
    [filteredInvestments]
  );

  const debtsByStatus = useMemo(
    () => groupDebtsByStatus(filteredDebts),
    [filteredDebts]
  );

  const accountsByBank = useMemo(
    () => groupAccountsByBank(filteredAccounts),
    [filteredAccounts]
  );

  const filteredIncomesTotalFormatted = useMemo(() => {
    const sum = filteredIncomes.reduce(
      (acc, item) => acc + convertForDisplaySync(item.amount, item.currency, selectedCurrency),
      0
    );
    return formatCurrency(sum, selectedCurrency);
  }, [filteredIncomes, selectedCurrency]);

  const filteredExpensesTotalFormatted = useMemo(() => {
    const sum = filteredExpenses.reduce(
      (acc, item) => acc + convertForDisplaySync(item.amount, item.currency, selectedCurrency),
      0
    );
    return formatCurrency(sum, selectedCurrency);
  }, [filteredExpenses, selectedCurrency]);

  const filteredScheduledPaymentsTotalFormatted = useMemo(() => {
    const sum = filteredScheduledPayments.reduce(
      (acc, item) => acc + convertForDisplaySync(item.amount, item.currency, selectedCurrency),
      0
    );
    return formatCurrency(sum, selectedCurrency);
  }, [filteredScheduledPayments, selectedCurrency]);

  const filteredAccountsTotalFormatted = useMemo(() => {
    const sum = filteredAccounts.reduce(
      (acc, item) =>
        acc + convertForDisplaySync(item.balance ?? 0, userCurrency, selectedCurrency),
      0
    );
    return formatCurrency(sum, selectedCurrency);
  }, [filteredAccounts, selectedCurrency, userCurrency]);

  const accountsFreeWithheldDisplay = useMemo(() => {
    if (filteredAccounts.length === 0) {
      return { free: 0, withheld: 0 };
    }
    let freeSum = 0;
    let withheldSum = 0;
    for (const a of filteredAccounts) {
      const bal = a.balance ?? 0;
      const free = computeAccountFreeBalance(a, accounts, withheldAmountsByBank);
      freeSum += convertForDisplaySync(free, userCurrency, selectedCurrency);
      withheldSum += convertForDisplaySync(bal - free, userCurrency, selectedCurrency);
    }
    return { free: freeSum, withheld: withheldSum };
  }, [filteredAccounts, accounts, withheldAmountsByBank, userCurrency, selectedCurrency]);

  function formatDisplayAmount(amount: number, storedCurrency: string): string {
    const converted = convertForDisplaySync(amount, storedCurrency, selectedCurrency);
    return formatCurrency(converted, selectedCurrency);
  }

  function formatAccountBalanceForDisplay(balance: number | undefined): string {
    if (balance === undefined) return "—";
    const converted = convertForDisplaySync(balance, userCurrency, selectedCurrency);
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
    { id: "accounts", shortLabel: "Acct", ariaLabel: "Accounts", count: filteredAccounts.length },
    {
      id: "scheduled-payments",
      shortLabel: "Sched",
      ariaLabel: "Scheduled payments",
      count: filteredScheduledPayments.length,
    },
    { id: "passwords", shortLabel: "Pass", ariaLabel: "Passwords", count: filteredPasswords.length },
    { id: "life-events", shortLabel: "Life", ariaLabel: "Life events", count: filteredLifeEvents.length },
    { id: "investments", shortLabel: "Inv", ariaLabel: "Investments", count: filteredInvestments.length },
    { id: "debts", shortLabel: "Debt", ariaLabel: "Debts", count: filteredDebts.length },
    { id: "notes", shortLabel: "Notes", ariaLabel: "Notes", count: filteredNotes.length },
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
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">My Money Log [Mobile hub]</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Search finances, accounts, scheduled payments, passwords, life events, investments,
          debts, and notes without the sidebar.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          {isUnlocked ? (
            <div
              className="inline-flex max-w-full items-center rounded-full bg-blue-50 px-2.5 py-1.5"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="truncate text-[11px] font-semibold tabular-nums text-blue-800 sm:text-xs">
                Auto lock in {formatLockCountdown(remainingMs)}
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
                    : tab === "notes"
                      ? "Search title, content, tags…"
                    : tab === "accounts"
                      ? "Search bank, holder, account type…"
                      : tab === "scheduled-payments"
                        ? "Search title, category, account, status…"
                        : "Search title, category, notes…"
          }
          className="w-full min-h-[48px] rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>

      <hr className="w-full border-0 border-t border-gray-200" role="separator" aria-hidden="true" />

      <div
        className="grid w-full min-w-0 grid-cols-3 gap-1.5 sm:grid-cols-4"
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
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddIncomeOpen(true)}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 active:bg-brand-800"
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  Add income
                </button>
              </div>
              <p className="text-center text-gray-500 py-10 text-sm">
                {search.trim() ? "No incomes match your search." : "No incomes yet."}
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <MobileCategoryPieChart
                type="income"
                transactions={filteredIncomes}
                displayCurrency={selectedCurrency}
              />
              <MobileGroupedTransactionList
                grouped={incomesByYearMonth}
                variant="income"
                formatAmount={(item) => formatDisplayAmount(item.amount, item.currency)}
                onItemClick={setIncomeToView}
                toolbarLeading={
                  <button
                    type="button"
                    onClick={() => setIsAddIncomeOpen(true)}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 active:bg-brand-800"
                  >
                    <Plus className="h-4 w-4 shrink-0" aria-hidden />
                    Add income
                  </button>
                }
              />
              <div
                className="flex items-center justify-between gap-3 rounded-xl bg-gray-50/90 px-4 py-3"
                role="region"
                aria-label="Filtered incomes total"
              >
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-base font-semibold tabular-nums text-emerald-700">
                  {filteredIncomesTotalFormatted}
                </span>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "expenses" && (
        <section aria-label="Expenses" className="space-y-3">
          {filteredExpenses.length === 0 ? (
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(true)}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 active:bg-red-800"
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  Add expense
                </button>
              </div>
              <p className="text-center text-gray-500 py-10 text-sm">
                {search.trim() ? "No expenses match your search." : "No expenses yet."}
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <MobileCategoryPieChart
                type="expense"
                transactions={filteredExpenses}
                displayCurrency={selectedCurrency}
              />
              <MobileGroupedTransactionList
                grouped={expensesByYearMonth}
                variant="expense"
                formatAmount={(item) => formatDisplayAmount(item.amount, item.currency)}
                onItemClick={setExpenseToView}
                toolbarLeading={
                  <button
                    type="button"
                    onClick={() => setIsAddExpenseOpen(true)}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 active:bg-red-800"
                  >
                    <Plus className="h-4 w-4 shrink-0" aria-hidden />
                    Add expense
                  </button>
                }
              />
              <div
                className="flex items-center justify-between gap-3 rounded-xl bg-gray-50/90 px-4 py-3"
                role="region"
                aria-label="Filtered expenses total"
              >
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-base font-semibold tabular-nums text-red-700">
                  {filteredExpensesTotalFormatted}
                </span>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "accounts" && (
        <section aria-label="Accounts" className="space-y-3">
          {filteredAccounts.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">
              {search.trim() ? "No accounts match your search." : "No accounts yet."}
            </p>
          ) : (
            <div className="space-y-5">
              <MobileAccountFreeWithheldBar
                freeAmount={accountsFreeWithheldDisplay.free}
                withheldAmount={accountsFreeWithheldDisplay.withheld}
                displayCurrency={selectedCurrency}
              />
              {accountsByBank.map((group, groupIndex) => (
                <div key={group.bank}>
                  <h3
                    className={`mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 ${
                      groupIndex > 0 ? "mt-1" : ""
                    }`}
                  >
                    {group.bank}{" "}
                    <span className="font-normal tabular-nums text-gray-400">({group.items.length})</span>
                  </h3>
                  <ul className="space-y-2">
                    {group.items.map((acc) => {
                      const title = acc.nickname?.trim() || acc.holderName;
                      const subtitle = [maskAccountNumberShort(acc.accountNumber), acc.accountType]
                        .filter(Boolean)
                        .join(" · ");
                      const freeStored = computeAccountFreeBalance(
                        acc,
                        accounts,
                        withheldAmountsByBank
                      );
                      const withheldStored = Math.max(0, (acc.balance ?? 0) - freeStored);
                      return (
                        <li key={acc.id}>
                          <button
                            type="button"
                            onClick={() => setAccountToView(acc)}
                            className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm min-h-[72px] active:bg-gray-50 transition-colors"
                          >
                            <div className="flex justify-between gap-3 items-start">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900 truncate">{title}</p>
                                {subtitle ? (
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{subtitle}</p>
                                ) : null}
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                                  Balance
                                </p>
                                <p className="text-base font-semibold text-emerald-700 tabular-nums">
                                  {formatAccountBalanceForDisplay(acc.balance)}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 flex w-full min-w-0 items-baseline justify-between gap-3 text-[11px] leading-snug">
                              <p className="min-w-0 text-left">
                                <span className="text-gray-500">Free</span>{" "}
                                <span className="font-semibold tabular-nums text-emerald-700">
                                  {formatAccountBalanceForDisplay(freeStored)}
                                </span>
                              </p>
                              <p className="min-w-0 shrink-0 text-right">
                                <span className="text-gray-500">Withheld</span>{" "}
                                <span className="font-semibold tabular-nums text-amber-700">
                                  {formatAccountBalanceForDisplay(withheldStored)}
                                </span>
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <div
                className="space-y-2 rounded-xl bg-gray-50/90 px-4 py-3"
                role="region"
                aria-label="Filtered accounts: total balance, free and withheld"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-700">Total balance</span>
                  <span className="text-base font-semibold tabular-nums text-emerald-700">
                    {filteredAccountsTotalFormatted}
                  </span>
                </div>
                <div className="flex w-full min-w-0 items-baseline justify-between gap-3 border-t border-gray-200/90 pt-2 text-[11px] leading-snug">
                  <p className="min-w-0 text-left">
                    <span className="text-gray-500">Free</span>{" "}
                    <span className="font-semibold tabular-nums text-emerald-700">
                      {formatCurrency(accountsFreeWithheldDisplay.free, selectedCurrency)}
                    </span>
                  </p>
                  <p className="min-w-0 shrink-0 text-right">
                    <span className="text-gray-500">Withheld</span>{" "}
                    <span className="font-semibold tabular-nums text-amber-700">
                      {formatCurrency(accountsFreeWithheldDisplay.withheld, selectedCurrency)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "scheduled-payments" && (
        <section aria-label="Scheduled payments" className="space-y-3">
          {filteredScheduledPayments.length === 0 ? (
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsSchedulePaymentOpen(true)}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 active:bg-brand-800"
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  Schedule payment
                </button>
              </div>
              <p className="text-center text-gray-500 py-10 text-sm">
                {search.trim()
                  ? "No scheduled payments match your search."
                  : "No scheduled payments yet."}
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsSchedulePaymentOpen(true)}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 active:bg-brand-800"
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  Schedule payment
                </button>
              </div>
              <MobileScheduledPaymentsList
                grouped={scheduledPaymentsByYearMonth}
                formatAmount={(item) => formatDisplayAmount(item.amount, item.currency)}
                statusLabel={(p) => scheduledPaymentStatusLabel(p, new Date())}
                onItemClick={setScheduledPaymentToView}
              />
              <div
                className="flex items-center justify-between gap-3 rounded-xl bg-gray-50/90 px-4 py-3"
                role="region"
                aria-label="Filtered scheduled payments total"
              >
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-base font-semibold tabular-nums text-red-700">
                  {filteredScheduledPaymentsTotalFormatted}
                </span>
              </div>
            </div>
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
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddInvestmentOpen(true)}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 active:bg-brand-800"
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  Add investment
                </button>
              </div>
              <p className="text-center text-gray-500 py-10 text-sm">
                {search.trim() ? "No investments match your search." : "No investments yet."}
              </p>
            </>
          ) : (
            <div className="space-y-5">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddInvestmentOpen(true)}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 active:bg-brand-800"
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  Add investment
                </button>
              </div>
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
                      const totalCost = inv.quantity * inv.purchasePrice;
                      const gain = totalValue - totalCost;
                      const gainPct =
                        inv.purchasePrice !== 0
                          ? (((inv.currentPrice - inv.purchasePrice) / inv.purchasePrice) * 100).toFixed(1)
                          : "0.0";
                      const gainColor =
                        gain > 0 ? "text-emerald-700" : gain < 0 ? "text-red-700" : "text-gray-700";
                      const purchaseDate =
                        inv.purchaseDate instanceof Date
                          ? inv.purchaseDate
                          : new Date(inv.purchaseDate);
                      const maturityDate = inv.maturityDate
                        ? inv.maturityDate instanceof Date
                          ? inv.maturityDate
                          : new Date(inv.maturityDate)
                        : null;
                      const subtitle = [inv.symbol, inv.account?.bankName ?? inv.account?.holderName]
                        .filter(Boolean)
                        .join(" · ");
                      const qtyLabel = Number.isInteger(inv.quantity)
                        ? inv.quantity.toLocaleString()
                        : inv.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 });
                      const linkedTarget = inv.investmentTarget;
                      const targetCompletionPct =
                        linkedTarget &&
                        linkedTarget.targetAmount > 0 &&
                        typeof linkedTarget.fulfilledAmount === "number"
                          ? Math.min(
                              100,
                              (linkedTarget.fulfilledAmount / linkedTarget.targetAmount) * 100
                            )
                          : null;
                      return (
                        <li key={inv.id}>
                          <button
                            type="button"
                            onClick={() => setInvestmentToView(inv)}
                            className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm min-h-[72px] active:bg-gray-50 transition-colors"
                          >
                            <div className="grid grid-cols-[minmax(0,1fr)_minmax(9rem,11rem)] gap-x-3 gap-y-1.5 items-start text-left">
                              <p className="col-span-2 min-w-0 font-medium text-gray-900 line-clamp-2">
                                {inv.name}
                              </p>
                              <p className="col-span-2 text-right text-base font-semibold text-slate-800 tabular-nums">
                                {formatCurrency(totalValue, selectedCurrency)}
                              </p>
                              {subtitle ? (
                                <p className="col-span-2 text-xs text-gray-500 line-clamp-1">{subtitle}</p>
                              ) : null}
                              <p className="min-w-0 text-[11px] text-gray-600">{qtyLabel} units</p>
                              <p className="text-right text-[11px] tabular-nums text-gray-700">
                                @ {formatCurrency(inv.currentPrice, selectedCurrency)}
                              </p>
                              {maturityDate ? (
                                <>
                                  <p className="min-w-0 text-[11px] text-gray-500">
                                    Purchased {formatDebtCardDate(purchaseDate)}
                                  </p>
                                  <p className="text-right text-[11px] text-gray-600">
                                    Matures {formatDebtCardDate(maturityDate)}
                                  </p>
                                </>
                              ) : (
                                <p className="col-span-2 text-[11px] text-gray-500">
                                  Purchased {formatDebtCardDate(purchaseDate)}
                                </p>
                              )}
                              <p className="min-w-0 text-[11px] font-medium text-gray-700">
                                Profit/Loss
                              </p>
                              <p
                                className={`text-right text-[11px] font-medium tabular-nums ${gainColor}`}
                              >
                                {formatCurrency(gain, selectedCurrency)} ({gainPct}%)
                              </p>
                              {targetCompletionPct !== null && linkedTarget ? (
                                <div className="col-span-2 mt-1.5 border-t border-gray-100 pt-2">
                                  <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-purple-900">
                                    <span className="min-w-0 truncate font-medium">
                                      Target
                                      {linkedTarget.nickname?.trim()
                                        ? ` · ${linkedTarget.nickname.trim()}`
                                        : ` · ${getInvestmentTypeLabel(linkedTarget.investmentType)}`}
                                    </span>
                                    <span className="shrink-0 tabular-nums font-semibold">
                                      {targetCompletionPct.toFixed(0)}%
                                    </span>
                                  </div>
                                  <div
                                    className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200"
                                    role="progressbar"
                                    aria-valuenow={Math.round(targetCompletionPct)}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label={`Savings target ${targetCompletionPct.toFixed(0)} percent complete`}
                                  >
                                    <div
                                      className="h-full rounded-full bg-violet-600 transition-[width]"
                                      style={{ width: `${targetCompletionPct}%` }}
                                    />
                                  </div>
                                  <p className="mt-1 text-[10px] tabular-nums text-gray-600">
                                    {formatCurrency(linkedTarget.fulfilledAmount, selectedCurrency)} /{" "}
                                    {formatCurrency(linkedTarget.targetAmount, selectedCurrency)}
                                  </p>
                                </div>
                              ) : null}
                              {inv.interestRate != null && inv.interestRate > 0 ? (
                                <p className="col-span-2 text-[11px] text-gray-600">
                                  {inv.interestRate}% APR
                                </p>
                              ) : null}
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
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddDebtOpen(true)}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 active:bg-brand-800"
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  Add debt
                </button>
              </div>
              <p className="text-center text-gray-500 py-10 text-sm">
                {search.trim() ? "No debts match your search." : "No debts yet."}
              </p>
            </>
          ) : (
            <div className="space-y-5">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddDebtOpen(true)}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 active:bg-brand-800"
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  Add debt
                </button>
              </div>
              {debtsByStatus.map((group, groupIndex) => {
                const isFullyPaidGroup = group.status === "FULLY_PAID";
                const showList = !isFullyPaidGroup || debtsFullyPaidExpanded;
                return (
                <div key={group.status}>
                  {isFullyPaidGroup ? (
                    <button
                      type="button"
                      className={`mb-2 flex w-full items-center justify-between gap-2 rounded-lg py-1 text-left active:bg-gray-50 ${
                        groupIndex > 0 ? "mt-1" : ""
                      }`}
                      aria-expanded={debtsFullyPaidExpanded}
                      onClick={() => setDebtsFullyPaidExpanded((v) => !v)}
                    >
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {group.label}{" "}
                        <span className="font-normal tabular-nums text-gray-400">
                          ({group.items.length})
                        </span>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                          debtsFullyPaidExpanded ? "rotate-180" : ""
                        }`}
                        aria-hidden
                      />
                    </button>
                  ) : (
                    <h3
                      className={`mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 ${
                        groupIndex > 0 ? "mt-1" : ""
                      }`}
                    >
                      {group.label}{" "}
                      <span className="font-normal tabular-nums text-gray-400">({group.items.length})</span>
                    </h3>
                  )}
                  {showList ? (
                  <ul className="space-y-2">
                    {group.items.map((debt) => {
                      const lent =
                        debt.lentDate instanceof Date ? debt.lentDate : new Date(debt.lentDate);
                      const due = debt.dueDate
                        ? debt.dueDate instanceof Date
                          ? debt.dueDate
                          : new Date(debt.dueDate)
                        : undefined;
                      const remainingWithInterest = calculateRemainingWithInterest(
                        debt.amount,
                        debt.interestRate,
                        lent,
                        due,
                        debt.repayments ?? [],
                        new Date(),
                        debt.status
                      );
                      const { remainingAmount, totalWithInterest } = remainingWithInterest;
                      const totalRepayments =
                        debt.repayments?.reduce((sum, r) => sum + r.amount, 0) ?? 0;
                      const repaymentPctRaw =
                        totalWithInterest > 0
                          ? (totalRepayments / totalWithInterest) * 100
                          : 0;
                      const repaymentPct = Math.min(100, Math.max(0, repaymentPctRaw));
                      return (
                        <li key={debt.id}>
                          <button
                            type="button"
                            onClick={() => setDebtToView(debt)}
                            className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm min-h-[72px] active:bg-gray-50 transition-colors"
                          >
                            <div className="grid grid-cols-[minmax(0,1fr)_minmax(9rem,11rem)] gap-x-3 gap-y-1.5 items-start text-left">
                              <p className="col-span-2 min-w-0 font-medium text-gray-900 line-clamp-2">
                                {debt.borrowerName}
                              </p>
                              <p className="col-span-2 text-right text-base font-semibold text-amber-800 tabular-nums">
                                {formatCurrency(debt.amount, selectedCurrency)}
                              </p>
                              {debt.purpose ? (
                                <p className="col-span-2 text-xs text-gray-500 line-clamp-2">{debt.purpose}</p>
                              ) : null}
                              {due ? (
                                <>
                                  <p className="text-[11px] text-gray-600">
                                    Lent {formatDebtCardDate(lent)}
                                  </p>
                                  <p className="text-right text-[11px] text-gray-600">
                                    Due {formatDebtCardDate(due)}
                                  </p>
                                </>
                              ) : (
                                <p className="col-span-2 text-[11px] text-gray-600">
                                  Lent {formatDebtCardDate(lent)}
                                </p>
                              )}
                              <div className="min-w-0 text-[11px] text-gray-600">
                                {debt.interestRate > 0 ? (
                                  <>{debt.interestRate}% annual interest</>
                                ) : (
                                  <>No interest</>
                                )}
                              </div>
                              {debt.status === "FULLY_PAID" ? (
                                <p className="text-right text-[11px] font-medium text-green-700">
                                  Paid in full
                                </p>
                              ) : (
                                <p className="text-right text-[11px] font-medium tabular-nums text-amber-900">
                                  Remaining {formatCurrency(remainingAmount, selectedCurrency)}
                                </p>
                              )}
                            </div>
                            <div
                              className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-200"
                              role="progressbar"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(repaymentPct)}
                              aria-label={`${repaymentPct.toFixed(0)} percent repaid`}
                            >
                              <div
                                className="h-full rounded-full bg-green-600 transition-[width]"
                                style={{ width: `${repaymentPct}%` }}
                              />
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  ) : null}
                </div>
              );
              })}
            </div>
          )}
        </section>
      )}

      {tab === "notes" && (
        <section aria-label="Notes" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              {archivedNotes.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowArchivedNotes((v) => !v)}
                  className="text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  {showArchivedNotes ? "Show active notes" : `Archived (${archivedNotes.length})`}
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setIsAddNoteOpen(true)}
              className="inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 active:bg-brand-800"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
              Add note
            </button>
          </div>
          {filteredNotes.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">
              {search.trim()
                ? "No notes match your search."
                : showArchivedNotes
                  ? "No archived notes."
                  : "No notes yet."}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredNotes.map((note) => {
                const contentLine = note.content?.trim();
                const normalized = contentLine ? contentLine.replace(/\s+/g, " ") : "";
                const preview =
                  normalized || (note.tags.length > 0 ? note.tags.join(", ") : "");
                const subtitle =
                  preview.length > 0
                    ? preview.length > 72
                      ? `${preview.slice(0, 72)}…`
                      : preview
                    : note.isArchived
                      ? "Archived"
                      : "No content";
                return (
                  <div
                    key={note.id}
                    className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: note.color || "#fbbf24" }}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-semibold leading-snug text-gray-900">
                            {note.isPinned ? "📌 " : null}
                            {note.title}
                          </h3>
                          <p className="mt-0.5 truncate text-sm text-gray-600">{subtitle}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {note.isArchived ? (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                            Archived
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setNoteToView(note)}
                          className="min-h-[40px] rounded-lg px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <MobileAddIncomeSheet
        isOpen={isAddIncomeOpen}
        onClose={() => setIsAddIncomeOpen(false)}
        onSuccess={() => {
          void loadData();
        }}
        categories={incomeCategoriesWithFrequency}
        accounts={accounts}
      />

      <MobileAddIncomeSheet
        isOpen={incomeToEdit !== null}
        mode="edit"
        incomeToEdit={incomeToEdit}
        onClose={() => setIncomeToEdit(null)}
        onSuccess={() => {
          void loadData();
        }}
        categories={incomeCategoriesWithFrequency}
        accounts={accounts}
      />

      <MobileAddExpenseSheet
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onSuccess={() => {
          void loadData();
        }}
        categories={expenseCategoriesWithFrequency}
        accounts={accounts}
      />

      <MobileAddExpenseSheet
        isOpen={expenseToEdit !== null}
        mode="edit"
        expenseToEdit={expenseToEdit}
        onClose={() => setExpenseToEdit(null)}
        onSuccess={() => {
          void loadData();
        }}
        categories={expenseCategoriesWithFrequency}
        accounts={accounts}
      />

      <MobileSchedulePaymentSheet
        isOpen={isSchedulePaymentOpen}
        onClose={() => setIsSchedulePaymentOpen(false)}
        onSuccess={() => {
          void loadData();
        }}
        categories={expenseCategoriesWithFrequency}
        accounts={accounts}
      />

      <MobileAddInvestmentSheet
        isOpen={isAddInvestmentOpen}
        onClose={() => setIsAddInvestmentOpen(false)}
        onSuccess={() => {
          void loadData();
        }}
      />

      <MobileAddDebtSheet
        isOpen={isAddDebtOpen}
        onClose={() => setIsAddDebtOpen(false)}
        onSuccess={() => {
          void loadData();
        }}
      />

      <MobileAddNoteSheet
        isOpen={isAddNoteOpen}
        onClose={() => setIsAddNoteOpen(false)}
        onSuccess={() => {
          void loadData();
        }}
      />

      <MobileNoteDetailSheet
        note={noteToView}
        isOpen={noteToView !== null}
        onClose={() => setNoteToView(null)}
        onUpdated={() => {
          void loadData();
        }}
        onDeleted={() => {
          void loadData();
        }}
      />

      <MobileTransactionViewSheet
        transaction={incomeToView}
        transactionType="INCOME"
        isOpen={incomeToView !== null}
        onClose={() => setIncomeToView(null)}
        onEdit={() => {
          if (!incomeToView) return;
          setIncomeToEdit(incomeToView);
          setIncomeToView(null);
        }}
      />

      <MobileTransactionViewSheet
        transaction={expenseToView}
        transactionType="EXPENSE"
        isOpen={expenseToView !== null}
        onClose={() => setExpenseToView(null)}
        onEdit={() => {
          if (!expenseToView) return;
          setExpenseToEdit(expenseToView);
          setExpenseToView(null);
        }}
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

      <MobileScheduledPaymentDetailSheet
        payment={scheduledPaymentToView}
        isOpen={scheduledPaymentToView !== null}
        onClose={() => setScheduledPaymentToView(null)}
        formatAmount={(item) => formatDisplayAmount(item.amount, item.currency)}
        statusLabel={(p) => scheduledPaymentStatusLabel(p, new Date())}
      />

      <MobileAccountDetailSheet
        account={accountToView}
        isOpen={accountToView !== null}
        onClose={() => setAccountToView(null)}
        formattedBalance={
          accountToView ? formatAccountBalanceForDisplay(accountToView.balance) : "—"
        }
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
