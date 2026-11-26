"use client";

/**
 * Turns any handler into one that first requires the lock-screen password.
 */

import { useCallback } from "react";
import { useAppLockGuard } from "../components/AppLockGuardProvider";
import type { ConfirmRequestOptions } from "../core/types";

/** A handler that receives the verified password to pass to a server action. */
export type GatedHandler<TArgs extends unknown[], TResult> = (
  password: string,
  ...args: TArgs
) => TResult | Promise<TResult>;

/**
 * Wrap a handler so it runs only after the password is confirmed.
 *
 * The verified password is passed to the handler as its first argument, so the
 * server action it calls can re-verify it.
 *
 * @param handler - Receives the verified password, then the call's own args.
 * @param options - Copy overrides for the prompt.
 * @returns A function taking the original arguments minus the password, which
 *   resolves to the handler's result, or `undefined` if the user cancelled.
 */
export function useGatedAction<TArgs extends unknown[] = [], TResult = void>(
  handler: GatedHandler<TArgs, TResult>,
  options?: ConfirmRequestOptions,
): (...args: TArgs) => Promise<TResult | undefined> {
  const { confirmPassword } = useAppLockGuard();

  return useCallback(
    async (...args: TArgs) => {
      const outcome = await confirmPassword(options);
      if (outcome.status !== "confirmed") return undefined;
      return handler(outcome.password, ...args);
    },
    // Prompt copy is compared field-wise so an inline options object is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [confirmPassword, handler, options?.title, options?.description, options?.confirmLabel, options?.force],
  );
}
