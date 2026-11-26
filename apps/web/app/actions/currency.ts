"use server";

import prisma from "@repo/db/client";
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

async function hasMonetaryData(userId: number): Promise<boolean> {
  const counts = await Promise.all([
    prisma.account.count({ where: { userId } }),
    prisma.expense.count({ where: { userId } }),
    prisma.income.count({ where: { userId } }),
    prisma.scheduledPayment.count({ where: { userId } }),
    prisma.investment.count({ where: { userId } }),
    prisma.investmentTarget.count({ where: { userId } }),
    prisma.budgetTarget.count({ where: { userId } }),
    prisma.debt.count({ where: { userId } }),
    prisma.goal.count({ where: { userId } }),
    prisma.annuityCalculatorPreset.count({ where: { userId } }),
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
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    });

    if (
      current &&
      normalizeSupportedCurrency(current.currency) !== accountCurrency &&
      (await hasMonetaryData(userId))
    ) {
      throw new Error(
        "Ledger currency cannot be changed after monetary data has been created."
      );
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: { currency: accountCurrency }
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