"use client";

import { DebtInterface } from "../../../types/debts";
import { DebtAddForm } from "./debt-add-form";

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (debt: Omit<DebtInterface, "id" | "userId" | "createdAt" | "updatedAt" | "repayments">) => void;
}

export function AddDebtModal({ isOpen, onClose, onAdd }: AddDebtModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Add New Debt</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <DebtAddForm enabled={isOpen} onSubmit={onAdd} onCancel={onClose} footerVariant="modal" />
      </div>
    </div>
  );
}
