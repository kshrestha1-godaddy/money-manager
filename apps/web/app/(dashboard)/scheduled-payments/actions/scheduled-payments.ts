"use server";

import { computeNextScheduledAt } from "../../../utils/scheduledPaymentTime";
import { SUPPORTED_CURRENCIES } from "../../../utils/currency";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import prisma from "@repo/db/client";
import { Prisma, RecurringFrequency, ScheduledPaymentResolution } from "@prisma/client";
import { authOptions } from "../../../lib/auth";
import { getUserIdFromSession } from "../../../utils/auth";
import { createExpenseInTransaction } from "../../../utils/createExpenseInTransaction";
import { autoBookmarkHighValueTransaction } from "../../../utils/autoBookmarkUtils";
import { Expense, Category } from "../../../types/financial";
import { ScheduledPaymentItem } from "../../../types/scheduled-payment";
import { AccountInterface } from "../../../types/accounts";
import { verifyUserAppLockPassword } from "../../../lib/security/app-lock-password";

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
  },
  tx: Prisma.TransactionClient
) {
  if (!source.isRecurring || !source.recurringFrequency) return;
  const user = await tx.user.findUnique({ where: { id: source.userId }, select: { timezone: true } });
  const nextAt = computeNextScheduledAt(source.scheduledAt, source.recurringFrequency, user?.timezone ?? "UTC");
  await tx.scheduledPayment.create({
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

/**
 * Previously accepted occurrences that belong to the same recurring series as `id`.
 * Only returns results when the current payment is still unresolved (scheduled).
 */
export async function getAcceptedRecurringHistory(
  id: number
): Promise<ScheduledPaymentItem[]> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  const userId = getUserIdFromSession(session.user.id);

  const current = await prisma.scheduledPayment.findFirst({
    where: { id, userId },
  });
  if (!current) throw new Error("Scheduled payment not found");
  if (!current.isRecurring || !current.recurringFrequency) return [];
  if (current.resolution !== null) return [];

  const rows = await prisma.scheduledPayment.findMany({
    where: {
      userId,
      id: { not: id },
      resolution: ScheduledPaymentResolution.ACCEPTED,
      isRecurring: true,
      recurringFrequency: current.recurringFrequency,
      title: current.title,
      categoryId: current.categoryId,
      accountId: current.accountId,
      currency: current.currency,
    },
    include: includeRelations,
    orderBy: { scheduledAt: "desc" },
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

function validateScheduledPaymentInput(input: CreateScheduledPaymentInput) {
  if (!input || typeof input !== "object") throw new Error("Invalid scheduled payment");
  if (typeof input.title !== "string" || !input.title.trim()) {
    throw new Error("Title is required");
  }
  if (typeof input.amount !== "number" || !Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Amount must be a positive finite number");
  }
  if (!SUPPORTED_CURRENCIES.some(currency => currency === input.currency)) {
    throw new Error("Unsupported currency");
  }
  if (!(input.scheduledAt instanceof Date) || !Number.isFinite(input.scheduledAt.getTime())) {
    throw new Error("Invalid scheduled date and time");
  }
  if (!Number.isSafeInteger(input.categoryId) || input.categoryId <= 0) {
    throw new Error("Invalid expense category");
  }
  if (input.accountId !== null && (!Number.isSafeInteger(input.accountId) || input.accountId <= 0)) {
    throw new Error("Invalid account");
  }
  if (input.isRecurring !== undefined && typeof input.isRecurring !== "boolean") {
    throw new Error("Invalid recurring setting");
  }
  const frequencies: readonly string[] = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
  if ((input.isRecurring && !input.recurringFrequency) ||
      (input.recurringFrequency !== undefined && !frequencies.includes(input.recurringFrequency))) {
    throw new Error("Select a valid recurring frequency");
  }
  for (const field of ["description", "notes"] as const) {
    if (input[field] !== undefined && typeof input[field] !== "string") {
      throw new Error(`Invalid ${field}`);
    }
  }
  if (input.tags !== undefined && (!Array.isArray(input.tags) || input.tags.some(tag => typeof tag !== "string"))) {
    throw new Error("Tags must be a list of strings");
  }
}

export async function createScheduledPayment(input: CreateScheduledPaymentInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  const userId = getUserIdFromSession(session.user.id);
  validateScheduledPaymentInput(input);

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

  revalidatePath("/expenses");
  return toScheduledPaymentItem(row as never);
}

export interface UpdateScheduledPaymentInput {
  id: number;
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

export async function updateScheduledPayment(input: UpdateScheduledPaymentInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  const userId = getUserIdFromSession(session.user.id);
  validateScheduledPaymentInput(input);
  if (!Number.isSafeInteger(input.id) || input.id <= 0) {
    throw new Error("Invalid scheduled payment ID");
  }

  const existing = await prisma.scheduledPayment.findFirst({
    where: { id: input.id, userId },
  });
  if (!existing) throw new Error("Scheduled payment not found");
  if (existing.resolution !== null) {
    throw new Error("Cannot edit a scheduled payment that was already accepted or rejected");
  }

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

  const row = await prisma.scheduledPayment.update({
    where: { id: input.id },
    data: {
      title: input.title.trim(),
      // The scheduling modal does not edit these fields. Omission preserves
      // their saved values; an explicit empty string/array still clears them.
      ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
      amount: input.amount,
      currency: input.currency,
      scheduledAt: input.scheduledAt,
      categoryId: input.categoryId,
      accountId: input.accountId ?? null,
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      notes: input.notes?.trim() || null,
      isRecurring,
      recurringFrequency: isRecurring ? input.recurringFrequency : null,
    },
    include: includeRelations,
  });

  revalidatePath("/expenses");
  revalidatePath("/scheduled-payments");
  return toScheduledPaymentItem(row as never);
}

/** Move scheduled time forward (e.g. from dashboard prompt). Must be strictly in the future. */
export async function postponeScheduledPayment(id: number, newScheduledAt: Date) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  const userId = getUserIdFromSession(session.user.id);
  const now = new Date();

  const existing = await prisma.scheduledPayment.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new Error("Scheduled payment not found");
  if (existing.resolution !== null) {
    throw new Error("This scheduled payment was already resolved");
  }

  const at = new Date(newScheduledAt);
  if (Number.isNaN(at.getTime())) throw new Error("Invalid date");
  if (at <= now) {
    throw new Error("New date and time must be in the future");
  }

  await prisma.scheduledPayment.update({
    where: { id },
    data: { scheduledAt: at },
  });

  revalidatePath("/expenses");
  revalidatePath("/scheduled-payments");
  revalidatePath("/dashboard");
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
  revalidatePath("/expenses");
  revalidatePath("/scheduled-payments");
}

export async function deleteScheduledPayments(
  ids: number[]
): Promise<{ ok: true; deleted: number } | { error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };
    const userId = getUserIdFromSession(session.user.id);
    const unique = [...new Set(ids)].filter((id) => Number.isFinite(id) && id > 0);
    if (unique.length === 0) return { error: "No payments selected" };

    const result = await prisma.scheduledPayment.deleteMany({
      where: { userId, id: { in: unique }, resolution: null },
    });
    revalidatePath("/expenses");
    revalidatePath("/scheduled-payments");
    return { ok: true, deleted: result.count };
  } catch (e) {
    console.error(e);
    return { error: e instanceof Error ? e.message : "Failed to delete scheduled payments" };
  }
}

export async function deleteScheduledPaymentsWithPassword(
  ids: number[],
  screenLockPassword: string
): Promise<{ ok: true; deleted: number } | { error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const userId = getUserIdFromSession(session.user.id);
    const isPasswordValid = await verifyUserAppLockPassword(userId, screenLockPassword);
    if (!isPasswordValid) {
      return { error: "Incorrect screen lock password" };
    }
    return deleteScheduledPayments(ids);
  } catch (e) {
    console.error(e);
    return { error: e instanceof Error ? e.message : "Failed to delete scheduled payments" };
  }
}

export async function acceptScheduledPayment(id: number) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  const userId = getUserIdFromSession(session.user.id);

  const expense = await prisma.$transaction(async (tx) => {
    const sp = await tx.scheduledPayment.findFirst({ where: { id, userId }, include: { category: true } });
    if (!sp) throw new Error("Scheduled payment not found");
    if (sp.resolution !== null) throw new Error("This scheduled payment was already resolved");
    if (sp.scheduledAt > new Date()) throw new Error("This payment is not due yet");

    // The conditional write locks this occurrence. Concurrent accept/reject requests
    // cannot claim it again; all changes roll back if any following step fails.
    const claimed = await tx.scheduledPayment.updateMany({
      where: { id, userId, resolution: null },
      data: { resolution: ScheduledPaymentResolution.ACCEPTED, resolvedAt: new Date() },
    });
    if (claimed.count !== 1) throw new Error("This scheduled payment was already resolved");

    const user = await tx.user.findUnique({ where: { id: userId }, select: { currency: true } });
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
    const created = await createExpenseInTransaction(tx, expensePayload, userId, user);
    await tx.scheduledPayment.update({ where: { id }, data: { createdExpenseId: created.id } });
    await createNextRecurringOccurrence(sp, tx);
    return { id: created.id, title: sp.title, amount: Number(sp.amount) };
  });

  // These optional side effects run only after the financial transaction commits.
  try {
    await autoBookmarkHighValueTransaction(expense.id, "EXPENSE", expense.title, expense.amount);
  } catch (error) {
    console.error("Failed to auto-bookmark scheduled expense:", error);
  }
  try {
    const { generateNotificationsForUser } = await import("../../../actions/notifications");
    await generateNotificationsForUser(userId);
  } catch (error) {
    console.error("Failed to check notifications after scheduled expense:", error);
  }

  revalidatePath("/expenses");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/scheduled-payments");
}

export async function rejectScheduledPayment(id: number) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  const userId = getUserIdFromSession(session.user.id);

  await prisma.$transaction(async (tx) => {
    const sp = await tx.scheduledPayment.findFirst({ where: { id, userId } });
    if (!sp) throw new Error("Scheduled payment not found");
    if (sp.resolution !== null) throw new Error("This scheduled payment was already resolved");
    if (sp.scheduledAt > new Date()) throw new Error("This payment is not due yet");

    const claimed = await tx.scheduledPayment.updateMany({
      where: { id, userId, resolution: null },
      data: { resolution: ScheduledPaymentResolution.REJECTED, resolvedAt: new Date() },
    });
    if (claimed.count !== 1) throw new Error("This scheduled payment was already resolved");
    await createNextRecurringOccurrence(sp, tx);
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/scheduled-payments");
}
