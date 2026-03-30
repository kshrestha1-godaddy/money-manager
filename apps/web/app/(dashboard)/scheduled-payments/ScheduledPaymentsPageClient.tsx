"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, RefreshCw, Trash2 } from "lucide-react";
import {
  getScheduledPayments,
  deleteScheduledPayment,
  deleteScheduledPaymentsWithPassword,
  acceptScheduledPayment,
  rejectScheduledPayment,
} from "./actions/scheduled-payments";
import { ScheduledPaymentItem } from "../../types/scheduled-payment";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { useTimezone } from "../../providers/TimezoneProvider";
import { convertForDisplaySync } from "../../utils/currencyDisplay";
import { SUPPORTED_CURRENCIES } from "../../utils/currencyConversion";
import {
  BUTTON_COLORS,
  CONTAINER_COLORS,
  LOADING_COLORS,
  TEXT_COLORS,
  UI_STYLES,
} from "../../config/colorConfig";
import { getCategories } from "../../actions/categories";
import { getUserAccounts } from "../accounts/actions/accounts";
import {
  getCategoriesWithFrequency,
  CategoryWithFrequencyData,
} from "../../utils/categoryFrequency";
import { AccountInterface } from "../../types/accounts";
import { SchedulePaymentModal } from "../expenses/components/SchedulePaymentModal";
import { DisappearingNotification, NotificationData } from "../../components/DisappearingNotification";
import { ScheduledPaymentsChart } from "./components/ScheduledPaymentsChart";
import { UpcomingScheduleCalendar } from "./components/UpcomingScheduleCalendar";
import { ScheduledPaymentsFilters } from "./components/ScheduledPaymentsFilters";
import { DeleteSelectedScheduledPaymentsModal } from "./components/DeleteSelectedScheduledPaymentsModal";
import {
  accountDisplay,
  recurringDisplay,
  matchesSearch,
} from "./scheduled-payment-helpers";

const pageContainer = CONTAINER_COLORS.page;
const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;
const pageTitle = TEXT_COLORS.title;
const primaryButton = BUTTON_COLORS.primary;
const secondaryOutlineButton = BUTTON_COLORS.secondaryBlue;
const dangerButton = BUTTON_COLORS.danger;

/** Fixed width incl. horizontal padding (`box-border`); remaining cols share the rest. */
const BULK_SELECT_COLUMN_WIDTH_PX = 44;

/** `table-fixed` column shares (with checkbox as px). Title widened vs equal split; When / Category / Status tightened. */
const SCHEDULED_TABLE_COL_PCT = {
  title: "26%",
  when: "6%",
  amount: "9%",
  category: "6%",
  account: "13%",
  notes: "10%",
  recurrence: "8%",
  status: "6%",
  actions: "16%",
} as const;

function statusLabel(item: ScheduledPaymentItem, now: Date): string {
  if (item.resolution === "ACCEPTED") return "Accepted";
  if (item.resolution === "REJECTED") return "Rejected";
  if (item.scheduledAt > now) return "Upcoming";
  return "Awaiting confirmation";
}

type ScheduledPaymentsSortKey =
  | "title"
  | "when"
  | "amount"
  | "category"
  | "account"
  | "notes"
  | "recurrence"
  | "status";

interface TableSortState {
  key: ScheduledPaymentsSortKey;
  dir: "asc" | "desc";
}

function compareScheduledRows(
  a: ScheduledPaymentItem,
  b: ScheduledPaymentItem,
  sort: TableSortState,
  now: Date,
  displayCurrency: string
): number {
  let c = 0;
  switch (sort.key) {
    case "title":
      c = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      break;
    case "when":
      c = new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      break;
    case "amount": {
      const va = convertForDisplaySync(a.amount, a.currency, displayCurrency);
      const vb = convertForDisplaySync(b.amount, b.currency, displayCurrency);
      c = va - vb;
      break;
    }
    case "category":
      c = a.category.name.localeCompare(b.category.name, undefined, { sensitivity: "base" });
      break;
    case "account":
      c = accountDisplay(a).localeCompare(accountDisplay(b), undefined, { sensitivity: "base" });
      break;
    case "notes": {
      const na = (a.notes ?? "").trim().toLowerCase();
      const nb = (b.notes ?? "").trim().toLowerCase();
      c = na.localeCompare(nb, undefined, { sensitivity: "base" });
      break;
    }
    case "recurrence":
      c = recurringDisplay(a).localeCompare(recurringDisplay(b), undefined, { sensitivity: "base" });
      break;
    case "status":
      c = statusLabel(a, now).localeCompare(statusLabel(b, now), undefined, { sensitivity: "base" });
      break;
    default:
      c = 0;
  }
  return sort.dir === "asc" ? c : -c;
}

