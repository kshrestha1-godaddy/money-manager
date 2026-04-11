/**
 * Seeds dummy scheduled payments: at least PER_CATEGORY rows per expense category,
 * across MIN_CATEGORIES distinct expense categories (creates extra categories if needed).
 *
 * Requires DATABASE_URL (or DATABASE_URL_DEV via Prisma client resolution).
 * Optional: SEED_USER_EMAIL (default: john.doe@example.com from main seed).
 *
 * Run from repo root:
 *   npx ts-node --transpile-only scripts/seed-scheduled-payments.ts
 */

import {
  PrismaClient,
  RecurringFrequency,
  ScheduledPaymentResolution,
} from "@prisma/client";

const prisma = new PrismaClient();

const SEED_TAG = "seed-scheduled-payments";
const DEFAULT_USER_EMAIL = "john.doe@example.com";
const MIN_CATEGORIES = 5;
const PER_CATEGORY = 5;

const recurrenceRow: {
  label: string;
  isRecurring: boolean;
  frequency: RecurringFrequency | null;
  resolution: ScheduledPaymentResolution | null;
  /** days offset from "now" for scheduledAt (negative = past) */
  dayOffset: number;
}[] = [
  {
    label: "One-time",
    isRecurring: false,
    frequency: null,
    resolution: null,
    dayOffset: 14,
  },
  {
    label: "Daily",
    isRecurring: true,
    frequency: RecurringFrequency.DAILY,
    resolution: null,
    dayOffset: -2,
  },
  {
    label: "Weekly",
    isRecurring: true,
    frequency: RecurringFrequency.WEEKLY,
    resolution: ScheduledPaymentResolution.ACCEPTED,
    dayOffset: -9,
  },
  {
    label: "Monthly",
    isRecurring: true,
    frequency: RecurringFrequency.MONTHLY,
    resolution: ScheduledPaymentResolution.REJECTED,
    dayOffset: -21,
  },
  {
    label: "Yearly",
    isRecurring: true,
    frequency: RecurringFrequency.YEARLY,
    resolution: null,
    dayOffset: 45,
  },
];

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

async function ensureExpenseCategories(userId: number) {
  const existing = await prisma.category.findMany({
    where: { userId, type: "EXPENSE" },
    orderBy: { id: "asc" },
  });

  const palette = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b"];
  const need = Math.max(0, MIN_CATEGORIES - existing.length);
  const created: typeof existing = [];
  for (let n = 0; n < need; n++) {
    const idx = existing.length + n + 1;
    const cat = await prisma.category.create({
      data: {
        userId,
        type: "EXPENSE",
        name: `Seed SP Category ${idx}`,
        color: palette[n % palette.length] ?? "#6366f1",
      },
    });
    created.push(cat);
  }

  return [...existing, ...created].slice(0, MIN_CATEGORIES);
}

async function seedScheduledPayments() {
  const email = process.env.SEED_USER_EMAIL?.trim() || DEFAULT_USER_EMAIL;

  let user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.findFirst({ orderBy: { id: "asc" } });
    if (user) {
      console.warn(
        `SEED_USER_EMAIL "${email}" not found; using first user (id ${user.id}).`,
      );
    }
  }

  if (!user) {
    console.error(
      `No users in the database. Create a user or run the main prisma seed first.`,
    );
    process.exitCode = 1;
    return;
  }

  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    orderBy: { id: "asc" },
    take: 1,
  });
  const accountId = accounts[0]?.id ?? null;

  const categories = await ensureExpenseCategories(user.id);
  if (categories.length < MIN_CATEGORIES) {
    console.error("Could not ensure minimum expense categories.");
    process.exitCode = 1;
    return;
  }

  const removed = await prisma.scheduledPayment.deleteMany({
    where: {
      userId: user.id,
      tags: { has: SEED_TAG },
    },
  });
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} previous seed scheduled payments.`);
  }

  const now = new Date();
  let created = 0;

  for (const category of categories) {
    for (let i = 0; i < PER_CATEGORY; i++) {
      const row = recurrenceRow[i];
      if (!row) continue;

      const scheduledAt = addDays(now, row.dayOffset);
      const resolvedAt =
        row.resolution !== null ? addDays(scheduledAt, 1) : null;

      await prisma.scheduledPayment.create({
        data: {
          userId: user.id,
          categoryId: category.id,
          accountId,
          title: `[Seed] ${category.name} · ${row.label}`,
          description: `Dummy scheduled payment (${row.label}) for category "${category.name}".`,
          amount: 10 * (i + 1) + category.id * 0.01,
          currency: user.currency ?? "USD",
          scheduledAt,
          tags: [SEED_TAG, "seed"],
          notes: `Seeded row ${i + 1}/${PER_CATEGORY} for category ${category.name}.`,
          isRecurring: row.isRecurring,
          recurringFrequency: row.frequency,
          resolution: row.resolution,
          resolvedAt,
        },
      });
      created++;
    }
  }

  const who = user.email ?? user.number;
  console.log(
    `Created ${created} scheduled payments for ${who} (${categories.length} categories × ${PER_CATEGORY}).`,
  );
}

async function main() {
  try {
    await seedScheduledPayments();
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
