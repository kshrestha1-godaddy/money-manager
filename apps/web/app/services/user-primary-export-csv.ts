import prisma from "@repo/db/client";
import { decimalToNumber } from "../utils/auth";
import { calculateRemainingWithInterest } from "../utils/interestCalculation";
import type { AccountInterface } from "../types/accounts";
import type { DebtInterface, DebtRepaymentInterface } from "../types/debts";
import type { Expense, Income, Category } from "../types/financial";
import type { InvestmentInterface, InvestmentTargetProgress } from "../types/investments";
import type { PasswordInterface } from "../types/passwords";
import { convertAccountsToCSV } from "../utils/csvExport";
import { convertDebtsToCSV, convertRepaymentsToCSV } from "../utils/csvExportDebts";
import { convertExpensesToCSV } from "../utils/csvExportExpenses";
import { convertIncomesToCSV } from "../utils/csvExportIncomes";
import { convertInvestmentsToCSV } from "../utils/csvExportInvestments";
import { convertInvestmentTargetsToCSV } from "../utils/csvExportInvestmentTargets";
import { convertPasswordsToCSV } from "../utils/csvExportPasswords";
import { convertCategoriesToCsv } from "../utils/csvExportCategories";

function serializeTransactionLocation(location: {
  id: number;
  latitude: unknown;
  longitude: unknown;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...location,
    latitude: location.latitude ? Number(location.latitude) : null,
    longitude: location.longitude ? Number(location.longitude) : null,
  };
}

function toIncomeRow(prismaIncome: any): Income {
  const { transactionLocation: rawTl, ...rest } = prismaIncome;
  return {
    ...rest,
    amount: parseFloat(prismaIncome.amount.toString()),
    currency: prismaIncome.currency,
    date: new Date(prismaIncome.date),
    createdAt: new Date(prismaIncome.createdAt),
    updatedAt: new Date(prismaIncome.updatedAt),
    tags: prismaIncome.tags || [],
    location: prismaIncome.location || [],
    transactionLocation: rawTl ? serializeTransactionLocation(rawTl) : null,
    account: prismaIncome.account
      ? {
          ...prismaIncome.account,
          balance: parseFloat(prismaIncome.account.balance.toString()),
          accountOpeningDate: new Date(prismaIncome.account.accountOpeningDate),
          createdAt: new Date(prismaIncome.account.createdAt),
          updatedAt: new Date(prismaIncome.account.updatedAt),
        }
      : null,
  } as Income;
}

function toExpenseRow(expense: any): Expense {
  return {
    ...expense,
    amount: parseFloat(expense.amount.toString()),
    currency: expense.currency,
    date: new Date(expense.date),
    createdAt: new Date(expense.createdAt),
    updatedAt: new Date(expense.updatedAt),
    tags: expense.tags || [],
    location: expense.location || [],
    notes: expense.notes ?? null,
    transactionLocation: expense.transactionLocation
      ? serializeTransactionLocation(expense.transactionLocation)
      : null,
    account: expense.account
      ? {
          ...expense.account,
          balance: parseFloat(expense.account.balance.toString()),
          accountOpeningDate: new Date(expense.account.accountOpeningDate),
          createdAt: new Date(expense.account.createdAt),
          updatedAt: new Date(expense.account.updatedAt),
        }
      : null,
  } as Expense;
}

async function investmentTargetProgressForUser(userId: number): Promise<InvestmentTargetProgress[]> {
  const [targets, investments] = await Promise.all([
    prisma.investmentTarget.findMany({ where: { userId } }),
    prisma.investment.findMany({ where: { userId } }),
  ]);

  const currentAmountsByTargetId = investments.reduce(
    (acc, investment) => {
      if (investment.investmentTargetId == null) return acc;
      const currentValue =
        parseFloat(investment.quantity.toString()) * parseFloat(investment.currentPrice.toString());
      const tid = investment.investmentTargetId;
      acc[tid] = (acc[tid] || 0) + currentValue;
      return acc;
    },
    {} as Record<number, number>
  );

  return targets.map((target) => {
    const currentAmount = currentAmountsByTargetId[target.id] || 0;
    const targetAmount = parseFloat(target.targetAmount.toString());
    const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
    let daysRemaining: number | undefined;
    let isOverdue: boolean | undefined;
    if (target.targetCompletionDate) {
      const targetDate = new Date(target.targetCompletionDate);
      const timeDifference = targetDate.getTime() - Date.now();
      daysRemaining = Math.ceil(timeDifference / (1000 * 3600 * 24));
      isOverdue = daysRemaining < 0;
    }
    return {
      targetId: target.id,
      investmentType: target.investmentType,
      targetAmount,
      currentAmount,
      progress: Math.min(progress, 100),
      isComplete: progress >= 100,
      targetCompletionDate: target.targetCompletionDate || undefined,
      nickname: target.nickname || undefined,
      daysRemaining,
      isOverdue,
    };
  });
}

export interface CsvAttachment {
  filename: string;
  content: string;
}

/**
 * Primary “Export all” CSV strings (same datasets as dashboard export), scoped by userId.
 */
