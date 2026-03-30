"use client";

import { useState, useEffect } from "react";
import { DebtInterface } from "../../../types/debts";
import { AccountInterface } from "../../../types/accounts";
import { getUserAccounts } from "../../accounts/actions/accounts";
import { formatCurrency } from "../../../utils/currency";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { sanitizeFormData, DebtFormData, ValidationError } from "../../../utils/debtValidation";
import { getLocalDateString, buttonClasses } from "../../../utils/formUtils";

export interface DebtAddFormProps {
  enabled: boolean;
  onSubmit: (
    debt: Omit<DebtInterface, "id" | "userId" | "createdAt" | "updatedAt" | "repayments">
  ) => void | Promise<void>;
  onCancel: () => void;
  onAfterSuccess?: () => void;
  footerVariant?: "modal" | "mobile";
}

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";

export function DebtAddForm({
  enabled,
  onSubmit,
  onCancel,
  onAfterSuccess,
  footerVariant = "modal",
}: DebtAddFormProps) {
  const { currency: userCurrency } = useCurrency();

  const [formData, setFormData] = useState({
    borrowerName: "",
    borrowerContact: "",
    borrowerEmail: "",
    amount: 0,
    interestRate: 0,
    dueDate: "",
    lentDate: getLocalDateString(),
    status: "ACTIVE" as DebtInterface["status"],
    purpose: "",
    notes: "",
    accountId: "",
  });

  const [accounts, setAccounts] = useState<AccountInterface[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setFormData({
      borrowerName: "",
      borrowerContact: "",
      borrowerEmail: "",
      amount: 0,
      interestRate: 0,
      dueDate: "",
      lentDate: getLocalDateString(),
      status: "ACTIVE",
      purpose: "",
      notes: "",
      accountId: "",
    });
    setValidationErrors([]);
  }

  async function loadAccounts() {
    try {
      setLoadingAccounts(true);
      const userAccounts = await getUserAccounts();
      if (Array.isArray(userAccounts)) {
        setAccounts(userAccounts);
      } else {
        console.error("Error loading accounts:", (userAccounts as { error?: string })?.error);
        setAccounts([]);
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  }

  useEffect(() => {
    if (!enabled) return;
    void loadAccounts();
  }, [enabled]);

  useEffect(() => {
    if (enabled) return;
    resetForm();
  }, [enabled]);

  const getFieldError = (fieldName: string): string | undefined => {
    return validationErrors.find((error) => error.field === fieldName)?.message;
  };

  const insufficientBalance =
    Boolean(formData.accountId) &&
    formData.amount > 0 &&
    (() => {
      const selectedAccount = accounts.find((acc) => acc.id === parseInt(formData.accountId, 10));
      return Boolean(
        selectedAccount &&
          selectedAccount.balance !== undefined &&
          formData.amount > selectedAccount.balance
      );
    })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setValidationErrors([]);

    if (!formData.borrowerName.trim()) {
      setValidationErrors([{ field: "borrowerName", message: "Borrower name is required" }]);
      setIsSubmitting(false);
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      setValidationErrors([{ field: "amount", message: "Amount must be greater than 0" }]);
      setIsSubmitting(false);
      return;
    }

    if (formData.accountId) {
      const selectedAccount = accounts.find((acc) => acc.id === parseInt(formData.accountId, 10));
      if (selectedAccount && selectedAccount.balance !== undefined) {
        if (formData.amount > selectedAccount.balance) {
          setValidationErrors([
            {
              field: "amount",
              message: `Cannot add debt of ${formatCurrency(formData.amount, userCurrency)}. Account balance is only ${formatCurrency(selectedAccount.balance, userCurrency)}.`,
            },
          ]);
          setIsSubmitting(false);
          return;
        }
      }
    }

    try {
      const sanitizedData = sanitizeFormData(formData as DebtFormData);

      let dueDate: Date | undefined = undefined;
      if (sanitizedData.dueDate && sanitizedData.dueDate.trim() !== "") {
        dueDate = new Date(sanitizedData.dueDate);
      }

      const processedData = {
        borrowerName: sanitizedData.borrowerName,
        borrowerContact: sanitizedData.borrowerContact || undefined,
        borrowerEmail: sanitizedData.borrowerEmail || undefined,
        amount: sanitizedData.amount,
        interestRate: sanitizedData.interestRate,
        lentDate: new Date(sanitizedData.lentDate),
        dueDate,
        status: sanitizedData.status,
        purpose: sanitizedData.purpose || undefined,
        notes: sanitizedData.notes || undefined,
        accountId: sanitizedData.accountId ? parseInt(sanitizedData.accountId, 10) : undefined,
      };

      await onSubmit(processedData);
      resetForm();
      if (onAfterSuccess) onAfterSuccess();
      else onCancel();
    } catch (error) {
      console.error("Error in form submission:", error);
      setValidationErrors([
        {
          field: "general",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formFields = (
    <>
      {getFieldError("general") ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{getFieldError("general")}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Borrower Name *</label>
          <input
            type="text"
            value={formData.borrowerName}
            onChange={(e) => setFormData((prev) => ({ ...prev, borrowerName: e.target.value }))}
            className={inputClass}
            required
            disabled={isSubmitting}
          />
          {getFieldError("borrowerName") ? (
            <p className="mt-1 text-sm text-red-600">{getFieldError("borrowerName")}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Amount *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => setFormData((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
            className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${
              insufficientBalance
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            }`}
            required
            disabled={isSubmitting}
          />
          {formData.accountId && formData.amount > 0 ? (() => {
            const selectedAccount = accounts.find((acc) => acc.id === parseInt(formData.accountId, 10));
            if (
              selectedAccount &&
              selectedAccount.balance !== undefined &&
              formData.amount > selectedAccount.balance
            ) {
              return (
                <p className="mt-1 text-sm text-red-600">
                  Insufficient balance. Available: {formatCurrency(selectedAccount.balance, userCurrency)}
                </p>
              );
            }
            return null;
          })() : null}
          {getFieldError("amount") ? (
            <p className="mt-1 text-sm text-red-600">{getFieldError("amount")}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Bank Account</label>
          <select
            value={formData.accountId}
            onChange={(e) => setFormData((prev) => ({ ...prev, accountId: e.target.value }))}
            className={inputClass}
            disabled={loadingAccounts || isSubmitting}
          >
            <option value="">Select account (optional)</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.bankName} - {account.accountNumber} (
                {account.balance !== undefined
                  ? `Balance: ${formatCurrency(account.balance, userCurrency)}`
                  : "No balance info"}
                )
              </option>
            ))}
          </select>
          {loadingAccounts ? <p className="mt-1 text-sm text-gray-500">Loading accounts...</p> : null}
          <p className="mt-1 text-sm text-gray-500">
            If selected, the debt amount will be deducted from this account&apos;s balance
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Interest Rate (%)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.interestRate}
            onChange={(e) => setFormData((prev) => ({ ...prev, interestRate: parseFloat(e.target.value) || 0 }))}
            className={inputClass}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Lent Date *</label>
          <input
            type="date"
            value={formData.lentDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, lentDate: e.target.value }))}
            className={inputClass}
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Due Date</label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
            className={inputClass}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, status: e.target.value as DebtInterface["status"] }))
            }
            className={inputClass}
            disabled={isSubmitting}
          >
            <option value="ACTIVE">Active</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="FULLY_PAID">Fully Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="DEFAULTED">Defaulted</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Borrower Contact</label>
          <input
            type="tel"
            value={formData.borrowerContact}
            onChange={(e) => setFormData((prev) => ({ ...prev, borrowerContact: e.target.value }))}
            className={inputClass}
            placeholder="Phone number"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Borrower Email</label>
          <input
            type="email"
            value={formData.borrowerEmail}
            onChange={(e) => setFormData((prev) => ({ ...prev, borrowerEmail: e.target.value }))}
            className={inputClass}
            placeholder="email@example.com"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Purpose</label>
        <input
          type="text"
          value={formData.purpose}
          onChange={(e) => setFormData((prev) => ({ ...prev, purpose: e.target.value }))}
          className={inputClass}
          placeholder="e.g., Personal loan, Business loan, Emergency"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          className={inputClass}
          rows={3}
          placeholder="Additional notes about this debt..."
          disabled={isSubmitting}
        />
      </div>
    </>
  );

  if (footerVariant === "mobile") {
    return (
      <form onSubmit={handleSubmit} className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-4 pt-2">
          {formFields}
        </div>
        <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className={buttonClasses.secondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || insufficientBalance}
              className={buttonClasses.primary}
            >
              {isSubmitting ? "Adding…" : "Add debt"}
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formFields}
      <div className="flex justify-end space-x-3 pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || insufficientBalance}
          className={`rounded-md px-4 py-2 focus:outline-none focus:ring-2 ${
            insufficientBalance
              ? "cursor-not-allowed bg-gray-400 text-white"
              : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
          }`}
        >
          Add Debt
        </button>
      </div>
    </form>
  );
}
