"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { triggerBalanceRefresh } from "../../hooks/useTotalBalance";
import { ChevronDown, ChevronRight, Download, Trash2 } from "lucide-react";
import { PasswordGatedButton } from "@repo/applock";
import {
  getScheduledPayments,
  deleteScheduledPayment,
  deleteScheduledPayments,
  acceptScheduledPayment,
  rejectScheduledPayment,
  postponeScheduledPayment,
} from "./actions/scheduled-payments";
import { ScheduledPaymentItem } from "../../types/scheduled-payment";
import { useTimezone } from "../../providers/TimezoneProvider";
import { convertForDisplaySync } from "../../utils/currencyDisplay";
import { useDisplayCurrency } from "../../hooks/useDisplayCurrency";
import {
  BUTTON_COLORS,
  CONTAINER_COLORS,
  LOADING_COLORS,
  TEXT_COLORS,
} from "../../config/colorConfig";
import { getCategories } from "../../actions/categories";
import { getUserAccounts } from "../accounts/actions/accounts";
import {
  getCategoriesWithFrequency,
} from "../../utils/categoryFrequency";
import { SchedulePaymentModal } from "../expenses/components/SchedulePaymentModal";
import { DisappearingNotification, NotificationData } from "../../components/DisappearingNotification";
import { ScheduledPaymentsChart } from "./components/ScheduledPaymentsChart";
import { UpcomingScheduleCalendar } from "./components/UpcomingScheduleCalendar";
import { ScheduledPaymentsFilters } from "./components/ScheduledPaymentsFilters";
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
import { useResizableColumnWidths } from "../../hooks/usePersistentColumnWidths";
import { ACTIONS_COLUMN_WIDTH_PX, BULK_SELECT_COLUMN_WIDTH_PX, DEFAULT_SCHEDULED_COLUMN_WIDTHS, TABLE_HEAD_Y } from "./scheduled-payments-table-constants";

const pageContainer = CONTAINER_COLORS.page;
const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;
const primaryButton = BUTTON_COLORS.primary;
const secondaryOutlineButton = BUTTON_COLORS.secondaryBlue;
const dangerButton = BUTTON_COLORS.danger;
const EMPTY_PAYMENTS: ScheduledPaymentItem[] = [];

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

