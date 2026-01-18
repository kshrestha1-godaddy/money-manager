"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getUserIdFromSession } from "../../../utils/auth";
import { getCurrentNetWorth, NetWorthSnapshot } from "./net-worth";
import prisma from "@repo/db/client";
import { NetWorthRecordType, Account, Investment, Debt, DebtRepayment, NetWorthInclusion } from "@prisma/client";
import { getUserAccounts } from "../../accounts/actions/accounts";
import { getUserInvestments } from "../../investments/actions/investments";
import { getUserDebts } from "../../debts/actions/debts";
import { getWithheldAmountsByBank } from "../../accounts/actions/accounts";
import { getNetWorthInclusions } from "../../../actions/net-worth-inclusions";
import { calculateRemainingWithInterest } from "../../../utils/interestCalculation";
import { getUserCurrency } from "../../../actions/currency";

export interface NetworthHistoryRecord {
  id: number;
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
  createdAt: Date;
}

/**
 * Calculate net worth for a specific user ID (used by cron jobs)
 */
export async function calculateNetworthForUser(userId: number): Promise<{ success: boolean; data?: NetWorthSnapshot; error?: string }> {
  try {
    // Fetch all current data in parallel for the specific user
    const [
      accounts,
      investments, 
      debts,
      withheldAmounts,
      inclusionsResult,
      userCurrency
    ] = await Promise.all([
      prisma.account.findMany({ where: { userId } }),
      prisma.investment.findMany({ where: { userId } }),
      prisma.debt.findMany({ where: { userId }, include: { repayments: true } }),
      prisma.account.findMany({ 
        where: { userId },
        select: { bankName: true, balance: true }
      }).then((accounts: Array<{ bankName: string; balance: any }>) => {
        // Calculate withheld amounts by bank (simplified version)
        const withheldByBank: Record<string, number> = {};
        return withheldByBank;
      }),
      prisma.netWorthInclusion.findMany({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { currency: true } }).then(u => u?.currency || "USD")
    ]);

    // Create inclusion maps
    const inclusionMaps = {
      accounts: new Map<number, boolean>(),
      investments: new Map<number, boolean>(),
      debts: new Map<number, boolean>(),
    };

    if (inclusionsResult) {
      inclusionsResult.forEach((inclusion: NetWorthInclusion) => {
        switch (inclusion.entityType) {
          case 'ACCOUNT':
            inclusionMaps.accounts.set(inclusion.entityId, inclusion.includeInNetWorth);
            break;
          case 'INVESTMENT':
            inclusionMaps.investments.set(inclusion.entityId, inclusion.includeInNetWorth);
            break;
          case 'DEBT':
            inclusionMaps.debts.set(inclusion.entityId, inclusion.includeInNetWorth);
            break;
        }
      });
    }

    // Filter based on inclusions (default to included if no explicit setting)
    const includedAccounts = accounts.filter((account: Account) => {
      const isIncluded = inclusionMaps.accounts.get(account.id);
      return isIncluded === undefined ? true : isIncluded;
    });

    const includedInvestments = investments.filter((investment: Investment) => {
      const isIncluded = inclusionMaps.investments.get(investment.id);
      return isIncluded === undefined ? true : isIncluded;
    });

    const includedDebts = debts.filter((debt: Debt & { repayments: DebtRepayment[] }) => {
      const isIncluded = inclusionMaps.debts.get(debt.id);
      return isIncluded === undefined ? true : isIncluded;
    });

    // Calculate totals
    const totalAccountBalance = includedAccounts.reduce((sum: number, account: Account) => sum + Number(account.balance || 0), 0);

    const totalInvestmentCost = includedInvestments.reduce((sum: number, investment: Investment) => {
      return sum + (Number(investment.quantity) * Number(investment.purchasePrice));
    }, 0);

    const totalInvestmentValue = includedInvestments.reduce((sum: number, investment: Investment) => {
      return sum + (Number(investment.quantity) * Number(investment.currentPrice));
    }, 0);

    const totalInvestmentGain = totalInvestmentValue - totalInvestmentCost;
    const totalInvestmentGainPercentage = totalInvestmentCost > 0 ? (totalInvestmentGain / totalInvestmentCost) * 100 : 0;

    const totalMoneyLent = includedDebts
      .filter((debt: Debt & { repayments: DebtRepayment[] }) => debt.status === 'ACTIVE' || debt.status === 'PARTIALLY_PAID')
      .reduce((sum: number, debt: Debt & { repayments: DebtRepayment[] }) => {
        const remainingWithInterest = calculateRemainingWithInterest(
          Number(debt.amount),
          Number(debt.interestRate),
          debt.lentDate,
          debt.dueDate || undefined,
          (debt.repayments || []).map(r => ({ ...r, amount: Number(r.amount) })),
          new Date(),
          debt.status
        );
        return sum + Math.max(0, remainingWithInterest.remainingAmount);
      }, 0);

    const totalAssets = totalAccountBalance + totalInvestmentValue + totalMoneyLent;
    const netWorth = totalAssets; // No liabilities in this model

    const netWorthSnapshot: NetWorthSnapshot = {
      totalAccountBalance,
      totalInvestmentValue,
      totalInvestmentCost,
      totalInvestmentGain,
      totalInvestmentGainPercentage,
      totalMoneyLent,
      totalAssets,
      netWorth,
      currency: userCurrency,
      asOfDate: new Date()
    };

    return {
      success: true,
      data: netWorthSnapshot
    };

  } catch (error) {
    console.error("Error calculating net worth for user:", error);
    return { success: false, error: "Failed to calculate net worth" };
  }
}

