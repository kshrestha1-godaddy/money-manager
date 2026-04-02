"use client";

import { InvestmentInterface } from "../../../types/investments";
import { InvestmentAddForm } from "./investment-add-form";

interface AddInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When true, Stocks is not available — only one Stocks position per user. */
  hasExistingStocksInvestment?: boolean;
  onAdd: (
    investment: Omit<
      InvestmentInterface,
      "id" | "userId" | "createdAt" | "updatedAt" | "account" | "investmentTarget"
    >
  ) => void;
}

export function AddInvestmentModal({
  isOpen,
  onClose,
  onAdd,
  hasExistingStocksInvestment = false,
}: AddInvestmentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add New Investment</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <InvestmentAddForm
          enabled={isOpen}
          hasExistingStocksInvestment={hasExistingStocksInvestment}
          onSubmit={onAdd}
          onCancel={onClose}
          footerVariant="modal"
        />
      </div>
    </div>
  );
}
