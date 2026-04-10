"use server";

import { getAuthenticatedSession, getUserIdFromSession } from "../utils/auth";
import {
  DEFAULT_APP_LOCK_PASSWORD,
  getUserAppLockPasswordStatus,
  setUserCustomAppLockPassword,
  verifyUserAppLockPassword,
} from "../lib/security/app-lock-password";

export interface AppLockPasswordStatus {
  usesDefaultPassword: boolean;
}

export async function getAppLockPasswordStatus(): Promise<AppLockPasswordStatus> {
  const session = await getAuthenticatedSession();
  const userId = getUserIdFromSession(session.user.id);
  return getUserAppLockPasswordStatus(userId);
}

export async function verifyCurrentUserAppLockPassword(inputPassword: string): Promise<boolean> {
  const session = await getAuthenticatedSession();
  const userId = getUserIdFromSession(session.user.id);
  return verifyUserAppLockPassword(userId, inputPassword);
}

export async function updateAppLockPassword(form: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ ok: true } | { error: string }> {
  try {
    const currentPassword = form.currentPassword.trim();
    const newPassword = form.newPassword.trim();
    const confirmPassword = form.confirmPassword.trim();

    if (!currentPassword) return { error: "Current password is required" };
    if (!newPassword) return { error: "New password is required" };
    if (newPassword.length < 6) return { error: "New password must be at least 6 characters" };
    if (newPassword.length > 64) return { error: "New password must be 64 characters or fewer" };
    if (newPassword !== confirmPassword) return { error: "New password and confirmation must match" };
    if (newPassword === DEFAULT_APP_LOCK_PASSWORD) {
      return { error: "Please choose a password different from the default password" };
    }

    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    const isCurrentPasswordValid = await verifyUserAppLockPassword(userId, currentPassword);
    if (!isCurrentPasswordValid) return { error: "Current password is incorrect" };

    await setUserCustomAppLockPassword(userId, newPassword);
    return { ok: true };
  } catch (error) {
    console.error("Failed to update app lock password:", error);
    return { error: "Failed to update app lock password" };
  }
}
