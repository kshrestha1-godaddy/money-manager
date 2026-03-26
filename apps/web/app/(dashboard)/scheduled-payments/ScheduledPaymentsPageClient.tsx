"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  getScheduledPayments,
  deleteScheduledPayment,
  acceptScheduledPayment,
  rejectScheduledPayment,
} from "./actions/scheduled-payments";
import { ScheduledPaymentItem } from "../../types/scheduled-payment";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { useTimezone } from "../../providers/TimezoneProvider";
import { convertForDisplaySync } from "../../utils/currencyDisplay";
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

function statusLabel(item: ScheduledPaymentItem, now: Date): string {
  if (item.resolution === "ACCEPTED") return "Accepted";
  if (item.resolution === "REJECTED") return "Rejected";
  if (item.scheduledAt > now) return "Upcoming";
  return "Awaiting confirmation";
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
      total += convertForDisplaySync(item.amount, item.currency, userCurrency);
    }
    return { count: filteredItems.length, total };
  }, [filteredItems, userCurrency]);

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
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm overscroll-x-contain">
        <table className="w-full min-w-[940px] table-fixed text-sm">
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[15%]" />
            <col className="w-[11%]" />
            <col className="w-[8%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-3 py-3 font-medium sm:px-4">Title</th>
              <th className="px-3 py-3 font-medium sm:px-4">When</th>
              <th className="px-3 py-3 font-medium sm:px-4">Amount</th>
              <th className="px-3 py-3 font-medium sm:px-4">Category</th>
              <th className="px-3 py-3 font-medium sm:px-4">Account</th>
              <th className="px-3 py-3 font-medium sm:px-4">Notes</th>
              <th className="px-3 py-3 font-medium sm:px-4">Recurrence</th>
              <th className="px-3 py-3 font-medium sm:px-4">Status</th>
              <th className="sticky right-0 z-20 min-w-[10rem] border-l border-gray-200 bg-gray-50 px-3 py-3 text-center font-medium shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.08)] sm:min-w-[12rem] sm:px-4">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  No scheduled payments yet. Use{" "}
                  <span className="font-medium text-gray-700">Schedule payment</span> above to add
                  one.
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
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
              filteredItems.map((item) => {
                const displayAmount = convertForDisplaySync(
                  item.amount,
                  item.currency,
                  userCurrency
                );
                const label = statusLabel(item, now);
                const canDecide =
                  !item.resolution && item.scheduledAt <= now;
                const canDelete = !item.resolution;
                const canEdit = !item.resolution;

                return (
                  <tr key={item.id} className="group hover:bg-gray-50/80">
                    <td className="max-w-0 px-3 py-3 font-medium text-gray-900 sm:px-4">
                      <span className="block truncate" title={item.title}>
                        {item.title}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap sm:px-4">
                      {new Date(item.scheduledAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap tabular-nums sm:px-4">
                      {formatCurrency(displayAmount, userCurrency)}
                    </td>
                    <td className="max-w-0 px-3 py-3 text-gray-700 sm:px-4">
                      <span className="block truncate" title={item.category.name}>
                        {item.category.name}
                      </span>
                    </td>
                    <td className="max-w-0 px-3 py-3 text-gray-700 sm:px-4">
                      <span className="block truncate" title={accountDisplay(item)}>
                        {accountDisplay(item)}
                      </span>
                    </td>
                    <td className="max-w-0 px-3 py-3 text-gray-600 sm:px-4">
                      {item.notes?.trim() ? (
                        <span className="block truncate" title={item.notes}>
                          {item.notes}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap sm:px-4">
                      {recurringDisplay(item)}
                    </td>
                    <td className="max-w-0 px-3 py-3 sm:px-4">
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
                  colSpan={2}
                  className="px-3 py-3 text-left text-sm font-medium text-gray-900 sm:px-4"
                >
                  Total ({tableSummary.count}{" "}
                  {tableSummary.count === 1 ? "payment" : "payments"})
                </td>
                <td className="px-3 py-3 text-sm font-semibold tabular-nums text-gray-900 sm:px-4">
                  {formatCurrency(tableSummary.total, userCurrency)}
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
      <DisappearingNotification notification={notification} onHide={() => setNotification(null)} />
    </div>
  );
}
