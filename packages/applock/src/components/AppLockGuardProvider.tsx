"use client";

/**
 * Hosts the one password prompt that every gated action shares.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_GRACE_WINDOW_MS,
  openGraceWindow,
  readGraceWindow,
  type GraceEntry,
} from "../core/grace-window";
import type {
  ConfirmOutcome,
  ConfirmPassword,
  ConfirmRequestOptions,
  VerifyPassword,
} from "../core/types";
import { PasswordPromptDialog } from "./PasswordPromptDialog";

const DEFAULT_COPY = {
  title: "Confirm your identity",
  description: "Enter your lock screen password to continue.",
  confirmLabel: "Confirm",
} as const;

interface AppLockGuardContextValue {
  confirmPassword: ConfirmPassword;
  /** Drops any cached verification, so the next gated action prompts again. */
  clearGrace: () => void;
}

const AppLockGuardContext = createContext<AppLockGuardContextValue | undefined>(undefined);

interface AppLockGuardProviderProps {
  children: ReactNode;
  /** Server-side password check supplied by the host application. */
  verifyPassword: VerifyPassword;
  /** How long one verification stays reusable. Pass 0 to always prompt. */
  graceWindowMs?: number;
}

/** A confirmation request awaiting the user. */
interface PendingRequest {
  options: ConfirmRequestOptions;
  resolve: (outcome: ConfirmOutcome) => void;
}

/**
 * Provides password confirmation to any descendant.
 *
 * Exactly one dialog exists for the whole subtree, so gating a button costs
 * nothing beyond the wrapper itself.
 *
 * @param props - Children, the verification function, and the grace window.
 */
export function AppLockGuardProvider({
  children,
  verifyPassword,
  graceWindowMs = DEFAULT_GRACE_WINDOW_MS,
}: AppLockGuardProviderProps) {
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const graceRef = useRef<GraceEntry | null>(null);

  const clearGrace = useCallback(() => {
    graceRef.current = null;
  }, []);

  const confirmPassword = useCallback<ConfirmPassword>(
    (options = {}) => {
      if (!options.force) {
        const cached = readGraceWindow(graceRef.current, Date.now());
        if (cached) return Promise.resolve({ status: "confirmed", password: cached });
      }

      return new Promise<ConfirmOutcome>((resolve) => {
        setPending({ options, resolve });
      });
    },
    [],
  );

  const handleSubmit = useCallback(
    async (password: string): Promise<boolean> => {
      const trimmed = password.trim();
      if (!trimmed) return false;

      let isValid = false;
      try {
        isValid = await verifyPassword(trimmed);
      } catch {
        isValid = false;
      }

      if (!isValid) return false;

      if (graceWindowMs > 0) {
        graceRef.current = openGraceWindow(trimmed, graceWindowMs, Date.now());
      }

      setPending((current) => {
        current?.resolve({ status: "confirmed", password: trimmed });
        return null;
      });
      return true;
    },
    [verifyPassword, graceWindowMs],
  );

  const handleCancel = useCallback(() => {
    setPending((current) => {
      current?.resolve({ status: "cancelled" });
      return null;
    });
  }, []);

  const value = useMemo<AppLockGuardContextValue>(
    () => ({ confirmPassword, clearGrace }),
    [confirmPassword, clearGrace],
  );

  return (
    <AppLockGuardContext.Provider value={value}>
      {children}
      <PasswordPromptDialog
        isOpen={pending !== null}
        title={pending?.options.title ?? DEFAULT_COPY.title}
        description={pending?.options.description ?? DEFAULT_COPY.description}
        confirmLabel={pending?.options.confirmLabel ?? DEFAULT_COPY.confirmLabel}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </AppLockGuardContext.Provider>
  );
}

/**
 * Access password confirmation from a component.
 *
 * @returns The confirmation function and the grace-window reset.
 * @throws If called outside {@link AppLockGuardProvider}.
 */
export function useAppLockGuard(): AppLockGuardContextValue {
  const context = useContext(AppLockGuardContext);
  if (!context) throw new Error("useAppLockGuard must be used within AppLockGuardProvider");
  return context;
}
