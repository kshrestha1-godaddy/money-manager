"use client";

/**
 * Drop-in button that requires the lock-screen password before acting.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useGatedAction } from "../hooks/useGatedAction";
import type { ConfirmRequestOptions } from "../core/types";

interface PasswordGatedButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** Runs with the verified password once the user confirms. */
  onConfirm: (password: string) => void | Promise<void>;
  /** Copy overrides for the prompt. */
  prompt?: ConfirmRequestOptions;
  children: ReactNode;
}

/**
 * A button whose click is gated behind password confirmation.
 *
 * Accepts every native button prop, so an existing button becomes gated by
 * renaming `onClick` to `onConfirm` and keeping its styling untouched.
 *
 * @param props - `onConfirm`, optional prompt copy, and native button props.
 */
export function PasswordGatedButton({
  onConfirm,
  prompt,
  children,
  type = "button",
  ...buttonProps
}: PasswordGatedButtonProps) {
  const handleClick = useGatedAction(onConfirm, prompt);

  return (
    <button type={type} onClick={() => void handleClick()} {...buttonProps}>
      {children}
    </button>
  );
}
