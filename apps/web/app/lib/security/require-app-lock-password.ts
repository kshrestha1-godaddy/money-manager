/**
 * Server-side enforcement for password-gated mutations.
 *
 * The client prompt is a convenience; this module is the control. Every gated
 * server action must call it before mutating, so a direct call to the action
 * cannot bypass the prompt.
 */

import { getAuthenticatedSession, getUserIdFromSession } from "../../utils/auth";
import { verifyUserAppLockPassword } from "./app-lock-password";

/** Raised when a gated action is called without a valid lock-screen password. */
export class AppLockPasswordError extends Error {
  constructor(message = "Incorrect lock screen password") {
    super(message);
    this.name = "AppLockPasswordError";
  }
}

/**
 * Verify the lock-screen password of the signed-in user.
 *
 * @param password - The password supplied by the caller.
 * @returns The authenticated user's id, for the action to reuse.
 * @throws AppLockPasswordError If the password is missing or incorrect.
 */
export async function requireAppLockPassword(password: string): Promise<number> {
  const session = await getAuthenticatedSession();
  const userId = getUserIdFromSession(session.user.id);

  const isValid = await verifyUserAppLockPassword(userId, password);
  if (!isValid) throw new AppLockPasswordError();

  return userId;
}