export async function buildPrimaryExportCsvAttachments(
  userId: number,
  dateStr: string
): Promise<CsvAttachment[]> {
  const attachments: CsvAttachment[] = [];

  const [
    accountRows,
    debtRows,
    repayments,
    expenseRows,
    incomeRows,
    investmentRows,
    passwordRows,
    categoryRows,
  ] = await Promise.all([
    prisma.account.findMany({ where: { userId } }),
    prisma.debt.findMany({
      where: { userId },
      include: { repayments: true },
      orderBy: { lentDate: "desc" },
    }),
    prisma.debtRepayment.findMany({
      where: { debt: { userId } },
      include: { debt: { select: { id: true, borrowerName: true } } },
      orderBy: { repaymentDate: "desc" },
    }),
    prisma.expense.findMany({
      where: { userId },
      include: { category: true, account: true, transactionLocation: true },
      orderBy: { date: "desc" },
    }),
    prisma.income.findMany({
      where: { userId },
      include: { category: true, account: true, transactionLocation: true },
      orderBy: { date: "desc" },
    }),
    prisma.investment.findMany({
      where: { userId },
      include: { account: true },
      orderBy: { purchaseDate: "desc" },
    }),
    prisma.password.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  const accounts: AccountInterface[] = accountRows.map((account) => ({
    ...account,
    balance: account.balance ? decimalToNumber(account.balance, "balance") : undefined,
    accountOpeningDate: new Date(account.accountOpeningDate),
    createdAt: new Date(account.createdAt),
    updatedAt: new Date(account.updatedAt),
    appUsername: account.appUsername || undefined,
    appPassword: account.appPassword || undefined,
    appPin: account.appPin || undefined,
    notes: account.notes || undefined,
    nickname: account.nickname || undefined,
  })) as AccountInterface[];

  const debts: DebtInterface[] = debtRows.map((debt) => {
    const amount = decimalToNumber(debt.amount, "debt amount");
    const interestRate = decimalToNumber(debt.interestRate, "interest rate");
    return {
      ...debt,
      amount,
      interestRate,
      lentDate: new Date(debt.lentDate),
      dueDate: debt.dueDate ? new Date(debt.dueDate) : undefined,
      createdAt: new Date(debt.createdAt),
      updatedAt: new Date(debt.updatedAt),
      repayments: debt.repayments?.map((repayment) => ({
        ...repayment,
        amount: decimalToNumber(repayment.amount, "repayment amount"),
        repaymentDate: new Date(repayment.repaymentDate),
        createdAt: new Date(repayment.createdAt),
        updatedAt: new Date(repayment.updatedAt),
      })),
    } as DebtInterface;
  });

  const transformedRepayments: DebtRepaymentInterface[] = repayments.map((r) => ({
    ...r,
    amount: decimalToNumber(r.amount, "repayment amount"),
    repaymentDate: new Date(r.repaymentDate),
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  })) as DebtRepaymentInterface[];

  const expenses = expenseRows.map(toExpenseRow);
  const incomes = incomeRows.map(toIncomeRow);

  const investments: InvestmentInterface[] = investmentRows.map((investment) => {
    const quantity = parseFloat(investment.quantity.toString());
    const purchasePrice = parseFloat(investment.purchasePrice.toString());
    const currentPrice = parseFloat(investment.currentPrice.toString());
    const transformedAccount = investment.account
      ? {
          ...investment.account,
          balance: parseFloat(investment.account.balance.toString()),
          accountOpeningDate: new Date(investment.account.accountOpeningDate),
          createdAt: new Date(investment.account.createdAt),
          updatedAt: new Date(investment.account.updatedAt),
        }
      : investment.account;
    return {
      id: investment.id,
      name: investment.name,
      type: investment.type,
      symbol: investment.symbol,
      quantity,
      purchasePrice,
      currentPrice,
      purchaseDate: new Date(investment.purchaseDate),
      accountId: investment.accountId,
      userId: investment.userId,
      notes: investment.notes,
      deductFromAccount: investment.deductFromAccount,
      createdAt: new Date(investment.createdAt),
      updatedAt: new Date(investment.updatedAt),
      account: transformedAccount,
      interestRate: investment.interestRate
        ? parseFloat(investment.interestRate.toString())
        : undefined,
      maturityDate: investment.maturityDate ? new Date(investment.maturityDate) : undefined,
    } as InvestmentInterface;
  });

  const passwords: PasswordInterface[] = passwordRows.map((password) => ({
    ...password,
    userId: password.userId.toString(),
    notes: password.notes || undefined,
    category: password.category || undefined,
    favicon: password.favicon || undefined,
  })) as PasswordInterface[];

  const categories: Category[] = categoryRows.map((c) => ({
    ...c,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
    includedInBudget: c.includedInBudget,
  })) as Category[];

  const tryPushCsv = (name: string, build: () => string) => {
    try {
      const csv = build();
      if (!csv) return;
      attachments.push({ filename: `${name}_${dateStr}.csv`, content: "\uFEFF" + csv });
    } catch {
      /* empty lists fail validateExportData in some converters */
    }
  };

  tryPushCsv("accounts", () => convertAccountsToCSV(accounts));
  tryPushCsv("debts", () => convertDebtsToCSV(debts));
  const debtIdMap: Record<number, string> = {};
  for (const d of debts) {
    debtIdMap[d.id] = d.borrowerName;
  }
  tryPushCsv("debt_repayments", () =>
    convertRepaymentsToCSV(transformedRepayments, debtIdMap)
  );
  tryPushCsv("expenses", () => convertExpensesToCSV(expenses));
  tryPushCsv("incomes", () => convertIncomesToCSV(incomes));
  tryPushCsv("investments", () => convertInvestmentsToCSV(investments));

  const progress = await investmentTargetProgressForUser(userId);
  tryPushCsv("investment_targets", () => convertInvestmentTargetsToCSV(progress));
  tryPushCsv("passwords", () => convertPasswordsToCSV(passwords));

  const allCats = categories;
  tryPushCsv("all_categories", () => convertCategoriesToCsv(allCats));
  tryPushCsv("income_categories", () =>
    convertCategoriesToCsv(allCats.filter((c) => c.type === "INCOME"))
  );
  tryPushCsv("expense_categories", () =>
    convertCategoriesToCsv(allCats.filter((c) => c.type === "EXPENSE"))
  );

  return attachments;
}
