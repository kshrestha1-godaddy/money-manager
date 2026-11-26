/**
 * Lock-screen password verification.
 *
 * Mount {@link AppLockGuardProvider} once with a server-side `verifyPassword`,
 * then gate any mutating action with {@link PasswordGatedButton} or
 * {@link useGatedAction}.
 */

export { AppLockGuardProvider, useAppLockGuard } from "./components/AppLockGuardProvider";
export { PasswordGatedButton } from "./components/PasswordGatedButton";
export { PasswordPromptDialog } from "./components/PasswordPromptDialog";
export { useGatedAction, type GatedHandler } from "./hooks/useGatedAction";
export { DEFAULT_GRACE_WINDOW_MS } from "./core/grace-window";
export type {
  ConfirmOutcome,
  ConfirmPassword,
  ConfirmRequestOptions,
  VerifyPassword,
} from "./core/types";
