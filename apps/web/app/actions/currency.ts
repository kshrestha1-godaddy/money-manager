"use server";

import prisma from "@repo/db/client";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { 
    getUserIdFromSession, 
    getAuthenticatedSession 
} from "../utils/auth";
import {
  assertCurrencyCode,
  normalizeSupportedCurrency,
  type CurrencyCode,
} from "../utils/currency";

export interface CurrencyPreferences {
  accountCurrency: CurrencyCode;
  displayCurrency: CurrencyCode;
  isAccountCurrencyLocked: boolean;
}

interface MonetaryDataClient {
  account: Prisma.TransactionClient["account"];
  expense: Prisma.TransactionClient["expense"];
  income: Prisma.TransactionClient["income"];
  scheduledPayment: Prisma.TransactionClient["scheduledPayment"];
  investment: Prisma.TransactionClient["investment"];
  investmentTarget: Prisma.TransactionClient["investmentTarget"];
  budgetTarget: Prisma.TransactionClient["budgetTarget"];
  debt: Prisma.TransactionClient["debt"];
  loan: Prisma.TransactionClient["loan"];
  goal: Prisma.TransactionClient["goal"];
  annuityCalculatorPreset: Prisma.TransactionClient["annuityCalculatorPreset"];
  networthHistory: Prisma.TransactionClient["networthHistory"];
}

async function hasMonetaryData(
  userId: number,
  db: MonetaryDataClient = prisma
): Promise<boolean> {
  const counts = await Promise.all([
    db.account.count({ where: { userId } }),
    db.expense.count({ where: { userId } }),
    db.income.count({ where: { userId } }),
    db.scheduledPayment.count({ where: { userId } }),
    db.investment.count({ where: { userId } }),
    db.investmentTarget.count({ where: { userId } }),
    db.budgetTarget.count({ where: { userId } }),
    db.debt.count({ where: { userId } }),
    db.loan.count({ where: { userId } }),
    db.goal.count({ where: { userId } }),
    db.annuityCalculatorPreset.count({ where: { userId } }),
    db.networthHistory.count({ where: { userId } }),
  ]);
  return counts.some((count) => count > 0);
}

export async function getCurrencyPreferences(): Promise<CurrencyPreferences> {
  const session = await getAuthenticatedSession();
  const userId = getUserIdFromSession(session.user.id);
  const [user, isAccountCurrencyLocked] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true, displayCurrency: true },
    }),
    hasMonetaryData(userId),
  ]);
  const accountCurrency = normalizeSupportedCurrency(user?.currency);
  return {
    accountCurrency,
    displayCurrency: normalizeSupportedCurrency(
      user?.displayCurrency,
      accountCurrency
    ),
    isAccountCurrencyLocked,
  };
}

export async function getUserCurrency(): Promise<string> {
  try {
    return (await getCurrencyPreferences()).accountCurrency;
  } catch (error) {
    console.error("Failed to fetch user currency:", error);
    return "USD";
  }
}

export async function updateUserCurrency(currency: string) {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    const accountCurrency = assertCurrencyCode(currency);
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${userId}
        FOR UPDATE
      `;

      const current = await tx.user.findUnique({
        where: { id: userId },
        select: { currency: true },
      });

      if (
        current &&
        normalizeSupportedCurrency(current.currency) !== accountCurrency &&
        (await hasMonetaryData(userId, tx))
      ) {
        throw new Error(
          "Ledger currency cannot be changed after monetary data has been created."
        );
      }

      await tx.user.update({
        where: { id: userId },
        data: { currency: accountCurrency }
      });
    });
    
    revalidatePath("/");
    console.info(`Ledger currency updated successfully to ${accountCurrency} for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to update currency to ${currency}:`, error);
    throw error instanceof Error ? error : new Error("Failed to update currency");
  }
}

export async function updateDisplayCurrency(currency: string) {
  const session = await getAuthenticatedSession();
  const userId = getUserIdFromSession(session.user.id);
  const displayCurrency = assertCurrencyCode(currency);

  await prisma.user.update({
    where: { id: userId },
    data: { displayCurrency },
  });
  revalidatePath("/");
  return { success: true, displayCurrency };
}