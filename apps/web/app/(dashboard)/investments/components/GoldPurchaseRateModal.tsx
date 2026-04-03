"use client";

import { useState, useCallback, useEffect } from "react";
import { formatCurrency } from "../../../utils/currency";
import { BUTTON_COLORS } from "../../../config/colorConfig";
import { convertCurrencySync } from "../../../utils/currencyConversion";
import { DEFAULT_GOLD_SPOT_INR_PER_UNIT } from "../utils/goldSpotStorage";

interface GoldPurchaseRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  /** Current spot per unit in display currency (for defaulting the input). */
  spotPerUnitDisplay: number;
  onApply: (rateInDisplayCurrency: number) => void;
}

const primaryButton = BUTTON_COLORS.primary;
const secondaryButton = BUTTON_COLORS.secondaryBlue;

export function GoldPurchaseRateModal({
  isOpen,
  onClose,
  currency,
  spotPerUnitDisplay,
  onApply,
}: GoldPurchaseRateModalProps) {
  const [rate, setRate] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setRate(
      spotPerUnitDisplay > 0 && Number.isFinite(spotPerUnitDisplay)
        ? String(spotPerUnitDisplay)
        : ""
    );
    setError(null);
  }, [isOpen, spotPerUnitDisplay]);

  const handleClose = useCallback(() => {
    setRate("");
    setError(null);
    onClose();
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const n = parseFloat(rate);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a gold spot rate greater than zero.");
      return;
    }
    onApply(n);
    setRate("");
    handleClose();
  };

  const defaultInDisplay = convertCurrencySync(
    DEFAULT_GOLD_SPOT_INR_PER_UNIT,
    "INR",
    currency
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
        role="dialog"
        aria-labelledby="gold-rate-modal-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="gold-rate-modal-title" className="text-xl font-semibold text-gray-900">
            Update gold spot rate
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          Current value for gold positions is <strong>quantity × this rate</strong> (per unit of
          quantity). Purchase cost stays <strong>quantity × your purchase price per unit</strong> from
          each position. This rate is saved in your browser only.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div>
            <label htmlFor="gold-spot-rate" className="mb-1 block text-sm font-medium text-gray-700">
              Gold spot rate ({currency} per unit)
            </label>
            <input
              id="gold-spot-rate"
              type="number"
              step="any"
              min="0"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 131125"
              required
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Default if you never saved:{" "}
              {formatCurrency(DEFAULT_GOLD_SPOT_INR_PER_UNIT, "INR")} →{" "}
              {formatCurrency(defaultInDisplay, currency)} in your currency.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Preview: 1 unit at this rate ={" "}
              {rate && parseFloat(rate) > 0 ? formatCurrency(parseFloat(rate), currency) : "—"}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={handleClose} className={secondaryButton}>
              Cancel
            </button>
            <button type="submit" className={primaryButton}>
              Save in this browser
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
