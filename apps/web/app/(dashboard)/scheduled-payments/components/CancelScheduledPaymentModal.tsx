"use client";

import { useEffect, useState } from "react";
import { BUTTON_COLORS } from "../../../config/colorConfig";

interface CancelScheduledPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentTitle: string;
  onConfirm: () => Promise<void>;
}

const secondaryOutline = BUTTON_COLORS.secondaryBlue;
const danger = BUTTON_COLORS.danger;

export function CancelScheduledPaymentModal({
  isOpen,
  onClose,
  paymentTitle,
  onConfirm,
}: CancelScheduledPaymentModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSubmitting(false);
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-scheduled-payment-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="cancel-scheduled-payment-title"
          className="text-lg font-semibold text-gray-900"
        >
          Cancel this scheduled payment?
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium text-gray-800">{paymentTitle || "This payment"}</span> will
          be removed from your schedule. This cannot be undone.
        </p>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={`${secondaryOutline} px-4 py-2.5 text-sm font-medium disabled:opacity-50`}
          >
            Keep scheduled
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={submitting}
            className={`${danger} px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {submitting ? "Cancelling…" : "Cancel payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
