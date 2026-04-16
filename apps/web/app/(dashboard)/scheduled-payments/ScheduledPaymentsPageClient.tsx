"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, RefreshCw, Trash2 } from "lucide-react";
import {
  getScheduledPayments,
  deleteScheduledPayment,
  deleteScheduledPaymentsWithPassword,
  acceptScheduledPayment,
  rejectScheduledPayment,
  postponeScheduledPayment,
} from "./actions/scheduled-payments";
import { ScheduledPaymentItem } from "../../types/scheduled-payment";
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
import { CancelScheduledPaymentModal } from "./components/CancelScheduledPaymentModal";
import { ScheduledPaymentViewModal } from "./components/ScheduledPaymentViewModal";
import { ScheduledPaymentsGrandTotalTable } from "./components/ScheduledPaymentsGrandTotalTable";
import { ScheduledPaymentsRecurrenceSectionTable } from "./components/ScheduledPaymentsRecurrenceSectionTable";
import { ScheduledPaymentsBulkSelectHeaderEmptyTh } from "./components/scheduled-payments-table-head";
import type { ScheduledPaymentsSortKey, ScheduledPaymentsTableSortState } from "./scheduled-payments-table-types";
import {
  accountDisplay,
  recurringDisplay,
  recurrenceGroupSortIndex,
  matchesSearch,
  postponeFromOriginalScheduledDate,
  scheduledPaymentStatusLabel,
} from "./scheduled-payment-helpers";
import { BULK_SELECT_COLUMN_WIDTH_PX, TABLE_HEAD_Y } from "./scheduled-payments-table-constants";

const pageContainer = CONTAINER_COLORS.page;
const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;
const pageTitle = TEXT_COLORS.title;
const primaryButton = BUTTON_COLORS.primary;
const secondaryOutlineButton = BUTTON_COLORS.secondaryBlue;
const dangerButton = BUTTON_COLORS.danger;

