"use client";

import { useState, useCallback, useEffect } from "react";
import { formatCurrency } from "../../../utils/currency";
import { BUTTON_COLORS } from "../../../config/colorConfig";
import { convertCurrencySync } from "../../../utils/currencyConversion";

export interface MetalSpotRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  spotPerUnitDisplay: number;
  onApply: (rateInDisplayCurrency: number) => void;
  metal: "gold" | "silver";
  defaultInrPerUnit: number;
}

const primaryButton = BUTTON_COLORS.primary;
const secondaryButton = BUTTON_COLORS.secondaryBlue;

export function MetalSpotRateModal({
  isOpen,
  onClose,
  currency,
  spotPerUnitDisplay,
  onApply,
  metal,
  defaultInrPerUnit,
}: MetalSpotRateModalProps) {
  const [rate, setRate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const label = metal === "gold" ? "Gold" : "Silver";
  const focusRing = metal === "gold" ? "focus:ring-amber-500" : "focus:ring-slate-500";

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
      setError(`Enter a ${label.toLowerCase()} spot rate greater than zero.`);
      return;
    }
    onApply(n);
    setRate("");
    handleClose();
  };

  const defaultInDisplay = convertCurrencySync(defaultInrPerUnit, "INR", currency);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
        role="dialog"
        aria-labelledby="metal-spot-modal-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="metal-spot-modal-title" className="text-xl font-semibold text-gray-900">
            Update {label.toLowerCase()} spot rate
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
          Quantity for {label.toLowerCase()} is in <strong>grams (gm)</strong>. Current value is{" "}
          <strong>quantity (g) × this rate</strong> ({currency} per gram). Purchase cost stays{" "}
          <strong>quantity × your purchase price per gram</strong> from each position. This rate is
          saved in your browser only.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div>
            <label
              htmlFor={`metal-spot-rate-${metal}`}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {label} spot rate ({currency} / gm)
            </label>
            <input
              id={`metal-spot-rate-${metal}`}
              type="number"
              step="any"
              min="0"
              className={`w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 ${focusRing}`}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 131125"
              required
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Default if you never saved: {formatCurrency(defaultInrPerUnit, "INR")} →{" "}
              {formatCurrency(defaultInDisplay, currency)} in your currency.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Preview: 1 gm at this rate ={" "}
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