/**
 * Record a new net worth snapshot for a specific user (used by cron jobs)
 */
export async function recordNetworthSnapshotForUser(
  userId: number, 
  recordType: NetWorthRecordType = "AUTOMATIC", 
  snapshotDate?: Date
): Promise<{ success: boolean; data?: NetworthHistoryRecord; error?: string }> {
  try {
    // Get net worth data for the specific user
    const networthResult = await calculateNetworthForUser(userId);
    if (!networthResult.success || !networthResult.data) {
      return { success: false, error: networthResult.error || "Failed to calculate net worth" };
    }

    const networth = networthResult.data;
    const targetDate = snapshotDate || new Date();
    // Normalize date to start of day for consistency
    targetDate.setHours(0, 0, 0, 0);

    // Check if a record already exists for this user and date
    const existingRecord = await prisma.networthHistory.findUnique({
      where: {
        userId_snapshotDate: {
          userId,
          snapshotDate: targetDate
        }
      }
    });

    let savedRecord;

    if (existingRecord) {
      // Update existing record if it exists
      savedRecord = await prisma.networthHistory.update({
        where: {
          id: existingRecord.id
        },
        data: {
          totalAccountBalance: networth.totalAccountBalance,
          totalInvestmentValue: networth.totalInvestmentValue,
          totalInvestmentCost: networth.totalInvestmentCost,
          totalInvestmentGain: networth.totalInvestmentGain,
          totalInvestmentGainPercentage: networth.totalInvestmentGainPercentage,
          totalMoneyLent: networth.totalMoneyLent,
          totalAssets: networth.totalAssets,
          netWorth: networth.netWorth,
          currency: networth.currency,
          recordType
        }
      });
    } else {
      // Create new record
      savedRecord = await prisma.networthHistory.create({
        data: {
          userId,
          totalAccountBalance: networth.totalAccountBalance,
          totalInvestmentValue: networth.totalInvestmentValue,
          totalInvestmentCost: networth.totalInvestmentCost,
          totalInvestmentGain: networth.totalInvestmentGain,
          totalInvestmentGainPercentage: networth.totalInvestmentGainPercentage,
          totalMoneyLent: networth.totalMoneyLent,
          totalAssets: networth.totalAssets,
          netWorth: networth.netWorth,
          currency: networth.currency,
          snapshotDate: targetDate,
          recordType
        }
      });
    }

    const result: NetworthHistoryRecord = {
      id: savedRecord.id,
      totalAccountBalance: Number(savedRecord.totalAccountBalance),
      totalInvestmentValue: Number(savedRecord.totalInvestmentValue),
      totalInvestmentCost: Number(savedRecord.totalInvestmentCost),
      totalInvestmentGain: Number(savedRecord.totalInvestmentGain),
      totalInvestmentGainPercentage: Number(savedRecord.totalInvestmentGainPercentage),
      totalMoneyLent: Number(savedRecord.totalMoneyLent),
      totalAssets: Number(savedRecord.totalAssets),
      netWorth: Number(savedRecord.netWorth),
      currency: savedRecord.currency,
      snapshotDate: savedRecord.snapshotDate,
      recordType: savedRecord.recordType,
      createdAt: savedRecord.createdAt
    };

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error("Error recording net worth snapshot for user:", error);
    return { success: false, error: "Failed to record net worth snapshot" };
  }
}

/**
 * Record a new net worth snapshot
 */
