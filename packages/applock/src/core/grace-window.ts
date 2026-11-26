/**
 * Tracks how long a successful verification stays valid.
 *
 * A short grace window keeps a run of gated actions usable without turning the
 * prompt into a reflex. The password is held in memory only, never persisted,
 * so it cannot outlive the page.
 */

/** How long one successful verification remains reusable. */
export const DEFAULT_GRACE_WINDOW_MS = 2 * 60 * 1000;

/** A verification that may still be reusable. */
export interface GraceEntry {
  password: string;
  expiresAt: number;
}

/**
 * Create a grace entry valid from now.
 *
 * @param password - The password that just verified successfully.
 * @param windowMs - How long the entry stays valid.
 * @param now - Current epoch milliseconds.
 * @returns The entry to hold until it expires.
 */
export function openGraceWindow(password: string, windowMs: number, now: number): GraceEntry {
  return { password, expiresAt: now + windowMs };
}

/**
 * Read a grace entry if it has not expired.
 *
 * @param entry - The held entry, if any.
 * @param now - Current epoch milliseconds.
 * @returns The still-valid password, or null.
 */
export function readGraceWindow(entry: GraceEntry | null, now: number): string | null {
  if (!entry || entry.expiresAt <= now) return null;
  return entry.password;
}
