"use client";

import { FormEvent, useState } from "react";
import { updateAppLockPassword } from "../../../actions/app-lock-password";
import { useAppLock } from "../../../providers/AppLockProvider";

export function AppLockPasswordCard() {
  const { isUsingDefaultPassword, markPasswordAsUpdated } = useAppLock();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await updateAppLockPassword({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    setIsSaving(false);

    if ("error" in result) {
      setErrorMessage(result.error);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccessMessage("App lock password updated.");
    markPasswordAsUpdated();
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">App lock password</h2>
        <p className="mt-1 text-sm text-gray-600">
          Set a private password used to unlock your screen lock overlay.
        </p>
      </div>

      {isUsingDefaultPassword ? (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You are still using the default password. Please change it for better security.
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Enter current password"
            autoComplete="current-password"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="At least 6 characters"
            autoComplete="new-password"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Re-enter new password"
            autoComplete="new-password"
            required
          />
        </div>

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
        {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}

        <button
          type="submit"
          disabled={isSaving}
          className="h-10 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {isSaving ? "Saving..." : "Update app lock password"}
        </button>
      </form>
    </section>
  );
}