export async function recordNetworthSnapshot(recordType: NetWorthRecordType = "AUTOMATIC", snapshotDate?: Date): Promise<{ success: boolean; data?: NetworthHistoryRecord; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = getUserIdFromSession(session.user.id);

    // Get current net worth data
    const currentNetworthResult = await getCurrentNetWorth();
    if (!currentNetworthResult.success || !currentNetworthResult.data) {
      return { success: false, error: currentNetworthResult.error || "Failed to get current net worth" };
    }

    const networth = currentNetworthResult.data;
    const targetDate = snapshotDate || new Date();

    // Check if a record already exists for this user and date
    const existingRecord = await prisma.networthHistory.findUnique({
      where: {
        userId_snapshotDate: {
          userId,
          snapshotDate: targetDate
        }
      }
    });

    let savedRecord;

    if (existingRecord) {
      // Update existing record if it exists
      savedRecord = await prisma.networthHistory.update({
        where: {
          id: existingRecord.id
        },
        data: {
          totalAccountBalance: networth.totalAccountBalance,
          totalInvestmentValue: networth.totalInvestmentValue,
          totalInvestmentCost: networth.totalInvestmentCost,
          totalInvestmentGain: networth.totalInvestmentGain,
          totalInvestmentGainPercentage: networth.totalInvestmentGainPercentage,
          totalMoneyLent: networth.totalMoneyLent,
          totalAssets: networth.totalAssets,
          netWorth: networth.netWorth,
          currency: networth.currency,
          recordType
        }
      });
    } else {
      // Create new record
      savedRecord = await prisma.networthHistory.create({
        data: {
          userId,
          totalAccountBalance: networth.totalAccountBalance,
          totalInvestmentValue: networth.totalInvestmentValue,
          totalInvestmentCost: networth.totalInvestmentCost,
          totalInvestmentGain: networth.totalInvestmentGain,
          totalInvestmentGainPercentage: networth.totalInvestmentGainPercentage,
          totalMoneyLent: networth.totalMoneyLent,
          totalAssets: networth.totalAssets,
          netWorth: networth.netWorth,
          currency: networth.currency,
          snapshotDate: targetDate,
          recordType
        }
      });
    }

    const result: NetworthHistoryRecord = {
      id: savedRecord.id,
      totalAccountBalance: Number(savedRecord.totalAccountBalance),
      totalInvestmentValue: Number(savedRecord.totalInvestmentValue),
      totalInvestmentCost: Number(savedRecord.totalInvestmentCost),
      totalInvestmentGain: Number(savedRecord.totalInvestmentGain),
      totalInvestmentGainPercentage: Number(savedRecord.totalInvestmentGainPercentage),
      totalMoneyLent: Number(savedRecord.totalMoneyLent),
      totalAssets: Number(savedRecord.totalAssets),
      netWorth: Number(savedRecord.netWorth),
      currency: savedRecord.currency,
      snapshotDate: savedRecord.snapshotDate,
      recordType: savedRecord.recordType,
      createdAt: savedRecord.createdAt
    };

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error("Error recording net worth snapshot:", error);
    return { success: false, error: "Failed to record net worth snapshot" };
  }
}

/**
 * Get net worth history for a user within a date range
 */
export async function getNetworthHistory(
  startDate?: Date,
  endDate?: Date,
  limit?: number
): Promise<{ success: boolean; data?: NetworthHistoryRecord[]; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = getUserIdFromSession(session.user.id);

    // Build where clause - always include userId
    const whereClause: any = {
      userId: userId
    };

    // Add date filters if provided
    if (startDate || endDate) {
      whereClause.snapshotDate = {};
      if (startDate) {
        whereClause.snapshotDate.gte = startDate;
      }
      if (endDate) {
        whereClause.snapshotDate.lte = endDate;
      }
    }
    const records = await prisma.networthHistory.findMany({
      where: whereClause,
      orderBy: {
        snapshotDate: 'asc'
      },
      take: limit || 365 // Default to last 365 records
    });

    const result: NetworthHistoryRecord[] = records.map((record: any) => ({
      id: record.id,
      totalAccountBalance: Number(record.totalAccountBalance),
      totalInvestmentValue: Number(record.totalInvestmentValue),
      totalInvestmentCost: Number(record.totalInvestmentCost),
      totalInvestmentGain: Number(record.totalInvestmentGain),
      totalInvestmentGainPercentage: Number(record.totalInvestmentGainPercentage),
      totalMoneyLent: Number(record.totalMoneyLent),
      totalAssets: Number(record.totalAssets),
      netWorth: Number(record.netWorth),
      currency: record.currency,
      snapshotDate: record.snapshotDate,
      recordType: record.recordType,
      createdAt: record.createdAt
    }));

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error("Error fetching net worth history:", error);
    return { success: false, error: "Failed to fetch net worth history" };
  }
}

/**
 * Get the latest net worth snapshot from history
 */
