"use client";

import { useState, useEffect } from "react";
import { CategoryWithFrequencyData } from "../../../utils/categoryFrequency";
import { AccountInterface } from "../../../types/accounts";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { getUserDualCurrency } from "../../../utils/currency";
import {
  inputClasses,
  selectClasses,
  textareaClasses,
  labelClasses,
  checkboxClasses,
} from "../../../utils/formUtils";
import { createScheduledPayment } from "../../scheduled-payments/actions/scheduled-payments";

const RECURRING_OPTIONS = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;
type RecurringChoice = (typeof RECURRING_OPTIONS)[number];

interface SchedulePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  categories: CategoryWithFrequencyData[];
  accounts: AccountInterface[];
}

function defaultLocalDatetime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function SchedulePaymentModal({
  isOpen,
  onClose,
  onCreated,
  categories,
  accounts,
}: SchedulePaymentModalProps) {
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
    if (isOpen) {
      setAmountCurrency(getUserDualCurrency(userCurrency));
      setScheduledAtLocal(defaultLocalDatetime());
    }
  }, [isOpen, userCurrency]);

  const handleClose = () => {
    setTitle("");
    setAmount("");
    setCategoryId("");
    setAccountId("0");
    setNotes("");
    setIsRecurring(false);
    setRecurringFrequency("MONTHLY");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        recurringFrequency: isRecurring ? (recurringFrequency as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY") : undefined,
      });
      onCreated();
      handleClose();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to schedule payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Schedule payment</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          After the scheduled date and time, you will be asked to accept or reject this payment on
          your next visit. If you accept, the amount is recorded as an expense and deducted from the
          selected account (if any).
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="grid grid-cols-2 gap-3">
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
              id="sp-recurring"
              type="checkbox"
              className={checkboxClasses}
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              disabled={isSubmitting}
            />
            <label htmlFor="sp-recurring" className="text-sm text-gray-700">
              Repeat on a schedule (next occurrence is created after you accept or reject)
            </label>
          </div>
          {isRecurring && (
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
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving…" : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
