"use client";

import { useState, useCallback } from "react";
import { bulkUpdateGoldPurchasePrices } from "../actions/investments";
import { formatCurrency } from "../../../utils/currency";
import { BUTTON_COLORS } from "../../../config/colorConfig";

interface GoldPurchaseRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  goldCount: number;
  onApplied: (updatedCount: number) => void;
}

const primaryButton = BUTTON_COLORS.primary;
const secondaryButton = BUTTON_COLORS.secondaryBlue;

export function GoldPurchaseRateModal({
  isOpen,
  onClose,
  currency,
  goldCount,
  onApplied,
}: GoldPurchaseRateModalProps) {
  const [rate, setRate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (!loading) {
      setRate("");
      setError(null);
      onClose();
    }
  }, [loading, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const n = parseFloat(rate);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a purchase rate greater than zero.");
      return;
    }
    setLoading(true);
    try {
      const { updated } = await bulkUpdateGoldPurchasePrices(n);
      setRate("");
      onApplied(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
        role="dialog"
        aria-labelledby="gold-rate-modal-title"
        aria-describedby="gold-rate-modal-desc"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="gold-rate-modal-title" className="text-xl font-semibold text-gray-900">
            Update Gold Purchase Rate
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            aria-label="Close"
            disabled={loading}
          >
            ✕
          </button>
        </div>


        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div>
            <label htmlFor="gold-purchase-rate" className="mb-1 block text-sm font-medium text-gray-700">
              New purchase rate ({currency} per unit)
            </label>
            <input
              id="gold-purchase-rate"
              type="number"
              step="any"
              min="0"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 131125"
              disabled={loading}
              required
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Example preview: 1 unit at this rate = {rate && parseFloat(rate) > 0 ? formatCurrency(parseFloat(rate), currency) : "—"}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={handleClose} className={secondaryButton} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className={primaryButton} disabled={loading || goldCount === 0}>
              {loading ? "Applying…" : "Apply to all gold positions"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
