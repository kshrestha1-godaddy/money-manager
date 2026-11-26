"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useDisplayCurrency } from "../../../hooks/useDisplayCurrency";

interface EditGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goalData: any) => Promise<void>;
  goal: {
    title?: string;
    description?: string | null;
    targetAmount?: number;
    currency?: string;
    startDate?: Date | string;
    targetCompletionDate?: Date | string | null;
    status?: string;
  } | null;
  isLoading?: boolean;
}

export function EditGoalModal({ isOpen, onClose, onSubmit, goal, isLoading = false }: EditGoalModalProps) {
  const {
    accountCurrency,
    displayCurrency,
    toAccountAmount,
    toDisplayAmount,
    currencyRateVersion,
  } = useDisplayCurrency();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetCompletionDate, setTargetCompletionDate] = useState("");
  const [status, setStatus] = useState("PLANNING");

  useEffect(() => {
    if (!isOpen || !goal) return;
    setTitle(goal.title || "");
    setDescription(goal.description || "");
    setTargetAmount(
      goal.targetAmount === undefined
        ? ""
        : toDisplayAmount(goal.targetAmount, goal.currency || accountCurrency).toFixed(2)
    );
    setStartDate(goal.startDate ? new Date(goal.startDate).toISOString().slice(0, 10) : "");
    setTargetCompletionDate(
      goal.targetCompletionDate
        ? new Date(goal.targetCompletionDate).toISOString().slice(0, 10)
        : ""
    );
    setStatus(goal.status || "PLANNING");
  }, [isOpen, goal, accountCurrency, toDisplayAmount, currencyRateVersion]);

  if (!isOpen || !goal) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsedTargetAmount = Number(targetAmount);
    if (!title.trim() || !Number.isFinite(parsedTargetAmount) || parsedTargetAmount < 0) return;
    await onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      targetAmount: toAccountAmount(parsedTargetAmount),
      currency: accountCurrency,
      startDate: startDate ? new Date(startDate) : undefined,
      targetCompletionDate: targetCompletionDate
        ? new Date(targetCompletionDate)
        : null,
      status,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b p-5 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Goal</h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Title
            <input className="mt-1 w-full rounded-md border p-2 dark:bg-gray-900" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
            <textarea className="mt-1 w-full rounded-md border p-2 dark:bg-gray-900" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Target amount ({displayCurrency})
            <input className="mt-1 w-full rounded-md border p-2 dark:bg-gray-900" type="number" min="0" step="0.01" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} required />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Start date
              <input className="mt-1 w-full rounded-md border p-2 dark:bg-gray-900" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Target date
              <input className="mt-1 w-full rounded-md border p-2 dark:bg-gray-900" type="date" value={targetCompletionDate} onChange={(event) => setTargetCompletionDate(event.target.value)} />
            </label>
          </div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
            <select className="mt-1 w-full rounded-md border p-2 dark:bg-gray-900" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="rounded-md border px-4 py-2" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={isLoading} className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
              {isLoading ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}