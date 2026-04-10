import bcrypt from "bcrypt";
import prisma from "@repo/db/client";

export const DEFAULT_APP_LOCK_PASSWORD = "mymoneylog";

interface UserAppLockSettingRow {
  passwordHash: string | null;
  usesDefaultPassword: boolean;
}

export async function getUserAppLockPasswordStatus(userId: number): Promise<{ usesDefaultPassword: boolean }> {
  const rows = await prisma.$queryRaw<UserAppLockSettingRow[]>`
    SELECT "passwordHash", "usesDefaultPassword"
    FROM "UserAppLockSetting"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) return { usesDefaultPassword: true };
  return { usesDefaultPassword: rows[0].usesDefaultPassword };
}

export async function verifyUserAppLockPassword(userId: number, inputPassword: string): Promise<boolean> {
  const password = inputPassword.trim();
  if (!password) return false;

  const rows = await prisma.$queryRaw<UserAppLockSettingRow[]>`
    SELECT "passwordHash", "usesDefaultPassword"
    FROM "UserAppLockSetting"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0 || rows[0].usesDefaultPassword) {
    return password === DEFAULT_APP_LOCK_PASSWORD;
  }

  const hash = rows[0].passwordHash;
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export async function setUserCustomAppLockPassword(userId: number, newPassword: string): Promise<void> {
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.$executeRaw`
    INSERT INTO "UserAppLockSetting" ("userId", "passwordHash", "usesDefaultPassword", "createdAt", "updatedAt")
    VALUES (${userId}, ${hashedPassword}, false, NOW(), NOW())
    ON CONFLICT ("userId")
    DO UPDATE SET
      "passwordHash" = EXCLUDED."passwordHash",
      "usesDefaultPassword" = false,
      "updatedAt" = NOW()
  `;
}