export async function getLatestNetworthSnapshot(): Promise<{ success: boolean; data?: NetworthHistoryRecord; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = getUserIdFromSession(session.user.id);

    const latestRecord = await prisma.networthHistory.findFirst({
      where: {
        userId
      },
      orderBy: {
        snapshotDate: 'desc'
      }
    });

    if (!latestRecord) {
      return { success: false, error: "No net worth history found" };
    }

    const result: NetworthHistoryRecord = {
      id: latestRecord.id,
      totalAccountBalance: Number(latestRecord.totalAccountBalance),
      totalInvestmentValue: Number(latestRecord.totalInvestmentValue),
      totalInvestmentCost: Number(latestRecord.totalInvestmentCost),
      totalInvestmentGain: Number(latestRecord.totalInvestmentGain),
      totalInvestmentGainPercentage: Number(latestRecord.totalInvestmentGainPercentage),
      totalMoneyLent: Number(latestRecord.totalMoneyLent),
      totalAssets: Number(latestRecord.totalAssets),
      netWorth: Number(latestRecord.netWorth),
      currency: latestRecord.currency,
      snapshotDate: latestRecord.snapshotDate,
      recordType: latestRecord.recordType,
      createdAt: latestRecord.createdAt
    };

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error("Error fetching latest net worth snapshot:", error);
    return { success: false, error: "Failed to fetch latest net worth snapshot" };
  }
}

/**
 * Record current net worth manually (session-based)
 */
export async function recordCurrentNetworthManually(): Promise<{ success: boolean; data?: NetworthHistoryRecord; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = getUserIdFromSession(session.user.id);

    // Get current net worth data using existing function
    const currentNetworthResult = await getCurrentNetWorth();
    if (!currentNetworthResult.success || !currentNetworthResult.data) {
      return { success: false, error: currentNetworthResult.error || "Failed to get current net worth" };
    }

    const networth = currentNetworthResult.data;
    const today = new Date();
    // Normalize date to start of day for consistency
    today.setHours(0, 0, 0, 0);

    // Check if a record already exists for today for this user
    const existingRecord = await prisma.networthHistory.findUnique({
      where: {
        userId_snapshotDate: {
          userId,
          snapshotDate: today
        }
      }
    });

    let savedRecord;

    if (existingRecord) {
      // Update existing record if it exists
      savedRecord = await prisma.networthHistory.update({
        where: {
          id: existingRecord.id
        },
        data: {
          totalAccountBalance: networth.totalAccountBalance,
          totalInvestmentValue: networth.totalInvestmentValue,
          totalInvestmentCost: networth.totalInvestmentCost,
          totalInvestmentGain: networth.totalInvestmentGain,
          totalInvestmentGainPercentage: networth.totalInvestmentGainPercentage,
          totalMoneyLent: networth.totalMoneyLent,
          totalAssets: networth.totalAssets,
          netWorth: networth.netWorth,
          currency: networth.currency,
          recordType: "MANUAL"
        }
      });
    } else {
      // Create new record
      savedRecord = await prisma.networthHistory.create({
        data: {
          userId,
          totalAccountBalance: networth.totalAccountBalance,
          totalInvestmentValue: networth.totalInvestmentValue,
          totalInvestmentCost: networth.totalInvestmentCost,
          totalInvestmentGain: networth.totalInvestmentGain,
          totalInvestmentGainPercentage: networth.totalInvestmentGainPercentage,
          totalMoneyLent: networth.totalMoneyLent,
          totalAssets: networth.totalAssets,
          netWorth: networth.netWorth,
          currency: networth.currency,
          snapshotDate: today,
          recordType: "MANUAL"
        }
      });
    }

    const result: NetworthHistoryRecord = {
      id: savedRecord.id,
      totalAccountBalance: Number(savedRecord.totalAccountBalance),
      totalInvestmentValue: Number(savedRecord.totalInvestmentValue),
      totalInvestmentCost: Number(savedRecord.totalInvestmentCost),
      totalInvestmentGain: Number(savedRecord.totalInvestmentGain),
      totalInvestmentGainPercentage: Number(savedRecord.totalInvestmentGainPercentage),
      totalMoneyLent: Number(savedRecord.totalMoneyLent),
      totalAssets: Number(savedRecord.totalAssets),
      netWorth: Number(savedRecord.netWorth),
      currency: savedRecord.currency,
      snapshotDate: savedRecord.snapshotDate,
      recordType: savedRecord.recordType,
      createdAt: savedRecord.createdAt
    };

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error("Error recording manual net worth snapshot:", error);
    return { success: false, error: "Failed to record net worth snapshot" };
  }
}

/**
 * Delete a net worth history record
 */
export async function deleteNetworthHistoryRecord(recordId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = getUserIdFromSession(session.user.id);

    // Verify the record belongs to the user
    const record = await prisma.networthHistory.findFirst({
      where: {
        id: recordId,
        userId
      }
    });

    if (!record) {
      return { success: false, error: "Record not found or unauthorized" };
    }

    await prisma.networthHistory.delete({
      where: {
        id: recordId
      }
    });

    return { success: true };

  } catch (error) {
    console.error("Error deleting net worth history record:", error);
    return { success: false, error: "Failed to delete record" };
  }
}