"use client";

import { useEffect } from "react";
import { DebtAddForm } from "../../debts/components/debt-add-form";
import { createDebt } from "../../debts/actions/debts";
import type { DebtInterface } from "../../../types/debts";

export interface MobileAddDebtSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MobileAddDebtSheet({ isOpen, onClose, onSuccess }: MobileAddDebtSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-0 min-w-0 flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-add-debt-title"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-2 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 active:bg-gray-200"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 id="mobile-add-debt-title" className="min-w-0 flex-1 text-base font-semibold text-gray-900">
          Add New Debt
        </h1>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <DebtAddForm
          enabled={isOpen}
          onSubmit={async (data) => {
            await createDebt(
              data as Omit<DebtInterface, "id" | "userId" | "createdAt" | "updatedAt" | "repayments">
            );
          }}
          onCancel={onClose}
          onAfterSuccess={() => {
            onSuccess();
            onClose();
          }}
          footerVariant="mobile"
        />
      </div>
    </div>
  );
}
