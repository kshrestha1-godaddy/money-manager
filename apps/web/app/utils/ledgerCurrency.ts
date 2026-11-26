import type { Prisma } from "@prisma/client";
import { assertCurrencyCode, type CurrencyCode } from "./currency";

export async function getLockedLedgerCurrency(
  tx: Prisma.TransactionClient,
  userId: number
): Promise<CurrencyCode> {
  await tx.$queryRaw`
    SELECT "id"
    FROM "User"
    WHERE "id" = ${userId}
    FOR UPDATE
  `;

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { currency: true },
  });
  if (!user) throw new Error("User not found");
  return assertCurrencyCode(user.currency);
}

export async function assertOwnedAccount(
  tx: Prisma.TransactionClient,
  userId: number,
  accountId: number
) {
  const account = await tx.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) throw new Error("Account not found or access denied");
  return account;
}