interface SortableThProps {
  label: string;
  columnKey: ScheduledPaymentsSortKey;
  sort: TableSortState;
  onSort: (key: ScheduledPaymentsSortKey) => void;
  className?: string;
}

function SortableTh({ label, columnKey, sort, onSort, className = "" }: SortableThProps) {
  const active = sort.key === columnKey;
  return (
    <th className={`px-3 py-3 font-medium sm:px-4 ${className}`}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className="inline-flex max-w-full items-center gap-1 rounded text-left text-gray-700 hover:bg-gray-100/80 hover:text-gray-900 -mx-1 px-1 py-0.5"
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span className="min-w-0 truncate">{label}</span>
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-35" aria-hidden />
        )}
      </button>
    </th>
  );
}

function csvQuoteCell(value: string | number | undefined | null): string {
  const s = String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function formatAmountCsvPlain(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function scheduledAtIso(item: ScheduledPaymentItem): string {
  const d = item.scheduledAt instanceof Date ? item.scheduledAt : new Date(item.scheduledAt);
  return d.toISOString();
}

function buildScheduledPaymentsCsv(
  rows: ScheduledPaymentItem[],
  displayCurrency: string,
  now: Date
): string {
  const displayCurrencySafe = (displayCurrency || "USD").trim();
  const displayCurrencyCode = displayCurrencySafe.toUpperCase();
  const headers = [
    "Title",
    "When (scheduled)",
    "Original currency",
    "Amount (original)",
    `Amount (${displayCurrencyCode})`,
    "Category",
    "Account",
    "Notes",
    "Description",
    "Tags",
    "Recurrence",
    "Status",
  ];
  const lines: string[][] = [headers];
  rows.forEach((item) => {
    const displayAmount = convertForDisplaySync(
      item.amount,
      item.currency,
      displayCurrencySafe
    );
    lines.push([
      item.title,
      scheduledAtIso(item),
      (item.currency ?? "").trim(),
      formatAmountCsvPlain(item.amount),
      formatAmountCsvPlain(displayAmount),
      item.category.name,
      accountDisplay(item),
      item.notes ?? "",
      item.description ?? "",
      (item.tags ?? []).join("; "),
      recurringDisplay(item),
      statusLabel(item, now),
    ]);
  });
  return lines
    .map((line) => line.map((cell) => csvQuoteCell(cell)).join(","))
    .join("\r\n");
}

export default function ScheduledPaymentsPageClient() {
  const { currency: userCurrency } = useCurrency();
  const { timezone: userTimezone } = useTimezone();
  const [items, setItems] = useState<ScheduledPaymentItem[]>([]);
  const [categoriesWithFrequency, setCategoriesWithFrequency] = useState<CategoryWithFrequencyData[]>([]);
  const [accounts, setAccounts] = useState<AccountInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduledPaymentItem | null>(null);
  const [notification, setNotification] = useState<NotificationData | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [selectedRecurring, setSelectedRecurring] = useState<string[]>([]);
  const [tableSort, setTableSort] = useState<TableSortState>({ key: "when", dir: "desc" });
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<number>>(() => new Set());
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<number[]>([]);
  const [tableDisplayCurrency, setTableDisplayCurrency] = useState(userCurrency);

  useEffect(() => {
    setTableDisplayCurrency(userCurrency);
  }, [userCurrency]);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (silent) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [scheduledData, expenseCategories, accResult] = await Promise.all([
        getScheduledPayments(),
        getCategories("EXPENSE"),
        getUserAccounts(),
      ]);
      setItems(scheduledData);
      const accs = Array.isArray(accResult) ? accResult : [];
      setAccounts(accs);
      setCategoriesWithFrequency(getCategoriesWithFrequency(expenseCategories, []));
    } catch (e) {
      console.error(e);
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const now = new Date();

  const filterOptions = useMemo(() => {
    const categoryNames = [...new Set(items.map((i) => i.category.name))].sort();
    const categoryOptions = categoryNames.map((name) => ({ value: name, label: name }));

    const accountKeys = [...new Set(items.map(accountDisplay))].sort();
    const accountOptions = accountKeys.map((k) => ({ value: k, label: k }));

    const currencyKeys = [...new Set(items.map((i) => i.currency))].sort();
    const currencyOptions = currencyKeys.map((c) => ({ value: c, label: c }));

    const recurringKeys = [...new Set(items.map(recurringDisplay))].sort((a, b) => {
      const order = (x: string) =>
        x === "One-time" ? 0 : x === "Daily" ? 1 : x === "Weekly" ? 2 : x === "Monthly" ? 3 : 4;
      return order(a) - order(b);
    });
    const recurringOptions = recurringKeys.map((r) => ({ value: r, label: r }));

    return { categoryOptions, accountOptions, currencyOptions, recurringOptions };
  }, [items]);

  const filteredItems = useMemo(() => {
    const nowInner = new Date();
    return items.filter((item) => {
      if (!matchesSearch(item, searchQuery)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category.name)) {
        return false;
      }
      const acc = accountDisplay(item);
      if (selectedAccounts.length > 0 && !selectedAccounts.includes(acc)) return false;
      const st = statusLabel(item, nowInner);
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(st)) return false;
      if (selectedCurrencies.length > 0 && !selectedCurrencies.includes(item.currency)) {
        return false;
      }
      const rec = recurringDisplay(item);
      if (selectedRecurring.length > 0 && !selectedRecurring.includes(rec)) return false;
      return true;
    });
  }, [
    items,
    searchQuery,
    selectedCategories,
    selectedAccounts,
    selectedStatuses,
    selectedCurrencies,
    selectedRecurring,
  ]);

  const toggleTableSort = useCallback((key: ScheduledPaymentsSortKey) => {
    setTableSort((s) => {
      if (s.key === key) {
        return { key, dir: s.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: key === "when" || key === "amount" ? "desc" : "asc" };
    });
  }, []);

  const sortedTableItems = useMemo(() => {
    const at = new Date();
    const list = [...filteredItems];
    list.sort((a, b) => {
      const r = compareScheduledRows(a, b, tableSort, at, tableDisplayCurrency);
      if (r !== 0) return r;
      return a.id - b.id;
    });
    return list;
  }, [filteredItems, tableSort, tableDisplayCurrency]);

  const handleDownloadCsv = useCallback(() => {
    if (filteredItems.length === 0) return;
    const csv = buildScheduledPaymentsCsv(sortedTableItems, tableDisplayCurrency, new Date());
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.download = `scheduled-payments-filtered-${new Date().toISOString().split("T")[0]}.csv`;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, [sortedTableItems, tableDisplayCurrency, filteredItems.length]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedCategories.length > 0 ||
    selectedAccounts.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedCurrencies.length > 0 ||
    selectedRecurring.length > 0;

  const tableSummary = useMemo(() => {
    let total = 0;
    for (const item of filteredItems) {
      total += convertForDisplaySync(item.amount, item.currency, tableDisplayCurrency);
    }
    return { count: filteredItems.length, total };
  }, [filteredItems, tableDisplayCurrency]);

  const deletableVisibleIds = useMemo(
    () => filteredItems.filter((i) => !i.resolution).map((i) => i.id),
    [filteredItems]
  );

  const allDeletableVisibleSelected =
    deletableVisibleIds.length > 0 &&
    deletableVisibleIds.every((id) => selectedPaymentIds.has(id));

  useEffect(() => {
    const allowed = new Set(deletableVisibleIds);
    setSelectedPaymentIds((prev) => {
      const next = new Set([...prev].filter((id) => allowed.has(id)));
      if (next.size === prev.size && [...prev].every((id) => next.has(id))) return prev;
      return next;
    });
  }, [deletableVisibleIds]);

  const selectAllDeletableVisible = useCallback(() => {
    setSelectedPaymentIds(new Set(deletableVisibleIds));
  }, [deletableVisibleIds]);

  const togglePaymentRowSelection = useCallback((id: number) => {
    setSelectedPaymentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearPaymentSelection = useCallback(() => {
    setSelectedPaymentIds(new Set());
  }, []);

  function openBulkDeleteModal() {
    const ids = [...selectedPaymentIds];
    if (ids.length === 0) return;
    setBulkDeleteIds(ids);
    setBulkDeleteModalOpen(true);
  }

  const handleBulkDeleteConfirm = useCallback(
    async (screenLockPassword: string) => {
      const result = await deleteScheduledPaymentsWithPassword(bulkDeleteIds, screenLockPassword);
      if ("error" in result) {
        throw new Error(result.error);
      }
      setSelectedPaymentIds(new Set());
      setNotification({
        title: "Deleted",
        message: `${result.deleted} scheduled payment${result.deleted === 1 ? "" : "s"} deleted.`,
        type: "success",
      });
      await load({ silent: true });
    },
    [bulkDeleteIds, load]
  );

  function clearFilters() {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedAccounts([]);
    setSelectedStatuses([]);
    setSelectedCurrencies([]);
    setSelectedRecurring([]);
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Cancel this scheduled payment?")) return;
    try {
      await deleteScheduledPayment(id);
      setSelectedPaymentIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await load({ silent: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await acceptScheduledPayment(id);
      await load({ silent: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to accept");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectScheduledPayment(id);
      await load({ silent: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to reject");
    }
  };

  if (loading) {
    return (
      <div className={loadingContainer}>
        <div className={loadingSpinner} />
        <p className={loadingText}>Loading scheduled payments…</p>
      </div>
    );
  }

  return (
    <div className={pageContainer}>
      <div className={UI_STYLES.header.container}>
        <div>
          <h1 className={pageTitle}>Scheduled payments</h1>
        </div>
        <div className={UI_STYLES.header.buttonGroup}>
          <button
            type="button"
            onClick={() => void load({ silent: true })}
            disabled={isRefreshing}
            className={`${secondaryOutlineButton} inline-flex items-center gap-2 disabled:opacity-50`}
            aria-busy={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 shrink-0 ${isRefreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setIsScheduleModalOpen(true);
            }}
            className={primaryButton}
          >
            Schedule payment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="min-w-0 flex h-full min-h-0 flex-col">
          <ScheduledPaymentsChart
            items={filteredItems}
            userCurrency={userCurrency}
            now={now}
            onRefresh={() => void load({ silent: true })}
            isRefreshing={isRefreshing}
          />
        </div>
        <div className="min-w-0 flex flex-col">
          <UpcomingScheduleCalendar
            items={filteredItems}
            userCurrency={userCurrency}
            userTimezone={userTimezone}
            now={now}
          />
        </div>
      </div>

      <ScheduledPaymentsFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryOptions={filterOptions.categoryOptions}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        accountOptions={filterOptions.accountOptions}
        selectedAccounts={selectedAccounts}
        onAccountsChange={setSelectedAccounts}
        selectedStatuses={selectedStatuses}
        onStatusesChange={setSelectedStatuses}
        currencyOptions={filterOptions.currencyOptions}
        selectedCurrencies={selectedCurrencies}
        onCurrenciesChange={setSelectedCurrencies}
        recurringOptions={filterOptions.recurringOptions}
        selectedRecurring={selectedRecurring}
        onRecurringChange={setSelectedRecurring}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <div className="w-full min-w-0">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {items.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-6">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {deletableVisibleIds.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={selectAllDeletableVisible}
                      disabled={allDeletableVisibleSelected}
                      className={`${secondaryOutlineButton} inline-flex items-center gap-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      Select all
                    </button>
                    {selectedPaymentIds.size > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={clearPaymentSelection}
                          className={`${secondaryOutlineButton} inline-flex items-center gap-1.5 text-sm`}
                        >
                          Clear selection
                        </button>
                        <button
                          type="button"
                          onClick={openBulkDeleteModal}
                          className={`${dangerButton} inline-flex items-center gap-1.5 text-sm`}
                        >
                          <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                          Delete selected ({selectedPaymentIds.size})
                        </button>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="scheduled-payments-display-currency" className="sr-only">
                    Display currency for table and export
                  </label>
                  <select
                    id="scheduled-payments-display-currency"
                    value={tableDisplayCurrency}
                    onChange={(e) => setTableDisplayCurrency(e.target.value)}
                    className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {SUPPORTED_CURRENCIES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  disabled={filteredItems.length === 0}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:pointer-events-none disabled:opacity-50"
                >
                  <Download className="h-4 w-4 shrink-0" aria-hidden />
                  Download CSV
                </button>
              </div>
            </div>
          ) : null}
          <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[996px] table-fixed text-sm">
          <colgroup>
            <col
              style={{
                width: BULK_SELECT_COLUMN_WIDTH_PX,
                minWidth: BULK_SELECT_COLUMN_WIDTH_PX,
                maxWidth: BULK_SELECT_COLUMN_WIDTH_PX,
              }}
            />
            <col style={{ width: SCHEDULED_TABLE_COL_PCT.title }} />
            <col style={{ width: SCHEDULED_TABLE_COL_PCT.when }} />
            <col style={{ width: SCHEDULED_TABLE_COL_PCT.amount }} />
            <col style={{ width: SCHEDULED_TABLE_COL_PCT.category }} />
            <col style={{ width: SCHEDULED_TABLE_COL_PCT.account }} />
            <col style={{ width: SCHEDULED_TABLE_COL_PCT.notes }} />
            <col style={{ width: SCHEDULED_TABLE_COL_PCT.recurrence }} />
            <col style={{ width: SCHEDULED_TABLE_COL_PCT.status }} />
            <col style={{ width: SCHEDULED_TABLE_COL_PCT.actions }} />
          </colgroup>
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th
                className="relative border-r border-gray-100 px-2.5 py-3 text-center align-middle"
                style={{
                  width: BULK_SELECT_COLUMN_WIDTH_PX,
                  minWidth: BULK_SELECT_COLUMN_WIDTH_PX,
                  maxWidth: BULK_SELECT_COLUMN_WIDTH_PX,
                  boxSizing: "border-box",
                }}
              >
                <input
                  type="checkbox"
                  className="mx-auto block h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={allDeletableVisibleSelected && deletableVisibleIds.length > 0}
                  ref={(el) => {
                    if (!el) return;
                    el.indeterminate =
                      selectedPaymentIds.size > 0 && !allDeletableVisibleSelected;
                  }}
                  disabled={deletableVisibleIds.length === 0}
                  onChange={() => {
                    if (allDeletableVisibleSelected) clearPaymentSelection();
                    else selectAllDeletableVisible();
                  }}
                  aria-label="Select all visible payments that can be cancelled"
                />
              </th>
              <SortableTh
                label="Title"
                columnKey="title"
                sort={tableSort}
                onSort={toggleTableSort}
              />
              <SortableTh
                label="When"
                columnKey="when"
                sort={tableSort}
                onSort={toggleTableSort}
              />
              <SortableTh
                label={`Amount (${tableDisplayCurrency.toUpperCase()})`}
                columnKey="amount"
                sort={tableSort}
                onSort={toggleTableSort}
              />
              <SortableTh
                label="Category"
                columnKey="category"
                sort={tableSort}
                onSort={toggleTableSort}
              />
              <SortableTh
                label="Account"
                columnKey="account"
                sort={tableSort}
                onSort={toggleTableSort}
              />
              <SortableTh
                label="Notes"
                columnKey="notes"
                sort={tableSort}
                onSort={toggleTableSort}
              />
              <SortableTh
                label="Recurrence"
                columnKey="recurrence"
                sort={tableSort}
                onSort={toggleTableSort}
              />
              <SortableTh
                label="Status"
                columnKey="status"
                sort={tableSort}
                onSort={toggleTableSort}
              />
              <th className="sticky right-0 z-20 min-w-[10rem] border-l border-gray-200 bg-gray-50 px-3 py-3 text-center font-medium shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.08)] sm:min-w-[12rem] sm:px-4">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  No scheduled payments yet. Use{" "}
                  <span className="font-medium text-gray-700">Schedule payment</span> above to add
                  one.
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  No scheduled payments match your filters.{" "}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    Clear filters
                  </button>
                </td>
              </tr>
            ) : (
              sortedTableItems.map((item) => {
                const displayAmount = convertForDisplaySync(
                  item.amount,
                  item.currency,
                  tableDisplayCurrency
                );
                const label = statusLabel(item, now);
                const canDecide =
                  !item.resolution && item.scheduledAt <= now;
                const canDelete = !item.resolution;
                const canEdit = !item.resolution;

                return (
                  <tr key={item.id} className="group align-middle hover:bg-gray-50/80">
                    <td
                      className="px-2.5 py-3 text-center align-middle"
                      style={{
                        width: BULK_SELECT_COLUMN_WIDTH_PX,
                        minWidth: BULK_SELECT_COLUMN_WIDTH_PX,
                        maxWidth: BULK_SELECT_COLUMN_WIDTH_PX,
                        boxSizing: "border-box",
                      }}
                    >
                      {canDelete ? (
                        <input
                          type="checkbox"
                          checked={selectedPaymentIds.has(item.id)}
                          onChange={() => togglePaymentRowSelection(item.id)}
                          className="mx-auto block h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          aria-label={`Select “${item.title}”`}
                        />
                      ) : null}
                    </td>
                    <td className="min-w-0 px-3 py-3 align-middle font-medium text-gray-900 sm:px-4">
                      <span className="block break-words leading-snug" title={item.title}>
                        {item.title}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle text-gray-700 whitespace-nowrap sm:px-4">
                      {new Date(item.scheduledAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 align-middle text-gray-900 whitespace-nowrap tabular-nums sm:px-4">
                      {formatCurrency(displayAmount, tableDisplayCurrency)}
                    </td>
                    <td className="max-w-0 min-w-0 px-3 py-3 align-middle text-gray-700 sm:px-4">
                      <span className="block truncate" title={item.category.name}>
                        {item.category.name}
                      </span>
                    </td>
                    <td className="max-w-0 min-w-0 px-3 py-3 align-middle text-gray-700 sm:px-4">
                      <span className="block truncate" title={accountDisplay(item)}>
                        {accountDisplay(item)}
                      </span>
                    </td>
                    <td className="max-w-0 min-w-0 px-3 py-3 align-middle text-gray-600 sm:px-4">
                      {item.notes?.trim() ? (
                        <span className="block truncate" title={item.notes}>
                          {item.notes}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-middle text-gray-700 whitespace-nowrap sm:px-4">
                      {recurringDisplay(item)}
                    </td>
                    <td className="max-w-0 min-w-0 px-3 py-3 align-middle sm:px-4">
                      <span
                        className={`block truncate ${
                          label === "Accepted"
                            ? "text-green-700"
                            : label === "Rejected"
                              ? "text-red-700"
                              : label === "Awaiting confirmation"
                                ? "text-amber-700"
                                : "text-gray-700"
                        }`}
                        title={label}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="sticky right-0 z-10 min-w-[10rem] border-l border-gray-100 bg-white px-3 py-3 text-center align-middle shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] group-hover:bg-gray-50/80 sm:min-w-[12rem] sm:px-4">
                      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                      {canDecide && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAccept(item.id)}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(item.id)}
                            className="text-gray-600 hover:underline font-medium"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setIsScheduleModalOpen(true);
                          }}
                          className="text-gray-800 hover:underline font-medium"
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:underline font-medium"
                        >
                          Cancel
                        </button>
                      )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredItems.length > 0 ? (
            <tfoot className="border-t border-gray-200 bg-gray-50/90">
              <tr>
                <td
                  className="bg-gray-50 px-2.5 py-3"
                  style={{
                    width: BULK_SELECT_COLUMN_WIDTH_PX,
                    minWidth: BULK_SELECT_COLUMN_WIDTH_PX,
                    maxWidth: BULK_SELECT_COLUMN_WIDTH_PX,
                    boxSizing: "border-box",
                  }}
                  aria-hidden
                />
                <td
                  colSpan={2}
                  className="px-3 py-3 text-left text-sm font-medium text-gray-900 sm:px-4"
                >
                  Total ({tableSummary.count}{" "}
                  {tableSummary.count === 1 ? "payment" : "payments"})
                </td>
                <td className="px-3 py-3 text-sm font-semibold tabular-nums text-gray-900 sm:px-4">
                  {formatCurrency(tableSummary.total, tableDisplayCurrency)}
                </td>
                <td colSpan={5} className="px-3 py-3 sm:px-4" aria-hidden />
                <td
                  className="sticky right-0 z-10 border-l border-gray-200 bg-gray-50 px-3 py-3 text-center shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] sm:px-4"
                  aria-hidden
                />
              </tr>
            </tfoot>
          ) : null}
        </table>
          </div>
        </div>
      </div>

      <SchedulePaymentModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setEditingItem(null);
          setIsScheduleModalOpen(false);
        }}
        editingItem={editingItem}
        onCreated={() => {
          const wasEdit = Boolean(editingItem);
          setNotification({
            title: wasEdit ? "Updated" : "Scheduled",
            message: wasEdit
              ? "Scheduled payment updated."
              : "Payment scheduled successfully.",
            type: "success",
          });
          void load({ silent: true });
        }}
        categories={categoriesWithFrequency}
        accounts={accounts}
      />
      <DeleteSelectedScheduledPaymentsModal
        isOpen={bulkDeleteModalOpen}
        onClose={() => setBulkDeleteModalOpen(false)}
        selectedCount={bulkDeleteIds.length}
        onConfirm={handleBulkDeleteConfirm}
      />
      <DisappearingNotification notification={notification} onHide={() => setNotification(null)} />
    </div>
  );
}
