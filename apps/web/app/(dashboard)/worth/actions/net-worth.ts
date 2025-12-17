"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getUserIdFromSession } from "../../../utils/auth";
import { getUserAccounts } from "../../accounts/actions/accounts";
import { getUserInvestments } from "../../investments/actions/investments";
import { getUserDebts } from "../../debts/actions/debts";
import { getWithheldAmountsByBank } from "../../accounts/actions/accounts";
import { getNetWorthInclusions } from "../../../actions/net-worth-inclusions";
import { calculateRemainingWithInterest } from "../../../utils/interestCalculation";
import { getUserCurrency } from "../../../actions/currency";

export interface NetWorthSnapshot {
  totalAccountBalance: number;
  totalInvestmentValue: number;
  totalInvestmentCost: number;
  totalInvestmentGain: number;
  totalInvestmentGainPercentage: number;
  totalMoneyLent: number;
  totalAssets: number;
  netWorth: number;
  currency: string;
  asOfDate: Date;
}

/**
 * Get current net worth snapshot - not date-dependent
 */
export async function getCurrentNetWorth(): Promise<{ success: boolean; data?: NetWorthSnapshot; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Fetch all current data in parallel
    const [
      accountsResult,
      investmentsResult,
      debtsResult,
      withheldAmountsResult,
      inclusionsResult
    ] = await Promise.all([
      getUserAccounts(),
      getUserInvestments(),
      getUserDebts(),
      getWithheldAmountsByBank(),
      getNetWorthInclusions()
    ]);

    // Handle errors
    if ('error' in accountsResult && accountsResult.error) {
      return { success: false, error: `Failed to fetch accounts: ${accountsResult.error}` };
    }
    if ('error' in investmentsResult && investmentsResult.error) {
      return { success: false, error: `Failed to fetch investments: ${investmentsResult.error}` };
    }
    if ('error' in debtsResult && debtsResult.error) {
      return { success: false, error: `Failed to fetch debts: ${debtsResult.error}` };
    }

    const accounts = Array.isArray(accountsResult) ? accountsResult : [];
    const investments = Array.isArray(investmentsResult) ? investmentsResult : (investmentsResult.data || []);
    const debts = Array.isArray(debtsResult) ? debtsResult : (debtsResult.data || []);
    const withheldAmounts = withheldAmountsResult || {};
    const inclusionsData = inclusionsResult?.success ? inclusionsResult.data : [];

    // Create inclusion maps
    const inclusionMaps = {
      accounts: new Map<number, boolean>(),
      investments: new Map<number, boolean>(),
      debts: new Map<number, boolean>(),
    };

    if (inclusionsData) {
      inclusionsData.forEach((inclusion: any) => {
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

    // Calculate free account balances (excluding withheld amounts)
    const accountsWithFreeBalance = accounts.map((account: any) => {
      const bankName = account.bankName;
      const withheldAmountForBank = withheldAmounts[bankName] || 0;
      
      if (withheldAmountForBank === 0) {
        return account;
      }

      // Calculate proportional withheld amount for this account
      const accountsInBank = accounts.filter((acc: any) => acc.bankName === bankName);
      const totalBankBalance = accountsInBank.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);
      const accountProportion = totalBankBalance > 0 ? (account.balance || 0) / totalBankBalance : 0;
      const accountWithheldAmount = withheldAmountForBank * accountProportion;
      const freeBalance = (account.balance || 0) - accountWithheldAmount;

      return {
        ...account,
        balance: freeBalance
      };
    });

    // Filter based on inclusions (default to included if no explicit setting)
    const includedAccounts = accountsWithFreeBalance.filter((account: any) => {
      const isIncluded = inclusionMaps.accounts.get(account.id);
      return isIncluded === undefined ? true : isIncluded;
    });

    const includedInvestments = investments.filter((investment: any) => {
      const isIncluded = inclusionMaps.investments.get(investment.id);
      return isIncluded === undefined ? true : isIncluded;
    });

    const includedDebts = debts.filter((debt: any) => {
      const isIncluded = inclusionMaps.debts.get(debt.id);
      return isIncluded === undefined ? true : isIncluded;
    });

    // Calculate totals
    const totalAccountBalance = includedAccounts.reduce((sum: number, account: any) => sum + (account.balance || 0), 0);

    const totalInvestmentCost = includedInvestments.reduce((sum: number, investment: any) => {
      return sum + (investment.quantity * investment.purchasePrice);
    }, 0);

    const totalInvestmentValue = includedInvestments.reduce((sum: number, investment: any) => {
      return sum + (investment.quantity * investment.currentPrice);
    }, 0);

    const totalInvestmentGain = totalInvestmentValue - totalInvestmentCost;
    const totalInvestmentGainPercentage = totalInvestmentCost > 0 ? (totalInvestmentGain / totalInvestmentCost) * 100 : 0;

    const totalMoneyLent = includedDebts
      .filter((debt: any) => debt.status === 'ACTIVE' || debt.status === 'PARTIALLY_PAID')
      .reduce((sum: number, debt: any) => {
        const remainingWithInterest = calculateRemainingWithInterest(
          debt.amount,
          debt.interestRate,
          debt.lentDate,
          debt.dueDate || undefined,
          debt.repayments || [],
          new Date(),
          debt.status
        );
        return sum + Math.max(0, remainingWithInterest.remainingAmount);
      }, 0);

    const totalAssets = totalAccountBalance + totalInvestmentValue + totalMoneyLent;
    const netWorth = totalAssets; // No liabilities in this model

    // Get user's preferred currency
    const userCurrency = await getUserCurrency();

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
    console.error("Error fetching net worth:", error);
    return { success: false, error: "Failed to fetch net worth data" };
  }
}
