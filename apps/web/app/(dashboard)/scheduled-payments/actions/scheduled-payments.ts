"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import prisma from "@repo/db/client";
import { RecurringFrequency, ScheduledPaymentResolution } from "@prisma/client";
import { authOptions } from "../../../lib/auth";
import { getUserIdFromSession } from "../../../utils/auth";
import { createExpense } from "../../expenses/actions/expenses";
import { Expense, Category } from "../../../types/financial";
import { ScheduledPaymentItem } from "../../../types/scheduled-payment";
import { AccountInterface } from "../../../types/accounts";

function mapAccount(a: {
  id: number;
  holderName: string;
  accountNumber: string;
  branchCode: string;
  bankName: string;
  branchName: string;
  bankAddress: string;
  accountType: string;
  mobileNumbers: string[];
  branchContacts: string[];
  swift: string;
  bankEmail: string;
  accountOpeningDate: Date;
  securityQuestion: string[];
  balance: unknown;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}): AccountInterface {
  return {
    ...a,
    balance: parseFloat(String(a.balance)),
    accountOpeningDate: new Date(a.accountOpeningDate),
  };
}

function toScheduledPaymentItem(row: {
  id: number;
  title: string;
  description: string | null;
  amount: unknown;
  currency: string;
  scheduledAt: Date;
  categoryId: number;
  accountId: number | null;
  userId: number;
  tags: string[];
  notes: string | null;
  isRecurring: boolean;
  recurringFrequency: RecurringFrequency | null;
  resolution: ScheduledPaymentResolution | null;
  resolvedAt: Date | null;
  createdExpenseId: number | null;
  createdAt: Date;
  updatedAt: Date;
  category: Category & { type: string };
  account: Parameters<typeof mapAccount>[0] | null;
}): ScheduledPaymentItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    amount: parseFloat(String(row.amount)),
    currency: row.currency,
    scheduledAt: new Date(row.scheduledAt),
    categoryId: row.categoryId,
    category: row.category as Category,
    accountId: row.accountId,
    account: row.account ? mapAccount(row.account) : null,
    userId: row.userId,
    tags: row.tags || [],
    notes: row.notes,
    isRecurring: row.isRecurring,
    recurringFrequency: row.recurringFrequency,
    resolution: row.resolution,
    resolvedAt: row.resolvedAt ? new Date(row.resolvedAt) : null,
    createdExpenseId: row.createdExpenseId,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function computeNextScheduledAt(from: Date, frequency: RecurringFrequency): Date {
  const d = new Date(from.getTime());
  if (frequency === "DAILY") d.setDate(d.getDate() + 1);
  else if (frequency === "WEEKLY") d.setDate(d.getDate() + 7);
  else if (frequency === "MONTHLY") d.setMonth(d.getMonth() + 1);
  else if (frequency === "YEARLY") d.setFullYear(d.getFullYear() + 1);
  return d;
}

async function createNextRecurringOccurrence(
  source: {
    title: string;
    description: string | null;
    amount: unknown;
    currency: string;
    scheduledAt: Date;
    categoryId: number;
    accountId: number | null;
    userId: number;
    tags: string[];
    notes: string | null;
    isRecurring: boolean;
    recurringFrequency: RecurringFrequency | null;
  }
) {
  if (!source.isRecurring || !source.recurringFrequency) return;
  const nextAt = computeNextScheduledAt(source.scheduledAt, source.recurringFrequency);
  await prisma.scheduledPayment.create({
    data: {
      title: source.title,
      description: source.description,
      amount: source.amount as never,
      currency: source.currency,
      scheduledAt: nextAt,
      categoryId: source.categoryId,
      accountId: source.accountId,
      userId: source.userId,
      tags: source.tags,
      notes: source.notes,
      isRecurring: true,
      recurringFrequency: source.recurringFrequency,
    },
  });
}

const includeRelations = {
  category: true,
  account: true,
} as const;

export async function getScheduledPayments(): Promise<ScheduledPaymentItem[]> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  const userId = getUserIdFromSession(session.user.id);

  const rows = await prisma.scheduledPayment.findMany({
    where: { userId },
    include: includeRelations,
    orderBy: [{ scheduledAt: "desc" }],
  });

  return rows.map((r) => toScheduledPaymentItem(r as never));
}

/** Due items: scheduled time has passed and user has not accepted or rejected yet. */
export async function getDueScheduledPaymentsPending(): Promise<ScheduledPaymentItem[]> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  const userId = getUserIdFromSession(session.user.id);
  const now = new Date();

  const rows = await prisma.scheduledPayment.findMany({
    where: {
      userId,
      resolution: null,
      scheduledAt: { lte: now },
    },
    include: includeRelations,
    orderBy: { scheduledAt: "asc" },
  });

  return rows.map((r) => toScheduledPaymentItem(r as never));
}

