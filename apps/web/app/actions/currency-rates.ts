"use server";

import prisma from "@repo/db/client";
import { revalidatePath } from "next/cache";
import { getAuthenticatedSession } from "../utils/auth";
import { DEFAULT_CURRENCY_ANCHORS } from "../utils/currencyRates";

export interface CurrencyRateConfigData {
  inrToNpr: number;
  nprPerUsd: number;
}

export async function canManageCurrencyRates(): Promise<boolean> {
  const session = await getAuthenticatedSession();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(
    adminEmail &&
    session.user.email?.trim().toLowerCase() === adminEmail
  );
}

export async function getCurrencyRateConfig(): Promise<CurrencyRateConfigData> {
  await getAuthenticatedSession();
  const row = await prisma.currencyRateConfig.findUnique({ where: { id: 1 } });
  if (!row) {
    return { ...DEFAULT_CURRENCY_ANCHORS };
  }
  return {
    inrToNpr: Number(row.inrToNpr),
    nprPerUsd: Number(row.nprPerUsd),
  };
}

export async function updateCurrencyRateConfig(
  data: CurrencyRateConfigData
): Promise<void> {
  const session = await getAuthenticatedSession();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const userEmail = session.user.email?.trim().toLowerCase();
  if (!adminEmail || userEmail !== adminEmail) {
    throw new Error("Only the configured administrator can update global exchange rates.");
  }

  if (
    !Number.isFinite(data.inrToNpr) ||
    !Number.isFinite(data.nprPerUsd) ||
    data.inrToNpr <= 0 ||
    data.nprPerUsd <= 0
  ) {
    throw new Error("Exchange rates must be positive numbers.");
  }

  await prisma.currencyRateConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      inrToNpr: data.inrToNpr,
      nprPerUsd: data.nprPerUsd,
    },
    update: {
      inrToNpr: data.inrToNpr,
      nprPerUsd: data.nprPerUsd,
    },
  });

  revalidatePath("/notifications");
}
