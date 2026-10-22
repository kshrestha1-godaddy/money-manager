"use server";

import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getUserIdFromSession } from "../../../utils/auth";
import { getCurrencyRateConfigQuery } from "../../../data/currency-rate-config";
import { convertCurrencySync } from "../../../utils/currencyConversion";
import { revalidatePath } from "next/cache";
import type { StockPurchase } from "../utils/stockPurchases";

export async function getExpensePortfolioPurchases(
  type: "STOCKS" | "SIP",
): Promise<{
  currency: string;
  purchases: StockPurchase[];
}> {
  if (type !== "STOCKS" && type !== "SIP")
    throw new Error("Invalid portfolio type");
  const label = type === "SIP" ? "SIP" : "Stocks";
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  const userId = getUserIdFromSession(session.user.id);
  const [user, expenses, { matrix }] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    }),
    prisma.expense.findMany({
      where: {
        userId,
        category: {
          type: "EXPENSE",
          name: { equals: label, mode: "insensitive" },
        },
      },
      select: {
        id: true,
        title: true,
        date: true,
        amount: true,
        currency: true,
        description: true,
        category: { select: { name: true } },
        account: {
          select: {
            bankName: true,
            holderName: true,
            nickname: true,
            accountNumber: true,
          },
        },
        tags: true,
        location: true,
        transactionLocation: { select: { latitude: true, longitude: true } },
        notes: true,
        receipt: true,
        isRecurring: true,
        recurringFrequency: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { date: "desc" },
    }),
    getCurrencyRateConfigQuery(),
  ]);
  const currency = (user?.currency?.trim() || "USD").toUpperCase();
  return {
    currency,
    purchases: expenses.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date.toISOString(),
      originalAmount: Number(e.amount),
      currency: (e.currency?.trim() || "USD").toUpperCase(),
      description: e.description,
      category: e.category.name,
      account: e.account,
      tags: e.tags,
      location: e.location,
      coordinates: e.transactionLocation
        ? {
            latitude: Number(e.transactionLocation.latitude),
            longitude: Number(e.transactionLocation.longitude),
          }
        : null,
      notes: e.notes,
      receipt: e.receipt,
      isRecurring: e.isRecurring,
      recurringFrequency: e.recurringFrequency,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      amount: convertCurrencySync(
        Number(e.amount),
        (e.currency?.trim() || "USD").toUpperCase(),
        currency,
        matrix,
      ),
    })),
  };
}

/** Update valuation only: purchases have already been paid for through expenses. */
export async function saveExpensePortfolioCurrentValue(
  type: "STOCKS" | "SIP",
  value: number,
  currency: string,
) {
  if (type !== "STOCKS" && type !== "SIP")
    throw new Error("Invalid portfolio type");
  const label = type === "SIP" ? "SIP" : "Stocks";
  if (!Number.isFinite(value) || value < 0 || value > 1e15)
    throw new Error("Enter a valid non-negative current value.");
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  const userId = getUserIdFromSession(session.user.id);
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    });
    if ((user?.currency?.trim() || "USD").toUpperCase() !== currency)
      throw new Error("Your currency changed. Refresh before saving.");
    const positions = await tx.investment.findMany({
      where: { userId, type },
    });
    if (!positions.length) {
      await tx.investment.create({
        data: {
          userId,
          name: `${label} portfolio`,
          type,
          quantity: 1,
          purchasePrice: 0,
          currentPrice: value,
          purchaseDate: new Date(),
          deductFromAccount: false,
        },
      });
    } else {
      // Keep existing target links and quantities; distribute the total valuation proportionally.
      const total = positions.reduce(
        (sum, p) => sum + Number(p.quantity) * Number(p.currentPrice),
        0,
      );
      if (positions.some((p) => Number(p.quantity) <= 0))
        throw new Error(
          `An existing ${label} position has an invalid quantity. Correct it before updating the portfolio value.`,
        );
      for (const p of positions) {
        const weight =
          total > 0
            ? (Number(p.quantity) * Number(p.currentPrice)) / total
            : 1 / positions.length;
        await tx.investment.update({
          where: { id: p.id },
          data: { currentPrice: (value * weight) / Number(p.quantity) },
        });
      }
    }
  });
  revalidatePath("/investments");
  revalidatePath(type === "SIP" ? "/sip" : "/stocks");
  revalidatePath("/dashboard");
}