export interface CreateScheduledPaymentInput {
  title: string;
  description?: string;
  amount: number;
  currency: string;
  scheduledAt: Date;
  categoryId: number;
  accountId: number | null;
  tags?: string[];
  notes?: string;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
}

export async function createScheduledPayment(input: CreateScheduledPaymentInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  const userId = getUserIdFromSession(session.user.id);

  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, userId, type: "EXPENSE" },
  });
  if (!category) throw new Error("Invalid expense category");

  if (input.accountId) {
    const account = await prisma.account.findFirst({
      where: { id: input.accountId, userId },
    });
    if (!account) throw new Error("Invalid account");
  }

  const isRecurring = Boolean(input.isRecurring && input.recurringFrequency);
  const row = await prisma.scheduledPayment.create({
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      amount: input.amount,
      currency: input.currency,
      scheduledAt: input.scheduledAt,
      categoryId: input.categoryId,
      accountId: input.accountId ?? null,
      userId,
      tags: input.tags ?? [],
      notes: input.notes?.trim() || null,
      isRecurring,
      recurringFrequency: isRecurring ? input.recurringFrequency : null,
    },
    include: includeRelations,
  });

  revalidatePath("/scheduled-payments");
  revalidatePath("/expenses");
  return toScheduledPaymentItem(row as never);
}

export async function deleteScheduledPayment(id: number) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  const userId = getUserIdFromSession(session.user.id);

  const existing = await prisma.scheduledPayment.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new Error("Scheduled payment not found");
  if (existing.resolution !== null) {
    throw new Error("Cannot delete a scheduled payment that was already accepted or rejected");
  }

  await prisma.scheduledPayment.delete({ where: { id } });
  revalidatePath("/scheduled-payments");
  revalidatePath("/expenses");
}

export async function acceptScheduledPayment(id: number) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  const userId = getUserIdFromSession(session.user.id);

  const sp = await prisma.scheduledPayment.findFirst({
    where: { id, userId },
    include: { category: true },
  });
  if (!sp) throw new Error("Scheduled payment not found");
  if (sp.resolution !== null) throw new Error("This scheduled payment was already resolved");
  if (sp.scheduledAt > new Date()) throw new Error("This payment is not due yet");

  const expensePayload: Omit<Expense, "id" | "createdAt" | "updatedAt"> = {
    title: sp.title,
    description: sp.description ?? undefined,
    amount: parseFloat(String(sp.amount)),
    currency: sp.currency,
    date: sp.scheduledAt,
    categoryId: sp.categoryId,
    category: sp.category as Category,
    accountId: sp.accountId ?? null,
    account: null,
    userId,
    tags: sp.tags || [],
    location: [],
    notes: sp.notes ?? undefined,
    isRecurring: false,
    recurringFrequency: undefined,
    transactionLocation: null,
    transactionLocationId: null,
  };

  const expense = await createExpense(expensePayload);

  await prisma.scheduledPayment.update({
    where: { id },
    data: {
      resolution: ScheduledPaymentResolution.ACCEPTED,
      resolvedAt: new Date(),
      createdExpenseId: expense.id,
    },
  });

  await createNextRecurringOccurrence({
    title: sp.title,
    description: sp.description,
    amount: sp.amount,
    currency: sp.currency,
    scheduledAt: sp.scheduledAt,
    categoryId: sp.categoryId,
    accountId: sp.accountId,
    userId: sp.userId,
    tags: sp.tags,
    notes: sp.notes,
    isRecurring: sp.isRecurring,
    recurringFrequency: sp.recurringFrequency,
  });

  revalidatePath("/scheduled-payments");
  revalidatePath("/expenses");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function rejectScheduledPayment(id: number) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  const userId = getUserIdFromSession(session.user.id);

  const sp = await prisma.scheduledPayment.findFirst({
    where: { id, userId },
  });
  if (!sp) throw new Error("Scheduled payment not found");
  if (sp.resolution !== null) throw new Error("This scheduled payment was already resolved");
  if (sp.scheduledAt > new Date()) throw new Error("This payment is not due yet");

  await prisma.scheduledPayment.update({
    where: { id },
    data: {
      resolution: ScheduledPaymentResolution.REJECTED,
      resolvedAt: new Date(),
    },
  });

  await createNextRecurringOccurrence({
    title: sp.title,
    description: sp.description,
    amount: sp.amount,
    currency: sp.currency,
    scheduledAt: sp.scheduledAt,
    categoryId: sp.categoryId,
    accountId: sp.accountId,
    userId: sp.userId,
    tags: sp.tags,
    notes: sp.notes,
    isRecurring: sp.isRecurring,
    recurringFrequency: sp.recurringFrequency,
  });

  revalidatePath("/scheduled-payments");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}
