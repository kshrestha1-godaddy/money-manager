"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
const pageSubtitle = TEXT_COLORS.subtitle;
const primaryButton = BUTTON_COLORS.primary;

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
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [notification, setNotification] = useState<NotificationData | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [selectedRecurring, setSelectedRecurring] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
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
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await acceptScheduledPayment(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to accept");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectScheduledPayment(id);
      await load();
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
          <p className={pageSubtitle}>
            Plan future expenses and advances. When the time passes, you will be prompted to accept
            or reject each payment.
          </p>
        </div>
        <div className={UI_STYLES.header.buttonGroup}>
          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            className={primaryButton}
          >
            Schedule payment
          </button>
        </div>
      </div>

      <ScheduledPaymentsChart items={filteredItems} userCurrency={userCurrency} now={now} />

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mb-6">
        <div className="min-w-0">
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Recurrence</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No scheduled payments yet. Use{" "}
                  <span className="font-medium text-gray-700">Schedule payment</span> above to add
                  one.
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
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

                return (
                  <tr key={item.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.title}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {new Date(item.scheduledAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {formatCurrency(displayAmount, userCurrency)}
                      {item.currency !== userCurrency && (
                        <span className="text-gray-500 text-xs ml-1">({item.currency})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.category.name}</td>
                    <td className="px-4 py-3 text-gray-700">{accountDisplay(item)}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {recurringDisplay(item)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          label === "Accepted"
                            ? "text-green-700"
                            : label === "Rejected"
                              ? "text-red-700"
                              : label === "Awaiting confirmation"
                                ? "text-amber-700"
                                : "text-gray-700"
                        }
                      >
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3 space-x-2 whitespace-nowrap">
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
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:underline font-medium"
                        >
                          Cancel
                        </button>
                      )}
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
                  className="px-4 py-3 text-left text-sm font-medium text-gray-900"
                >
                  Total ({tableSummary.count}{" "}
                  {tableSummary.count === 1 ? "payment" : "payments"})
                </td>
                <td className="px-4 py-3 text-sm font-semibold tabular-nums text-gray-900">
                  {formatCurrency(tableSummary.total, userCurrency)}
                </td>
                <td colSpan={5} className="px-4 py-3" aria-hidden />
              </tr>
            </tfoot>
          ) : null}
        </table>
          </div>
        </div>

        <div className="min-w-0">
          <UpcomingScheduleCalendar
            items={filteredItems}
            userCurrency={userCurrency}
            userTimezone={userTimezone}
            now={now}
          />
        </div>
      </div>

      <SchedulePaymentModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onCreated={() => {
          setNotification({
            title: "Scheduled",
            message: "Payment scheduled successfully.",
            type: "success",
          });
          load();
        }}
        categories={categoriesWithFrequency}
        accounts={accounts}
      />
      <DisappearingNotification notification={notification} onHide={() => setNotification(null)} />
    </div>
  );
}
