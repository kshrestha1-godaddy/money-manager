"use client";

/**
 * The password prompt itself: one dialog, used for every gated action.
 */

import { FormEvent, useEffect, useState } from "react";

interface PasswordPromptDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  /** Verifies the password; returns false to show an inline error. */
  onSubmit: (password: string) => Promise<boolean>;
  onCancel: () => void;
}

/**
 * Modal asking for the lock-screen password.
 *
 * Stays open on an incorrect password so the user can retry, and clears its
 * input whenever it reopens so a password is never left on screen.
 */
export function PasswordPromptDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  onSubmit,
  onCancel,
}: PasswordPromptDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPassword("");
    setError(null);
    setIsSubmitting(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const didVerify = await onSubmit(password);
    setIsSubmitting(false);

    if (!didVerify) {
      setError("Incorrect password. Please try again.");
      setPassword("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <form
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="applock-prompt-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id="applock-prompt-title" className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-gray-600">{description}</p>

        <label htmlFor="applock-prompt-password" className="mt-4 block text-sm font-medium text-gray-700">
          Lock screen password
        </label>
        <input
          id="applock-prompt-password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || password.trim() === ""}
            className="h-10 rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Verifying…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