function groupScheduledRows(
  items: ScheduledPaymentItem[],
  compare: (a: ScheduledPaymentItem, b: ScheduledPaymentItem) => number,
) {
  const groups = new Map<string, ScheduledPaymentItem[]>();
  for (const item of items) {
    const label = recurringDisplay(item);
    const group = groups.get(label) ?? [];
    group.push(item);
    groups.set(label, group);
  }
  return [...groups]
    .sort(([a], [b]) => recurrenceGroupSortIndex(a) - recurrenceGroupSortIndex(b) ||
      a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map(([label, group]) => ({ label, items: group.sort(compare) }));
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
  const { columnWidths, handleMouseDown: onResizeColumn } = useResizableColumnWidths(
    "scheduled-payments", "payments", DEFAULT_SCHEDULED_COLUMN_WIDTHS, 50
  );
  const tableWidth = Object.values(columnWidths).reduce((total, width) => total + width,
    BULK_SELECT_COLUMN_WIDTH_PX + ACTIONS_COLUMN_WIDTH_PX
  );
  const { timezone: userTimezone } = useTimezone();
  const queryClient = useQueryClient();
  const paymentsQuery = useQuery({
    queryKey: ["scheduled-payments"],
    queryFn: getScheduledPayments,
  });
  const formQuery = useQuery({
    queryKey: ["scheduled-payment-form-options"],
    queryFn: async () => {
      const [categories, accounts] = await Promise.all([getCategories("EXPENSE"), getUserAccounts()]);
      if ("error" in accounts) throw new Error(accounts.error);
      return { categories: getCategoriesWithFrequency(categories, []), accounts };
    },
  });
  const items = paymentsQuery.data ?? EMPTY_PAYMENTS;
  const isRefreshing = paymentsQuery.isFetching;
  const refreshPayments = paymentsQuery.refetch;
  const [now, setNow] = useState(() => new Date());
  const busyPaymentsRef = useRef(new Set<number>());
  const [busyPaymentIds, setBusyPaymentIds] = useState<ReadonlySet<number>>(() => new Set());
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduledPaymentItem | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const viewingItem = items.find(({ id }) => id === viewingId) ?? null;
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
  const [isCompletedPaymentsOpen, setIsCompletedPaymentsOpen] = useState(false);
  const {
    displayCurrency: tableDisplayCurrency,
    currencyRateVersion,
  } = useDisplayCurrency();

  useEffect(() => {
    const clockTime = Date.now();
    let nextUpdate = 30_000;
    for (const item of items) {
      const dueAt = new Date(item.scheduledAt).getTime();
      if (item.resolution === null && dueAt > now.getTime()) {
        nextUpdate = Math.min(nextUpdate, Math.max(1, dueAt - clockTime));
      }
    }
    const timeout = window.setTimeout(() => setNow(new Date()), Math.max(1, nextUpdate));
    const updateClock = () => {
      if (!document.hidden) setNow(new Date());
    };
    document.addEventListener("visibilitychange", updateClock);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", updateClock);
    };
  }, [items, now]);

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
    return items.filter((item) => {
      if (!matchesSearch(item, searchQuery)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category.name)) {
        return false;
      }
      const acc = accountDisplay(item);
      if (selectedAccounts.length > 0 && !selectedAccounts.includes(acc)) return false;
      const st = scheduledPaymentStatusLabel(item, now);
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
    now,
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

  const compareTableRows = useCallback((a: ScheduledPaymentItem, b: ScheduledPaymentItem) =>
    compareScheduledRows(a, b, tableSort, now, tableDisplayCurrency) || a.id - b.id,
  [tableSort, now, tableDisplayCurrency, currencyRateVersion]);
  const groupedTableSections = useMemo(
    () => groupScheduledRows(activeFilteredItems, compareTableRows), [activeFilteredItems, compareTableRows]
  );
  const groupedCompletedSections = useMemo(
    () => groupScheduledRows(completedFilteredItems, compareTableRows), [completedFilteredItems, compareTableRows]
  );
  const sortedTableItems = useMemo(
    () => [...filteredItems].sort(compareTableRows), [filteredItems, compareTableRows]
  );

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
  }, [sortedTableItems, tableDisplayCurrency, filteredItems.length, now]);

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
  }, [activeFilteredItems, tableDisplayCurrency, currencyRateVersion]);

  const completedTableSummary = useMemo(() => {
    let total = 0;
    for (const item of completedFilteredItems) {
      total += convertForDisplaySync(item.amount, item.currency, tableDisplayCurrency);
    }
    return { count: completedFilteredItems.length, total };
  }, [completedFilteredItems, tableDisplayCurrency, currencyRateVersion]);

  const deletableVisibleIds = useMemo(
    () => activeFilteredItems.filter((item) => !busyPaymentIds.has(item.id)).map((item) => item.id),
    [activeFilteredItems, busyPaymentIds]
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

  async function handleBulkDelete(appLockPassword: string) {
    const ids = deletableVisibleIds.filter((id) => selectedPaymentIds.has(id));
    if (ids.length === 0) return;
    const result = await deleteScheduledPayments(ids, appLockPassword);
    if ("error" in result) {
      setNotification({ title: "Error", message: result.error, type: "error" });
      return;
    }
    setSelectedPaymentIds(new Set());
    setNotification({
      title: "Deleted",
      message: `${result.deleted} scheduled payment${result.deleted === 1 ? "" : "s"} deleted.`,
      type: "success",
    });
    await refreshPayments();
  }

  function clearFilters() {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedAccounts([]);
    setSelectedStatuses([]);
    setSelectedCurrencies([]);
    setSelectedRecurring([]);
  }

  async function runPaymentAction(
    id: number,
    action: () => Promise<void>,
    success: NotificationData,
  ) {
    if (busyPaymentsRef.current.has(id)) return;
    busyPaymentsRef.current.add(id);
    setBusyPaymentIds(new Set(busyPaymentsRef.current));
    try {
      await action();
      setNotification(success);
      await refreshPayments();
    } catch (error) {
      setNotification({
        title: "Payment update failed",
        message: error instanceof Error ? error.message : "Try again.",
        type: "error",
      });
    } finally {
      busyPaymentsRef.current.delete(id);
      setBusyPaymentIds(new Set(busyPaymentsRef.current));
    }
  }

  function handleAccept(id: number) {
    return runPaymentAction(id, async () => {
      await acceptScheduledPayment(id);
      triggerBalanceRefresh();
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["account-balance-activity"] });
    }, { title: "Accepted", message: "Payment recorded as an expense.", type: "success" });
  }

  function handleCancelPayment(appLockPassword: string, id: number) {
    return runPaymentAction(id, async () => {
      await deleteScheduledPayment(id, appLockPassword);
      setSelectedPaymentIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, { title: "Cancelled", message: "Scheduled payment removed.", type: "success" });
  }

  function handleReject(id: number) {
    return runPaymentAction(id, () => rejectScheduledPayment(id), {
      title: "Rejected", message: "Payment marked as rejected.", type: "success",
    });
  }

  function handlePostponeDays(item: ScheduledPaymentItem, days: 1 | 3 | 7) {
    return runPaymentAction(item.id, () => postponeScheduledPayment(
      item.id, postponeFromOriginalScheduledDate(new Date(item.scheduledAt), days, userTimezone)
    ), {
      title: "Postponed",
      message: `Payment moved forward by ${days} ${days === 1 ? "day" : "days"}.`,
      type: "success",
    });
  }

  if (paymentsQuery.isPending) {
    return (
      <div className={loadingContainer} role="status">
        <div className={loadingSpinner} aria-hidden="true" />
        <p className={loadingText}>Loading scheduled payments…</p>
      </div>
    );
  }

  if (paymentsQuery.isError && !paymentsQuery.data) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-6" role="alert">
        <h1 className="sr-only">Scheduled payments</h1>
        <p className="my-3 text-sm text-gray-700">Couldn’t load scheduled payments.</p>
        <button type="button" onClick={() => void refreshPayments()} disabled={isRefreshing} className={primaryButton}>
          {isRefreshing ? "Retrying…" : "Try again"}
        </button>
      </section>
    );
  }

  return (
    <div className={pageContainer}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="sr-only">Scheduled payments</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setIsScheduleModalOpen(true);
            }}
            disabled={!formQuery.data}
            className={`${primaryButton} disabled:opacity-50`}
          >
            Schedule a payment
          </button>
        </div>
      </div>

      {paymentsQuery.isRefetchError && (
        <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Refresh failed. Showing the last loaded schedule.
        </p>
      )}
      {formQuery.isError && !formQuery.data && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>Couldn’t load the categories and accounts needed to schedule payments.</p>
          <button type="button" className="underline" disabled={formQuery.isFetching} onClick={() => void formQuery.refetch()}>
            Try again
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 items-stretch lg:grid-cols-3">
        <div className="flex h-full min-h-0 min-w-0 flex-col lg:col-span-1">
          <ScheduledPaymentsChart
            items={filteredItems}
            userCurrency={tableDisplayCurrency}
            now={now}
          />
        </div>
        <div className="flex min-w-0 flex-col lg:col-span-2">
          <UpcomingScheduleCalendar
            items={filteredItems}
            userCurrency={tableDisplayCurrency}
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
                        <PasswordGatedButton
                          onConfirm={handleBulkDelete}
                          prompt={{
                            title: "Delete selected scheduled payments",
                            description:
                              "This cannot be undone. Enter your lock screen password to delete the selected scheduled payments.",
                            confirmLabel: "Delete scheduled payments",
                            force: true,
                          }}
                          className={`${dangerButton} inline-flex items-center gap-1.5 text-sm`}
                        >
                          <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                          Delete selected ({selectedPaymentIds.size})
                        </PasswordGatedButton>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  style={{ display: "none" }}
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
                <table className="w-full min-w-[1440px] table-fixed text-sm leading-relaxed">
                  <tbody>
                    <tr>
                      <td colSpan={12} className="px-5 py-10 text-center text-gray-500 sm:px-8">
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
                <table className="w-full min-w-[1440px] table-fixed text-sm leading-relaxed">
                  <tbody>
                    <tr>
                      <td colSpan={12} className="px-5 py-10 text-center text-gray-500 sm:px-8">
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
                <table className="w-full min-w-[1440px] table-fixed text-sm leading-relaxed">
                  <tbody>
                    <tr>
                      <td colSpan={12} className="px-5 py-10 text-center text-gray-500 sm:px-8">
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
                    columnWidths={columnWidths}
                    tableWidth={tableWidth}
                    onResizeColumn={onResizeColumn}
                    key={section.label}
                    section={section}
                    allItems={items}
                    tableDisplayCurrency={tableDisplayCurrency}
                    userTimezone={userTimezone}
                    now={now}
                    showCheckboxes
                    busyPaymentIds={busyPaymentIds}
                    canEditSchedule={!!formQuery.data}
                    selectedPaymentIds={selectedPaymentIds}
                    onToggleRowSelection={togglePaymentRowSelection}
                    onView={(item) => setViewingId(item.id)}
                    onEdit={(item) => {
                      setEditingItem(item);
                      setIsScheduleModalOpen(true);
                    }}
                    onCancel={(appLockPassword, item) => handleCancelPayment(appLockPassword, item.id)}
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
                  columnWidths={columnWidths}
                  tableWidth={tableWidth}
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
                      columnWidths={columnWidths}
                      tableWidth={tableWidth}
                      onResizeColumn={onResizeColumn}
                      key={section.label}
                      section={section}
                      allItems={items}
                      tableDisplayCurrency={tableDisplayCurrency}
                      userTimezone={userTimezone}
                      now={now}
                      showCheckboxes={false}
                      busyPaymentIds={busyPaymentIds}
                      canEditSchedule={!!formQuery.data}
                      selectedPaymentIds={selectedPaymentIds}
                      onToggleRowSelection={togglePaymentRowSelection}
                      onView={(item) => setViewingId(item.id)}
                      onEdit={(item) => {
                        setEditingItem(item);
                        setIsScheduleModalOpen(true);
                      }}
                      onCancel={(appLockPassword, item) => handleCancelPayment(appLockPassword, item.id)}
                      onAccept={(id) => void handleAccept(id)}
                      onReject={(id) => void handleReject(id)}
                      onPostponeDays={handlePostponeDays}
                      sort={tableSort}
                      onSort={toggleTableSort}
                      bulkSelectHeaderCell={<ScheduledPaymentsBulkSelectHeaderEmptyTh />}
                    />
                  ))}
                  <ScheduledPaymentsGrandTotalTable
                    columnWidths={columnWidths}
                    tableWidth={tableWidth}
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

      <ScheduledPaymentViewModal
        item={viewingItem}
        isOpen={viewingItem !== null}
        onClose={() => setViewingId(null)}
        displayCurrency={tableDisplayCurrency}
        userTimezone={userTimezone}
        allItems={items}
        onPostponeSuccess={async () => {
          await refreshPayments();
          setNotification({
            title: "Postponed",
            message: "Scheduled time updated.",
            type: "success",
          });
        }}
        onEarlyAcceptSuccess={async () => {
          await refreshPayments();
          triggerBalanceRefresh();
          void queryClient.invalidateQueries({ queryKey: ["expenses"] });
          void queryClient.invalidateQueries({ queryKey: ["accounts"] });
          void queryClient.invalidateQueries({ queryKey: ["account-balance-activity"] });
          void queryClient.invalidateQueries({ queryKey: ["investments"] });
          void queryClient.invalidateQueries({ queryKey: ["investment-contribution-plan"] });
          void queryClient.invalidateQueries({ queryKey: ["withheld-amounts"] });
          setNotification({
            title: "Accepted early",
            message: "Payment recorded. Original scheduled date was kept.",
            type: "success",
          });
        }}
        onEdit={
          viewingItem && !viewingItem.resolution && formQuery.data && !busyPaymentIds.has(viewingItem.id)
            ? () => {
                const v = viewingItem;
                setViewingId(null);
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
          void refreshPayments();
        }}
        categories={formQuery.data?.categories ?? []}
        accounts={formQuery.data?.accounts ?? []}
      />
      <DisappearingNotification notification={notification} onHide={() => setNotification(null)} />
    </div>
  );
}
