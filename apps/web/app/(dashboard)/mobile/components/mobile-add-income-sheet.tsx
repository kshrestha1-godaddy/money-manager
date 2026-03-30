"use client";

import { useEffect, useState } from "react";
import { FinancialForm } from "../../../components/shared/FinancialForm";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { getUserSupportedCurrency } from "../../../utils/currency";
import type { CategoryWithFrequencyData } from "../../../utils/categoryFrequency";
import type { AccountInterface } from "../../../types/accounts";
import type { Income } from "../../../types/financial";
import {
  type BaseFormData,
  initializeFormData,
  validateFormData,
  transformFormData,
  showValidationErrors,
  getTransactionPlaceholders,
  buttonClasses,
} from "../../../utils/formUtils";
import { createIncome } from "../../incomes/actions/incomes";

export interface MobileAddIncomeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful create (e.g. refresh parent list). */
  onSuccess: () => void;
  categories: CategoryWithFrequencyData[];
  accounts: AccountInterface[];
}

export function MobileAddIncomeSheet({
  isOpen,
  onClose,
  onSuccess,
  categories,
  accounts,
}: MobileAddIncomeSheetProps) {
  const { currency: userCurrency } = useCurrency();
  const defaultCurrency = getUserSupportedCurrency(userCurrency);
  const [formData, setFormData] = useState<BaseFormData>(initializeFormData(true, defaultCurrency));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const placeholders = getTransactionPlaceholders("INCOME");

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const currentDefaultCurrency = getUserSupportedCurrency(userCurrency);
      setFormData(initializeFormData(true, currentDefaultCurrency));
    }
  }, [isOpen, userCurrency]);

  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        amountCurrency: getUserSupportedCurrency(userCurrency),
      }));
    }
  }, [userCurrency, isOpen]);

  function handleClose() {
    const currentDefaultCurrency = getUserSupportedCurrency(userCurrency);
    setFormData(initializeFormData(true, currentDefaultCurrency));
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validation = validateFormData(formData, categories, accounts);
    if (!validation.isValid) {
      showValidationErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const transformedData = transformFormData(formData, categories, accounts, userCurrency);
      await createIncome(transformedData as Omit<Income, "id" | "createdAt" | "updatedAt">);
      handleClose();
      onSuccess();
    } catch (error) {
      console.error("Error creating income:", error);
      alert("Failed to create income. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const hasCategories = categories.length > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-0 min-w-0 flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-add-income-title"
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
        <h1 id="mobile-add-income-title" className="min-w-0 flex-1 text-base font-semibold text-gray-900">
          {placeholders.modalTitle.add}
        </h1>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-4 pt-2">
          {!hasCategories ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
              You need at least one income category. Add categories from the Incomes page on desktop.
            </p>
          ) : (
            <FinancialForm
              formData={formData}
              onFormDataChange={setFormData}
              categories={categories}
              accounts={accounts}
              transactionType="INCOME"
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
              {isSubmitting ? placeholders.submittingText.add : placeholders.submitText.add}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