function compareScheduledRows(
  a: ScheduledPaymentItem,
  b: ScheduledPaymentItem,
  sort: ScheduledPaymentsTableSortState,
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
      c = scheduledPaymentStatusLabel(a, now).localeCompare(
        scheduledPaymentStatusLabel(b, now),
        undefined,
        { sensitivity: "base" }
      );
      break;
    default:
      c = 0;
  }
  return sort.dir === "asc" ? c : -c;
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
      scheduledPaymentStatusLabel(item, now),
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
  const [viewingItem, setViewingItem] = useState<ScheduledPaymentItem | null>(null);
  const [notification, setNotification] = useState<NotificationData | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [selectedRecurring, setSelectedRecurring] = useState<string[]>([]);
  const [tableSort, setTableSort] = useState<ScheduledPaymentsTableSortState>({
    key: "when",
    dir: "asc",
  });
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<number>>(() => new Set());
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<number[]>([]);
  const [cancelTarget, setCancelTarget] = useState<{ id: number; title: string } | null>(null);
  const [isCompletedPaymentsOpen, setIsCompletedPaymentsOpen] = useState(false);
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
      const st = scheduledPaymentStatusLabel(item, nowInner);
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

  const activeFilteredItems = useMemo(
    () => filteredItems.filter((i) => i.resolution === null),
    [filteredItems]
  );

  const completedFilteredItems = useMemo(
    () => filteredItems.filter((i) => i.resolution !== null),
    [filteredItems]
  );

  const toggleTableSort = useCallback((key: ScheduledPaymentsSortKey) => {
    setTableSort((s) => {
      if (s.key === key) {
        return { key, dir: s.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: key === "when" || key === "amount" ? "desc" : "asc" };
    });
  }, []);

  /** Group by recurrence label, sections ordered One-time → Yearly; within each group apply column sort (nearest “When” first when sorted by date ascending). */
  const groupedTableSections = useMemo(() => {
    const at = new Date();
    const byLabel = new Map<string, ScheduledPaymentItem[]>();
    for (const item of activeFilteredItems) {
      const label = recurringDisplay(item);
      const arr = byLabel.get(label) ?? [];
      arr.push(item);
      byLabel.set(label, arr);
    }
    const labels = [...byLabel.keys()].sort((a, b) => {
      const i = recurrenceGroupSortIndex(a) - recurrenceGroupSortIndex(b);
      if (i !== 0) return i;
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
    return labels.map((label) => {
      const sectionItems = [...(byLabel.get(label) ?? [])].sort((a, b) => {
        const r = compareScheduledRows(a, b, tableSort, at, tableDisplayCurrency);
        if (r !== 0) return r;
        return a.id - b.id;
      });
      return { label, items: sectionItems };
    });
  }, [activeFilteredItems, tableSort, tableDisplayCurrency]);

  const groupedCompletedSections = useMemo(() => {
    const at = new Date();
    const byLabel = new Map<string, ScheduledPaymentItem[]>();
    for (const item of completedFilteredItems) {
      const label = recurringDisplay(item);
      const arr = byLabel.get(label) ?? [];
      arr.push(item);
      byLabel.set(label, arr);
    }
    const labels = [...byLabel.keys()].sort((a, b) => {
      const i = recurrenceGroupSortIndex(a) - recurrenceGroupSortIndex(b);
      if (i !== 0) return i;
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
    return labels.map((label) => {
      const sectionItems = [...(byLabel.get(label) ?? [])].sort((a, b) => {
        const r = compareScheduledRows(a, b, tableSort, at, tableDisplayCurrency);
        if (r !== 0) return r;
        return a.id - b.id;
      });
      return { label, items: sectionItems };
    });
  }, [completedFilteredItems, tableSort, tableDisplayCurrency]);

  const sortedTableItems = useMemo(() => {
    const at = new Date();
    return [...filteredItems].sort((a, b) => {
      const r = compareScheduledRows(a, b, tableSort, at, tableDisplayCurrency);
      if (r !== 0) return r;
      return a.id - b.id;
    });
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
    for (const item of activeFilteredItems) {
      total += convertForDisplaySync(item.amount, item.currency, tableDisplayCurrency);
    }
    return { count: activeFilteredItems.length, total };
  }, [activeFilteredItems, tableDisplayCurrency]);

  const completedTableSummary = useMemo(() => {
    let total = 0;
    for (const item of completedFilteredItems) {
      total += convertForDisplaySync(item.amount, item.currency, tableDisplayCurrency);
    }
    return { count: completedFilteredItems.length, total };
  }, [completedFilteredItems, tableDisplayCurrency]);

  const deletableVisibleIds = useMemo(
    () => activeFilteredItems.map((i) => i.id),
    [activeFilteredItems]
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

  const handleConfirmCancelPayment = useCallback(async () => {
    if (!cancelTarget) return;
    const id = cancelTarget.id;
    await deleteScheduledPayment(id);
    setSelectedPaymentIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await load({ silent: true });
    setNotification({
      title: "Cancelled",
      message: "Scheduled payment removed.",
      type: "success",
    });
  }, [cancelTarget, load]);

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

  const handlePostponeDays = useCallback(
    async (item: ScheduledPaymentItem, days: 1 | 3 | 7) => {
      try {
        const when = postponeFromOriginalScheduledDate(
          new Date(item.scheduledAt),
          days,
          userTimezone
        );
        await postponeScheduledPayment(item.id, when);
        await load({ silent: true });
        setNotification({
          title: "Postponed",
          message:
            days === 7
              ? "Scheduled time moved forward by 1 week."
              : `Scheduled time moved forward by ${days} day${days === 1 ? "" : "s"}.`,
          type: "success",
        });
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not postpone");
      }
    },
    [load, userTimezone]
  );

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
            Schedule a payment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 items-stretch lg:grid-cols-3">
        <div className="flex h-full min-h-0 min-w-0 flex-col lg:col-span-1">
          <ScheduledPaymentsChart
            items={filteredItems}
            userCurrency={userCurrency}
            now={now}
            onRefresh={() => void load({ silent: true })}
            isRefreshing={isRefreshing}
          />
        </div>
        <div className="flex min-w-0 flex-col lg:col-span-2">
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

      <div className="mt-3 w-full min-w-0 sm:mt-4">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {items.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5">
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
          <div className="space-y-6 px-4 pb-6 pt-6 sm:px-6 sm:pb-8 sm:pt-8">
            {items.length === 0 ? (
              <div className="overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-[1200px] table-fixed text-sm leading-relaxed">
                  <tbody>
                    <tr>
                      <td colSpan={11} className="px-5 py-10 text-center text-gray-500 sm:px-8">
                        No scheduled payments yet. Use{" "}
                        <span className="font-medium text-gray-700">Schedule payment</span> above to
                        add one.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-[1200px] table-fixed text-sm leading-relaxed">
                  <tbody>
                    <tr>
                      <td colSpan={11} className="px-5 py-10 text-center text-gray-500 sm:px-8">
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
                  </tbody>
                </table>
              </div>
            ) : activeFilteredItems.length === 0 ? (
              <div className="overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-[1200px] table-fixed text-sm leading-relaxed">
                  <tbody>
                    <tr>
                      <td colSpan={11} className="px-5 py-10 text-center text-gray-500 sm:px-8">
                        No active scheduled payments in this view. Open{" "}
                        <button
                          type="button"
                          onClick={() => setIsCompletedPaymentsOpen(true)}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          Completed payments
                        </button>{" "}
                        below to see resolved items.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                {groupedTableSections.map((section, sectionIndex) => (
                  <ScheduledPaymentsRecurrenceSectionTable
                    key={section.label}
                    section={section}
                    tableDisplayCurrency={tableDisplayCurrency}
                    userTimezone={userTimezone}
                    now={now}
                    showCheckboxes
                    selectedPaymentIds={selectedPaymentIds}
                    onToggleRowSelection={togglePaymentRowSelection}
                    onView={(item) => setViewingItem(item)}
                    onEdit={(item) => {
                      setEditingItem(item);
                      setIsScheduleModalOpen(true);
                    }}
                    onCancel={(item) => setCancelTarget({ id: item.id, title: item.title })}
                    onAccept={(id) => void handleAccept(id)}
                    onReject={(id) => void handleReject(id)}
                    onPostponeDays={handlePostponeDays}
                    sort={tableSort}
                    onSort={toggleTableSort}
                    bulkSelectHeaderCell={
                      sectionIndex === 0 ? (
                        <th
                          className={`relative border-r border-gray-100 ${TABLE_HEAD_Y} px-3 text-center align-middle`}
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
                            checked={
                              allDeletableVisibleSelected && deletableVisibleIds.length > 0
                            }
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
                      ) : (
                        <ScheduledPaymentsBulkSelectHeaderEmptyTh />
                      )
                    }
                  />
                ))}
                <ScheduledPaymentsGrandTotalTable
                  paymentCount={tableSummary.count}
                  totalAmount={tableSummary.total}
                  tableDisplayCurrency={tableDisplayCurrency}
                />
              </>
            )}
          </div>
          {completedFilteredItems.length > 0 ? (
            <>
              <div className="mt-8 border-t-2 border-gray-200/90 pt-6 sm:mt-10 sm:pt-8">
                <button
                  type="button"
                  onClick={() => setIsCompletedPaymentsOpen((open) => !open)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 sm:px-6 sm:py-5"
                  aria-expanded={isCompletedPaymentsOpen}
                  aria-controls="completed-payments-table"
                  id="completed-payments-section-toggle"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900">
                    {isCompletedPaymentsOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                    )}
                    Completed payments
                    <span className="font-normal text-gray-500">
                      ({completedTableSummary.count})
                    </span>
                  </span>
                </button>
              </div>
              {isCompletedPaymentsOpen ? (
                <div
                  id="completed-payments-table"
                  className="space-y-6 border-t border-gray-100 px-4 pb-6 pt-5 sm:px-6 sm:pb-8 sm:pt-6"
                >
                  {groupedCompletedSections.map((section) => (
                    <ScheduledPaymentsRecurrenceSectionTable
                      key={section.label}
                      section={section}
                      tableDisplayCurrency={tableDisplayCurrency}
                      userTimezone={userTimezone}
                      now={now}
                      showCheckboxes={false}
                      selectedPaymentIds={selectedPaymentIds}
                      onToggleRowSelection={togglePaymentRowSelection}
                      onView={(item) => setViewingItem(item)}
                      onEdit={(item) => {
                        setEditingItem(item);
                        setIsScheduleModalOpen(true);
                      }}
                      onCancel={(item) => setCancelTarget({ id: item.id, title: item.title })}
                      onAccept={(id) => void handleAccept(id)}
                      onReject={(id) => void handleReject(id)}
                      onPostponeDays={handlePostponeDays}
                      sort={tableSort}
                      onSort={toggleTableSort}
                      bulkSelectHeaderCell={<ScheduledPaymentsBulkSelectHeaderEmptyTh />}
                    />
                  ))}
                  <ScheduledPaymentsGrandTotalTable
                    paymentCount={completedTableSummary.count}
                    totalAmount={completedTableSummary.total}
                    tableDisplayCurrency={tableDisplayCurrency}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <CancelScheduledPaymentModal
        isOpen={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        paymentTitle={cancelTarget?.title ?? ""}
        onConfirm={handleConfirmCancelPayment}
      />
      <ScheduledPaymentViewModal
        item={viewingItem}
        isOpen={viewingItem !== null}
        onClose={() => setViewingItem(null)}
        displayCurrency={tableDisplayCurrency}
        userTimezone={userTimezone}
        onPostponeSuccess={async () => {
          await load({ silent: true });
          setNotification({
            title: "Postponed",
            message: "Scheduled time updated.",
            type: "success",
          });
        }}
        onEdit={
          viewingItem && !viewingItem.resolution
            ? () => {
                const v = viewingItem;
                setViewingItem(null);
                setEditingItem(v);
                setIsScheduleModalOpen(true);
              }
            : undefined
        }
      />
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
