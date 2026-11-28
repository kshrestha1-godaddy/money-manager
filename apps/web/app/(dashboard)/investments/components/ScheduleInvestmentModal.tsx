"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { InvestmentInterface } from "../../../types/investments";
import { AccountInterface } from "../../../types/accounts";
import { Category } from "../../../types/financial";
import {
  getTargetScheduleContext,
  listScheduleableTargets,
  scheduleInvestmentTowardTarget,
  type ScheduleableTargetOption,
} from "../actions/schedule-investment";
import {
  getUserAccounts,
  getWithheldInvestmentDetailsByAccount,
} from "../../accounts/actions/accounts";
import { sumAccountWithheld } from "../../accounts/utils/accountWithheld";
import { getCategories } from "../../../actions/categories";
import { useDisplayCurrency } from "../../../hooks/useDisplayCurrency";
import { useTimezone } from "../../../providers/TimezoneProvider";
import { formatCurrency, getCurrencySymbol } from "../../../utils/currency";
import {
  parseDatetimeLocalInTimezone,
  toDatetimeLocalValue,
} from "../../../utils/scheduledPaymentTime";
import { getInvestmentTypeLabel } from "../utils/investmentTypeUi";
import {
  previewContributionSchedule,
  type ContributionFrequency,
} from "../utils/contributionScheduleMath";

interface ScheduleInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reminderCreated: boolean) => void;
}

function targetOptionLabel(t: ScheduleableTargetOption): string {
  return t.nickname?.trim()
    ? `${t.nickname} (${getInvestmentTypeLabel(t.investmentType as InvestmentInterface["type"])})`
    : getInvestmentTypeLabel(t.investmentType as InvestmentInterface["type"]);
}

function accountOptionLabel(a: AccountInterface): string {
  const nick = a.nickname?.trim();
  return nick ? `[${nick}] ${a.bankName}` : a.bankName;
}

