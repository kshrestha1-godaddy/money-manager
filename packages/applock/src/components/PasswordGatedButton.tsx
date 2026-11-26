"use client";

/**
 * Drop-in button that requires the lock-screen password before acting.
 */

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { useGatedAction } from "../hooks/useGatedAction";
import type { ConfirmRequestOptions } from "../core/types";

interface PasswordGatedButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** Runs with the verified password once the user confirms. */
  onConfirm: (password: string) => void | Promise<void>;
  /** Copy overrides for the prompt. */
  prompt?: ConfirmRequestOptions;
  /** When false, hide the leading lock icon. Defaults to true. */
  showLockIcon?: boolean;
  children: ReactNode;
}

const lockIconStyle: CSSProperties = {
  display: "inline-block",
  flexShrink: 0,
  width: "0.875em",
  height: "0.875em",
};

/**
 * Inline lock glyph so `@repo/applock` stays free of icon-library deps.
 */
function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={lockIconStyle}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/**
 * A button whose click is gated behind password confirmation.
 *
 * Accepts every native button prop, so an existing button becomes gated by
 * renaming `onClick` to `onConfirm` and keeping its styling untouched. A lock
 * icon is prepended by default so gated deletes are visually distinct.
 *
 * @param props - `onConfirm`, optional prompt copy, and native button props.
 */
export function PasswordGatedButton({
  onConfirm,
  prompt,
  showLockIcon = true,
  children,
  type = "button",
  style,
  ...buttonProps
}: PasswordGatedButtonProps) {
  const handleClick = useGatedAction(onConfirm, prompt);

  const mergedStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    ...style,
  };

  return (
    <button type={type} onClick={() => void handleClick()} {...buttonProps} style={mergedStyle}>
      {showLockIcon ? <LockIcon /> : null}
      {children}
    </button>
  );
}
