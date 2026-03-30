"use client";

/**
 * Create scheduled payment (mobile full-screen). Logic matches
 * `SchedulePaymentModal` + `createScheduledPayment`. Account option labels follow the same
 * pattern as the desktop modal; `scheduled-payment-helpers` (`accountDisplay`, `recurringDisplay`)
 * apply when rendering saved rows in `MobileScheduledPaymentsList`.
 */

import { useEffect, useState } from "react";
import type { CategoryWithFrequencyData } from "../../../utils/categoryFrequency";
import type { AccountInterface } from "../../../types/accounts";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { getUserDualCurrency } from "../../../utils/currency";
import {
  inputClasses,
  selectClasses,
  textareaClasses,
  labelClasses,
  checkboxClasses,
  buttonClasses,
} from "../../../utils/formUtils";
import { createScheduledPayment } from "../../scheduled-payments/actions/scheduled-payments";

const RECURRING_OPTIONS = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;
type RecurringChoice = (typeof RECURRING_OPTIONS)[number];

export interface MobileSchedulePaymentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryWithFrequencyData[];
  accounts: AccountInterface[];
}

function defaultLocalDatetime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function MobileSchedulePaymentSheet({
  isOpen,
  onClose,
  onSuccess,
  categories,
  accounts,
}: MobileSchedulePaymentSheetProps) {
  const { currency: userCurrency } = useCurrency();
  const defaultCurrency = getUserDualCurrency(userCurrency);
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [amountCurrency, setAmountCurrency] = useState(defaultCurrency);
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("0");
  const [notes, setNotes] = useState("");
  const [scheduledAtLocal, setScheduledAtLocal] = useState(defaultLocalDatetime());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringChoice>("MONTHLY");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setTitle("");
    setAmount("");
    setCategoryId("");
    setAccountId("0");
    setNotes("");
    setScheduledAtLocal(defaultLocalDatetime());
    setIsRecurring(false);
    setRecurringFrequency("MONTHLY");
    setAmountCurrency(getUserDualCurrency(userCurrency));
  }, [isOpen, userCurrency]);

  function handleClose() {
    setTitle("");
    setAmount("");
    setCategoryId("");
    setAccountId("0");
    setNotes("");
    setIsRecurring(false);
    setRecurringFrequency("MONTHLY");
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      alert("Title is required");
      return;
    }
    const n = parseFloat(amount);
    if (!amount || Number.isNaN(n) || n <= 0) {
      alert("Enter a valid amount");
      return;
    }
    if (!categoryId) {
      alert("Select a category");
      return;
    }

    const scheduledAt = new Date(scheduledAtLocal);
    if (Number.isNaN(scheduledAt.getTime())) {
      alert("Invalid date and time");
      return;
    }

    setIsSubmitting(true);
    try {
      await createScheduledPayment({
        title: title.trim(),
        amount: n,
        currency: amountCurrency,
        scheduledAt,
        categoryId: parseInt(categoryId, 10),
        accountId: accountId === "0" ? null : parseInt(accountId, 10),
        notes: notes.trim() || undefined,
        isRecurring,
        recurringFrequency: isRecurring
          ? (recurringFrequency as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY")
          : undefined,
      });
      handleClose();
      onSuccess();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to save scheduled payment");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const hasCategories = expenseCategories.length > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-0 min-w-0 flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-schedule-payment-title"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-2 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 id="mobile-schedule-payment-title" className="min-w-0 flex-1 text-base font-semibold text-gray-900">
          Schedule payment
        </h1>
      </header>

      <form onSubmit={handleSubmit} className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-4 pt-2">
          <p className="text-sm text-gray-600">
            After the scheduled date and time, you will be asked to accept or reject this payment on your
            next visit. If you accept, the amount is recorded as an expense and deducted from the selected
            account (if any).
          </p>

          {!hasCategories ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
              You need at least one expense category. Add categories from the Expenses page on desktop.
            </p>
          ) : (
            <>
              <div>
                <label className={labelClasses}>Title</label>
                <input
                  className={inputClasses}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClasses}>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputClasses}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div>
                  <label className={labelClasses}>Currency</label>
                  <select
                    className={selectClasses}
                    value={amountCurrency}
                    onChange={(e) => setAmountCurrency(e.target.value as typeof amountCurrency)}
                    disabled={isSubmitting}
                  >
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
                    <option value="NPR">NPR</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClasses}>Category</label>
                <select
                  className={selectClasses}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={isSubmitting}
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
              <div>
                <label className={labelClasses}>Account</label>
                <select
                  className={selectClasses}
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="0">Cash (no bank account)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.bankName} — {a.holderName} ({a.accountType})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClasses}>Scheduled date &amp; time</label>
                <input
                  type="datetime-local"
                  className={inputClasses}
                  value={scheduledAtLocal}
                  onChange={(e) => setScheduledAtLocal(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div>
                <label className={labelClasses}>Notes (optional)</label>
                <textarea
                  className={textareaClasses}
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="mobile-sp-recurring"
                  type="checkbox"
                  className={checkboxClasses}
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  disabled={isSubmitting}
                />
                <label htmlFor="mobile-sp-recurring" className="text-sm text-gray-700">
                  Repeat on a schedule (next occurrence is created after you accept or reject)
                </label>
              </div>
              {isRecurring ? (
                <div>
                  <label className={labelClasses}>Repeat every</label>
                  <select
                    className={selectClasses}
                    value={recurringFrequency}
                    onChange={(e) => setRecurringFrequency(e.target.value as RecurringChoice)}
                    disabled={isSubmitting}
                  >
                    <option value="DAILY">Day</option>
                    <option value="WEEKLY">Week</option>
                    <option value="MONTHLY">Month</option>
                    <option value="YEARLY">Year</option>
                  </select>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className={buttonClasses.secondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasCategories}
              className={buttonClasses.primary}
            >
              {isSubmitting ? "Saving…" : "Schedule"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
