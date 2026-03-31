"use client";

import { useEffect, useState } from "react";
import { ExpenseForm } from "../../expenses/components/ExpenseForm";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { getUserDualCurrency } from "../../../utils/currency";
import type { CategoryWithFrequencyData } from "../../../utils/categoryFrequency";
import type { AccountInterface } from "../../../types/accounts";
import type { Expense } from "../../../types/financial";
import {
  type BaseFormData,
  initializeFormData,
  validateFormData,
  transformFormData,
  extractFormData,
  showValidationErrors,
  getTransactionPlaceholders,
  buttonClasses,
} from "../../../utils/formUtils";
import { createExpense, updateExpense } from "../../expenses/actions/expenses";

export interface MobileAddExpenseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful create or update (e.g. refresh parent list). */
  onSuccess: () => void;
  categories: CategoryWithFrequencyData[];
  accounts: AccountInterface[];
  mode?: "add" | "edit";
  /** Required when `mode` is `edit` and the sheet is open. */
  expenseToEdit?: Expense | null;
}

export function MobileAddExpenseSheet({
  isOpen,
  onClose,
  onSuccess,
  categories,
  accounts,
  mode = "add",
  expenseToEdit = null,
}: MobileAddExpenseSheetProps) {
  const { currency: userCurrency } = useCurrency();
  const defaultCurrency = getUserDualCurrency(userCurrency);
  const [formData, setFormData] = useState<BaseFormData>(initializeFormData(true, defaultCurrency));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const placeholders = getTransactionPlaceholders("EXPENSE");
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isEdit || !expenseToEdit) return;
    setFormData(extractFormData(expenseToEdit));
  }, [isOpen, isEdit, expenseToEdit]);

  useEffect(() => {
    if (!isOpen || isEdit) return;
    const currentDefaultCurrency = getUserDualCurrency(userCurrency);
    setFormData(initializeFormData(true, currentDefaultCurrency));
  }, [isOpen, isEdit, userCurrency]);

  useEffect(() => {
    if (!isOpen || isEdit) return;
    setFormData((prev) => ({
      ...prev,
      amountCurrency: getUserDualCurrency(userCurrency),
    }));
  }, [userCurrency, isOpen, isEdit]);

  function handleClose() {
    const currentDefaultCurrency = getUserDualCurrency(userCurrency);
    if (isEdit && expenseToEdit) {
      setFormData(extractFormData(expenseToEdit));
    } else {
      setFormData(initializeFormData(true, currentDefaultCurrency));
    }
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isEdit && !expenseToEdit) return;

    const validation = validateFormData(formData, categories, accounts);
    if (!validation.isValid) {
      showValidationErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const expense = transformFormData(formData, categories, accounts, userCurrency);
      if (isEdit && expenseToEdit) {
        await updateExpense(
          expenseToEdit.id,
          expense as Partial<Omit<Expense, "id" | "createdAt" | "updatedAt">>
        );
      } else {
        await createExpense(expense as Omit<Expense, "id" | "createdAt" | "updatedAt">);
      }
      handleClose();
      onSuccess();
    } catch (error) {
      console.error(isEdit ? "Error updating expense:" : "Error creating expense:", error);
      alert(isEdit ? "Failed to update expense. Please try again." : "Failed to create expense. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const hasCategories = categories.length > 0;
  const modalTitle = isEdit ? placeholders.modalTitle.edit : placeholders.modalTitle.add;
  const submitText = isEdit ? placeholders.submitText.edit : placeholders.submitText.add;
  const submittingText = isEdit ? placeholders.submittingText.edit : placeholders.submittingText.add;

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-0 min-w-0 flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-add-expense-title"
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
        <h1 id="mobile-add-expense-title" className="min-w-0 flex-1 text-base font-semibold text-gray-900">
          {modalTitle}
        </h1>
      </header>

      <form onSubmit={handleSubmit} className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-4 pt-2">
          {!hasCategories ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
              You need at least one expense category. Add categories from the Expenses page on desktop.
            </p>
          ) : (
            <ExpenseForm
              formData={formData}
              onFormDataChange={setFormData}
              categories={categories}
              accounts={accounts}
              disabled={isSubmitting}
            />
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
              {isSubmitting ? submittingText : submitText}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
