/**
 * Seeds dummy net worth history snapshots (12 months × SNAPSHOTS_PER_MONTH rows).
 *
 * Requires DATABASE_URL. Optional: SEED_USER_EMAIL (default: john.doe@example.com).
 * If that user is missing, uses the first user by id (with a warning).
 *
 * Re-runs remove only rows matching this script’s snapshot dates for the target user
 * (no `tags` column on NetworthHistory — identification is by exact `snapshotDate` list).
 *
 * Run from repo root:
 *   npm run seed:networth
 */

import { PrismaClient, NetWorthRecordType } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_USER_EMAIL = "john.doe@example.com";
/** Calendar year used for generated snapshot dates. */
const SEED_YEAR = 2026;
const SNAPSHOTS_PER_MONTH = 5;

interface NetWorthData {
  totalAccountBalance: number;
  totalInvestmentValue: number;
  totalInvestmentCost: number;
  totalInvestmentGain: number;
  totalInvestmentGainPercentage: number;
  totalMoneyLent: number;
  totalAssets: number;
  netWorth: number;
  currency: string;
  snapshotDate: Date;
  recordType: NetWorthRecordType;
  userId: number;
}

/** Deterministic small jitter in roughly ±2% (replaces Math.random for reproducible seeds). */
function variationPct(month: number, record: number): number {
  const x = ((month + 1) * 31 + (record + 1) * 7) % 1000;
  return (x / 1000 - 0.5) * 0.04;
}

function generateNetworthData(userId: number, currency: string): NetWorthData[] {
  const records: NetWorthData[] = [];

  let baseAccountBalance = 250_000;
  let baseInvestmentValue = 2_000_000;
  let baseInvestmentCost = 1_800_000;
  let baseMoneyLent = 500_000;

  const monthlyGrowthRates = [
    0.02, -0.01, 0.03, 0.015, -0.005, 0.025, 0.01, 0.02, -0.015, 0.035, 0.01,
    0.02,
  ];

  for (let month = 0; month < 12; month++) {
    const monthlyGrowth = monthlyGrowthRates[month] ?? 0;

    baseAccountBalance *= 1 + monthlyGrowth * 0.3;
    baseInvestmentValue *= 1 + monthlyGrowth;
    baseInvestmentCost *= 1 + monthlyGrowth * 0.1;
    baseMoneyLent *= 1 + monthlyGrowth * 0.05;

    for (let record = 0; record < SNAPSHOTS_PER_MONTH; record++) {
      const dayOfMonth = Math.floor((record + 1) * (30 / SNAPSHOTS_PER_MONTH));
      const recordDate = new Date(SEED_YEAR, month, dayOfMonth);

      const dailyVariation = variationPct(month, record);

      const accountBalance = Math.round(
        baseAccountBalance * (1 + dailyVariation),
      );
      const investmentValue = Math.round(
        baseInvestmentValue * (1 + dailyVariation),
      );
      const investmentCost = Math.round(baseInvestmentCost);
      const moneyLent = Math.round(
        baseMoneyLent * (1 + dailyVariation * 0.5),
      );

      const investmentGain = investmentValue - investmentCost;
      const investmentGainPercentage =
        investmentCost > 0 ? (investmentGain / investmentCost) * 100 : 0;
      const totalAssets = accountBalance + investmentValue + moneyLent;

      records.push({
        totalAccountBalance: accountBalance,
        totalInvestmentValue: investmentValue,
        totalInvestmentCost: investmentCost,
        totalInvestmentGain: investmentGain,
        totalInvestmentGainPercentage: investmentGainPercentage,
        totalMoneyLent: moneyLent,
        totalAssets,
        netWorth: totalAssets,
        currency,
        snapshotDate: recordDate,
        recordType:
          record === 0 ? NetWorthRecordType.MANUAL : NetWorthRecordType.AUTOMATIC,
        userId,
      });
    }
  }

  return records;
}

async function seedNetworthHistory() {
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
      "No users in the database. Create a user or run the main prisma seed first.",
    );
    process.exitCode = 1;
    return;
  }

  const currency = user.currency?.trim() || "USD";
  const networthData = generateNetworthData(user.id, currency);
  const snapshotDates = networthData.map((r) => r.snapshotDate);

  const removed = await prisma.networthHistory.deleteMany({
    where: {
      userId: user.id,
      snapshotDate: { in: snapshotDates },
    },
  });
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} existing snapshots at seed dates.`);
  }

  const result = await prisma.networthHistory.createMany({
    data: networthData,
    skipDuplicates: true,
  });

  const who = user.email ?? user.number;
  const first = networthData[0];
  const last = networthData[networthData.length - 1];
  if (first && last) {
    console.log(
      `Inserted ${result.count} net worth snapshots for ${who} (${currency}).`,
    );
    console.log(
      `Date range: ${first.snapshotDate.toDateString()} → ${last.snapshotDate.toDateString()}`,
    );
    console.log(
      `Net worth: ${first.netWorth.toLocaleString()} → ${last.netWorth.toLocaleString()} (${currency})`,
    );
    const totalGrowth = last.netWorth - first.netWorth;
    const growthPct = first.netWorth !== 0 ? (totalGrowth / first.netWorth) * 100 : 0;
    console.log(
      `Approx. growth over series: ${totalGrowth.toLocaleString()} (${growthPct.toFixed(2)}%)`,
    );
  }
}

async function main() {
  try {
    await seedNetworthHistory();
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();

export { seedNetworthHistory, generateNetworthData };