export function ScheduleInvestmentModal({
  isOpen,
  onClose,
  onSuccess,
}: ScheduleInvestmentModalProps) {
  const { displayCurrency, toAccountAmount, formatAmount, convertAmount } = useDisplayCurrency();
  const { timezone } = useTimezone();
  const currencySymbol = getCurrencySymbol(displayCurrency);

  const [targets, setTargets] = useState<ScheduleableTargetOption[]>([]);
  const [accounts, setAccounts] = useState<AccountInterface[]>([]);
  const [withheldByAccount, setWithheldByAccount] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [targetId, setTargetId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [initialAmount, setInitialAmount] = useState("");
  const [firstReminderLocal, setFirstReminderLocal] = useState("");
  const [frequency, setFrequency] = useState<ContributionFrequency>("MONTHLY");
  const [categoryId, setCategoryId] = useState("");
  const [isTargetMenuOpen, setIsTargetMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const targetMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [context, setContext] = useState<Awaited<
    ReturnType<typeof getTargetScheduleContext>
  > | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setTargetId("");
    setAccountId("");
    setInitialAmount("");
    setCategoryId("");
    setFrequency("MONTHLY");
    setIsTargetMenuOpen(false);
    setIsAccountMenuOpen(false);
    setFirstReminderLocal(toDatetimeLocalValue(new Date(), timezone || "UTC"));
    setContext(null);

    void (async () => {
      const [targetResult, accountResult, withheldDetails, cats] = await Promise.all([
        listScheduleableTargets(),
        getUserAccounts(),
        getWithheldInvestmentDetailsByAccount().catch(() => ({})),
        getCategories("EXPENSE").catch(() => [] as Category[]),
      ]);
      setTargets(Array.isArray(targetResult) ? targetResult : []);
      setAccounts(Array.isArray(accountResult) ? accountResult : []);
      setWithheldByAccount(sumAccountWithheld(withheldDetails));
      setCategories(cats);
    })();
  }, [isOpen, timezone]);

  useEffect(() => {
    if (!isTargetMenuOpen && !isAccountMenuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (isTargetMenuOpen && !targetMenuRef.current?.contains(target)) {
        setIsTargetMenuOpen(false);
      }
      if (isAccountMenuOpen && !accountMenuRef.current?.contains(target)) {
        setIsAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isTargetMenuOpen, isAccountMenuOpen]);

  useEffect(() => {
    if (!targetId) {
      setContext(null);
      return;
    }
    void (async () => {
      const result = await getTargetScheduleContext(parseInt(targetId, 10));
      setContext(result);
    })();
  }, [targetId]);

  const preview = useMemo(() => {
    if (!context || "error" in context || !context.completionDate) return null;
    const initial = parseFloat(initialAmount) || 0;
    const initialInAccount = initial > 0 ? toAccountAmount(initial) : 0;
    const remaining = Math.max(0, context.remainingAmount - initialInAccount);
    const firstAt = parseDatetimeLocalInTimezone(
      firstReminderLocal,
      timezone || "UTC"
    );
    if (!firstAt) return null;
    return previewContributionSchedule(
      remaining,
      firstAt,
      new Date(context.completionDate),
      frequency,
      timezone || "UTC"
    );
  }, [
    context,
    initialAmount,
    firstReminderLocal,
    frequency,
    timezone,
    toAccountAmount,
  ]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!targetId) {
      setError("Select an investment target");
      return;
    }
    if (!accountId) {
      setError("Select an account");
      return;
    }
    if (!categoryId) {
      setError("Select an expense category");
      return;
    }
    const initial = initialAmount.trim() === "" ? 0 : parseFloat(initialAmount);
    if (!Number.isFinite(initial) || initial < 0) {
      setError("Enter a valid initial contribution (0 or more)");
      return;
    }
    const firstAt = parseDatetimeLocalInTimezone(
      firstReminderLocal,
      timezone || "UTC"
    );
    if (!firstAt) {
      setError("Enter a valid first reminder date and time");
      return;
    }
    if (context && "error" in context) {
      setError(context.error);
      return;
    }
    if (context?.hasOpenSeries) {
      setError("This target already has a scheduled investment series");
      return;
    }
    if (!context?.completionDate) {
      setError("Selected target needs a completion date");
      return;
    }
    const remainingAfterInitial = Math.max(
      0,
      context.remainingAmount - (initial > 0 ? toAccountAmount(initial) : 0)
    );
    if (remainingAfterInitial <= 0 && initial <= 0) {
      setError("Nothing left to contribute for this target");
      return;
    }
    if (
      remainingAfterInitial > 0 &&
      (!preview || preview.installments.length === 0)
    ) {
      setError(
        "No contribution dates fall on or before the target completion date — adjust the first reminder or frequency"
      );
      return;
    }

    setLoading(true);
    try {
      const result = await scheduleInvestmentTowardTarget({
        investmentTargetId: parseInt(targetId, 10),
        accountId: parseInt(accountId, 10),
        initialAmount: toAccountAmount(initial),
        currency: displayCurrency,
        firstReminderAt: firstAt,
        frequency,
        categoryId: parseInt(categoryId, 10),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onSuccess(result.reminderCreated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule investment");
    } finally {
      setLoading(false);
    }
  };

  const selectedTarget = targets.find((t) => String(t.id) === targetId) ?? null;
  const selectedAccount = accounts.find((a) => String(a.id) === accountId) ?? null;
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Schedule an Investment</h2>
            <p className="mt-1 text-sm text-gray-500">
              Link a target and account, contribute now, and schedule the remaining amount until the
              target completion date.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div ref={targetMenuRef} className="relative">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Investment target
            </label>
            <button
              type="button"
              onClick={() => {
                setIsTargetMenuOpen((open) => !open);
                setIsAccountMenuOpen(false);
              }}
              disabled={loading}
              className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              aria-haspopup="listbox"
              aria-expanded={isTargetMenuOpen}
            >
              <span className={`min-w-0 truncate ${selectedTarget ? "text-gray-900" : "text-gray-500"}`}>
                {selectedTarget ? targetOptionLabel(selectedTarget) : "Select target"}
              </span>
              <span className="ml-2 shrink-0 text-gray-400" aria-hidden>
                ▾
              </span>
            </button>
            {/* Keep required semantics for form submit without a native select. */}
            <input type="hidden" value={targetId} required readOnly />

            {isTargetMenuOpen ? (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                <div className="max-h-64 overflow-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th scope="col" className="px-3 py-2 font-medium">
                          Target
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Total
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Remaining
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {targets.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-3 text-gray-500">
                            No targets with a completion date. Add one on a target first.
                          </td>
                        </tr>
                      ) : (
                        targets.map((t) => {
                          const isSelected = String(t.id) === targetId;
                          return (
                            <tr
                              key={t.id}
                              className={`cursor-pointer border-b border-gray-100 last:border-0 hover:bg-blue-50 ${
                                isSelected ? "bg-blue-50" : ""
                              } ${t.hasOpenSeries ? "opacity-60" : ""}`}
                              onClick={() => {
                                if (t.hasOpenSeries) {
                                  setError(
                                    "This target already has a scheduled investment series."
                                  );
                                  return;
                                }
                                setError(null);
                                setTargetId(String(t.id));
                                setIsTargetMenuOpen(false);
                              }}
                            >
                              <td className="max-w-[14rem] px-3 py-2 break-words text-gray-900">
                                <span className="font-medium">{targetOptionLabel(t)}</span>
                                {t.hasOpenSeries ? (
                                  <span className="mt-0.5 block text-[10px] text-amber-700">
                                    Series already open
                                  </span>
                                ) : null}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-800">
                                {formatCurrency(convertAmount(t.targetAmount), displayCurrency)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium text-teal-800">
                                {formatCurrency(convertAmount(t.remainingAmount), displayCurrency)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          {context && !("error" in context) ? (
            <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">Target progress summary</caption>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <th scope="row" className="py-1.5 pr-3 text-left font-medium text-gray-600">
                      Target
                    </th>
                    <td className="py-1.5 text-right tabular-nums font-medium text-gray-900">
                      {formatCurrency(convertAmount(context.targetAmount), displayCurrency)}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-1.5 pr-3 text-left font-medium text-gray-600">
                      Present value
                    </th>
                    <td className="py-1.5 text-right tabular-nums text-gray-900">
                      {formatCurrency(convertAmount(context.investedAmount), displayCurrency)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {context.linkedInvestments.length > 0 ? (
                <div>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th scope="col" className="pb-1.5 pr-2 font-medium">
                          Investment
                        </th>
                        <th scope="col" className="pb-1.5 pr-2 font-medium">
                          Type
                        </th>
                        <th scope="col" className="pb-1.5 text-right font-medium">
                          Present value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {context.linkedInvestments.map((inv) => (
                        <tr key={inv.id} className="border-b border-gray-100 last:border-0">
                          <td className="max-w-[10rem] py-1.5 pr-2 break-words text-gray-800">
                            {inv.name}
                          </td>
                          <td className="py-1.5 pr-2 text-gray-500">
                            {getInvestmentTypeLabel(inv.type as InvestmentInterface["type"])}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-gray-900">
                            {formatCurrency(convertAmount(inv.investedAmount), displayCurrency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  No other investments are linked to this target yet.
                </p>
              )}

              <table className="w-full border-collapse border-t border-gray-200 pt-1 text-sm">
                <tbody>
                  <tr>
                    <th scope="row" className="pt-2 pr-3 text-left font-semibold text-teal-800">
                      Remaining
                    </th>
                    <td className="pt-2 text-right tabular-nums font-semibold text-teal-900">
                      {formatCurrency(convertAmount(context.remainingAmount), displayCurrency)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {context.hasOpenSeries ? (
                <p className="text-xs text-amber-800">
                  An open scheduled series already exists for this target.
                </p>
              ) : null}
            </div>
          ) : null}

          <div ref={accountMenuRef} className="relative">
            <label className="mb-1 block text-sm font-medium text-gray-700">Account</label>
            <button
              type="button"
              onClick={() => {
                setIsAccountMenuOpen((open) => !open);
                setIsTargetMenuOpen(false);
              }}
              disabled={loading}
              className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              aria-haspopup="listbox"
              aria-expanded={isAccountMenuOpen}
            >
              <span
                className={`min-w-0 truncate ${selectedAccount ? "text-gray-900" : "text-gray-500"}`}
              >
                {selectedAccount ? accountOptionLabel(selectedAccount) : "Select account"}
              </span>
              <span className="ml-2 shrink-0 text-gray-400" aria-hidden>
                ▾
              </span>
            </button>
            <input type="hidden" value={accountId} required readOnly />

            {isAccountMenuOpen ? (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                <div className="max-h-64 overflow-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th scope="col" className="px-3 py-2 font-medium">
                          Bank
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Total
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Free
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-3 text-gray-500">
                            No accounts available.
                          </td>
                        </tr>
                      ) : (
                        accounts.map((a) => {
                          const isSelected = String(a.id) === accountId;
                          const total = a.balance || 0;
                          const free = total - (withheldByAccount[String(a.id)] ?? 0);
                          return (
                            <tr
                              key={a.id}
                              className={`cursor-pointer border-b border-gray-100 last:border-0 hover:bg-blue-50 ${
                                isSelected ? "bg-blue-50" : ""
                              }`}
                              onClick={() => {
                                setAccountId(String(a.id));
                                setIsAccountMenuOpen(false);
                              }}
                            >
                              <td className="max-w-[12rem] px-3 py-2 break-words font-medium text-gray-900">
                                {accountOptionLabel(a)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-800">
                                {formatAmount(total)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium text-teal-800">
                                {formatAmount(free)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Initial contribution now ({currencySymbol})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional (0 allowed). Amounts are always marked withheld on the linked account — now if
              you contribute, and again each time you accept a scheduled contribution. Contributions are held as cash toward the target until invested separately.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              First reminder
            </label>
            <input
              type="datetime-local"
              value={firstReminderLocal}
              onChange={(e) => setFirstReminderLocal(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label
              htmlFor="schedule-completion-date"
              className="mb-1 block text-sm font-medium text-gray-700"
              title="Taken from the selected investment target. Change it by editing the target."
            >
              Final date of completion (DD/MM/YYYY)
            </label>
            <input
              id="schedule-completion-date"
              type="text"
              value={
                context && !("error" in context) && context.completionDate
                  ? new Intl.DateTimeFormat("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }).format(new Date(context.completionDate))
                  : ""
              }
              readOnly
              disabled
              title="Taken from the selected investment target. Change it by editing the target."
              className="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-700 focus:outline-none"
              aria-describedby="schedule-completion-date-hint"
            />
            <p id="schedule-completion-date-hint" className="mt-1 text-xs text-gray-500">
              From the selected target — edit the target to change this date.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as ContributionFrequency)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="schedule-contribution-amount"
              className="mb-1 block text-sm font-medium text-gray-700"
              title="Auto-calculated from remaining and frequency"
            >
              Contribution amount ({currencySymbol})
            </label>
            <input
              id="schedule-contribution-amount"
              type="text"
              value={
                preview && preview.amountPerPeriod > 0
                  ? formatCurrency(
                      convertAmount(preview.amountPerPeriod),
                      displayCurrency
                    )
                  : ""
              }
              readOnly
              disabled
              title="Auto-calculated from remaining and frequency"
              className="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-700 focus:outline-none"
              aria-describedby="schedule-contribution-amount-hint"
            />
            <p id="schedule-contribution-amount-hint" className="mt-1 text-xs text-gray-500">
              Auto-calculated from remaining and frequency.
            </p>
          </div>

          {preview && preview.installments.length > 0 ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="max-h-48 overflow-y-auto rounded border border-gray-200 bg-white">
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th scope="col" className="px-2 py-1.5 font-medium">
                        #
                      </th>
                      <th scope="col" className="px-2 py-1.5 font-medium">
                        Date (DD/MM/YYYY)
                      </th>
                      <th scope="col" className="px-2 py-1.5 text-right font-medium">
                        Amount
                      </th>
                      <th scope="col" className="px-2 py-1.5 text-right font-medium">
                        Cumulative
                      </th>
                      <th scope="col" className="px-2 py-1.5 text-right font-medium">
                        Left
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.installments.map((row, index) => {
                      const cumulative = preview.installments
                        .slice(0, index + 1)
                        .reduce((sum, item) => sum + item.amount, 0);
                      const difference = Math.max(
                        0,
                        preview.remainingAmount - cumulative
                      );
                      return (
                        <tr key={row.index} className="border-b border-gray-100 last:border-0">
                          <td className="px-2 py-1.5 tabular-nums text-gray-500">{row.index}</td>
                          <td className="px-2 py-1.5 text-gray-800">
                            {new Intl.DateTimeFormat("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }).format(row.scheduledAt)}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-gray-900">
                            {formatCurrency(convertAmount(row.amount), displayCurrency)}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-gray-900">
                            {formatCurrency(convertAmount(cumulative), displayCurrency)}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-gray-700">
                            {formatCurrency(convertAmount(difference), displayCurrency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td colSpan={3} className="px-2 py-1.5 font-medium text-gray-700">
                        Scheduled total
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-gray-900">
                        {formatCurrency(convertAmount(preview.totalScheduled), displayCurrency)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-gray-700">
                        {formatCurrency(
                          convertAmount(
                            Math.max(0, preview.remainingAmount - preview.totalScheduled)
                          ),
                          displayCurrency
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Expense category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              required
            >
              <option value="">Select category</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-md bg-gray-500 px-4 py-2 text-white hover:bg-gray-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || Boolean(context && !("error" in context) && context.hasOpenSeries)}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Scheduling…" : "Schedule Investment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
