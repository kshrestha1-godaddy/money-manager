"use server";

import prisma from "@repo/db/client";
import { revalidatePath } from "next/cache";
import { getAuthenticatedSession, getUserIdFromSession } from "../utils/auth";
import { DEFAULT_CURRENCY_ANCHORS } from "../utils/currencyRates";

export interface CurrencyRateConfigData {
  inrToNpr: number;
  nprPerUsd: number;
}

export async function getCurrencyRateConfig(): Promise<CurrencyRateConfigData> {
  const session = await getAuthenticatedSession();
  const userId = getUserIdFromSession(session.user.id);
  const row = await prisma.currencyRateConfig.findUnique({ where: { userId } });
  const fallback = row
    ? null
    : await prisma.currencyRateConfig.findUnique({ where: { id: 1 } });
  const resolved = row || fallback;
  if (!resolved) {
    return { ...DEFAULT_CURRENCY_ANCHORS };
  }
  return {
    inrToNpr: Number(resolved.inrToNpr),
    nprPerUsd: Number(resolved.nprPerUsd),
  };
}

export async function updateCurrencyRateConfig(
  data: CurrencyRateConfigData
): Promise<void> {
  const session = await getAuthenticatedSession();
  const userId = getUserIdFromSession(session.user.id);

  if (
    !Number.isFinite(data.inrToNpr) ||
    !Number.isFinite(data.nprPerUsd) ||
    data.inrToNpr <= 0 ||
    data.nprPerUsd <= 0
  ) {
    throw new Error("Exchange rates must be positive numbers.");
  }

  await prisma.currencyRateConfig.upsert({
    where: { userId },
    create: {
      userId,
      inrToNpr: data.inrToNpr,
      nprPerUsd: data.nprPerUsd,
    },
    update: {
      inrToNpr: data.inrToNpr,
      nprPerUsd: data.nprPerUsd,
    },
  });

  revalidatePath("/settings");
}
