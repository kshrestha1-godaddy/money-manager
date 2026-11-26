/**
 * Contracts shared by the app-lock provider, hooks and components.
 *
 * The package owns no credentials and performs no verification itself: the
 * host application supplies a `verifyPassword` function that checks the
 * password server-side. That keeps bcrypt, Prisma and session handling out of
 * this package entirely.
 */

/**
 * Verifies a lock-screen password against the current user.
 *
 * Implementations must perform the check on the server.
 *
 * @param password - The password as typed by the user.
 * @returns Whether the password is correct.
 */
export type VerifyPassword = (password: string) => Promise<boolean>;

/** Outcome of a gated action requested through {@link ConfirmPassword}. */
export type ConfirmOutcome =
  | { status: "confirmed"; password: string }
  | { status: "cancelled" };

/**
 * Requests password confirmation, resolving once the user confirms or cancels.
 *
 * Resolves immediately with a cached password while a grace window is open.
 */
export type ConfirmPassword = (options?: ConfirmRequestOptions) => Promise<ConfirmOutcome>;

/** Copy overrides for a single confirmation prompt. */
export interface ConfirmRequestOptions {
  /** Dialog heading. */
  title?: string;
  /** Sentence explaining what is about to happen. */
  description?: string;
  /** Label of the confirm button. */
  confirmLabel?: string;
  /** Skip the grace window and always prompt for this request. */
  force?: boolean;
}
