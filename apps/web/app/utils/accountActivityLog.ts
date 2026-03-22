import type { Prisma } from "@prisma/client";
import {
    ActivityAction,
    ActivityCategory,
    ActivityEntityType,
    ActivitySeverity,
    ActivityStatus,
} from "@prisma/client";
import { decimalToNumber } from "./auth";

/** Income / expense balance lines (existing rows in DB use this) */
export const INCOME_EXPENSE_ACCOUNT_BALANCE_SOURCE = "income_expense_account_balance" as const;

/** Lending / repayment balance lines */
export const DEBT_ACCOUNT_BALANCE_SOURCE = "debt_account_balance" as const;

/** Investment purchase / release (when linked account balance is adjusted) */
export const INVESTMENT_ACCOUNT_BALANCE_SOURCE = "investment_account_balance" as const;

export const ACCOUNT_BALANCE_ACTIVITY_SOURCES = [
    INCOME_EXPENSE_ACCOUNT_BALANCE_SOURCE,
    DEBT_ACCOUNT_BALANCE_SOURCE,
    INVESTMENT_ACCOUNT_BALANCE_SOURCE,
] as const;

export interface AccountBalanceActivityInput {
    userId: number;
    action: ActivityAction;
    entityType:
        | "INCOME"
        | "EXPENSE"
        | "DEBT"
        | "DEBT_REPAYMENT"
        | "INVESTMENT";
    entityId: number | null;
    category: "TRANSACTION" | "BULK_OPERATION";
    accountId: number;
    accountBankName: string;
    holderName: string | null;
    balanceDeltaUserCurrency: number;
    userCurrency: string;
    transactionTitle: string;
    transactionAmountOriginal: number;
    transactionCurrency: string;
    reason: string;
    extraMetadata?: Record<string, unknown>;
}

function ledgerMetadataSource(
    entityType: AccountBalanceActivityInput["entityType"]
): typeof INCOME_EXPENSE_ACCOUNT_BALANCE_SOURCE | typeof DEBT_ACCOUNT_BALANCE_SOURCE | typeof INVESTMENT_ACCOUNT_BALANCE_SOURCE {
    if (
        entityType === ActivityEntityType.DEBT ||
        entityType === ActivityEntityType.DEBT_REPAYMENT
    ) {
        return DEBT_ACCOUNT_BALANCE_SOURCE;
    }
    if (entityType === ActivityEntityType.INVESTMENT) {
        return INVESTMENT_ACCOUNT_BALANCE_SOURCE;
    }
    return INCOME_EXPENSE_ACCOUNT_BALANCE_SOURCE;
}

function buildLedgerDescription(input: AccountBalanceActivityInput): string {
    const label = input.holderName?.trim()
        ? `${input.holderName.trim()} · ${input.accountBankName}`
        : input.accountBankName;
    const sign = input.balanceDeltaUserCurrency >= 0 ? "+" : "";
    const deltaStr = `${sign}${input.balanceDeltaUserCurrency.toFixed(2)} ${input.userCurrency}`;
    const t = input.transactionTitle;

    if (input.entityType === ActivityEntityType.INCOME) {
        const verb =
            input.action === ActivityAction.CREATE
                ? "recorded"
                : input.action === ActivityAction.DELETE ||
                    input.action === ActivityAction.BULK_DELETE
                  ? "removed (balance adjusted)"
                  : "updated";
        return `Income ${verb}: "${t}" — ${label} balance ${deltaStr}`;
    }

    if (input.entityType === ActivityEntityType.EXPENSE) {
        const verb =
            input.action === ActivityAction.CREATE
                ? "recorded"
                : input.action === ActivityAction.DELETE ||
                    input.action === ActivityAction.BULK_DELETE
                  ? "removed (balance adjusted)"
                  : "updated";
        return `Expense ${verb}: "${t}" — ${label} balance ${deltaStr}`;
    }

    if (input.entityType === ActivityEntityType.DEBT) {
        if (
            input.action === ActivityAction.DELETE ||
            input.action === ActivityAction.BULK_DELETE
        ) {
            return `Lending removed: "${t}" — ${label} balance ${deltaStr}`;
        }
        if (input.action === ActivityAction.CREATE) {
            return `Lending recorded: "${t}" — ${label} balance ${deltaStr}`;
        }
        return `Lending updated: "${t}" — ${label} balance ${deltaStr}`;
    }

    // DEBT_REPAYMENT
    if (input.entityType === ActivityEntityType.DEBT_REPAYMENT) {
        if (input.action === ActivityAction.DELETE) {
            return `Repayment removed: "${t}" — ${label} balance ${deltaStr}`;
        }
        return `Repayment recorded: "${t}" — ${label} balance ${deltaStr}`;
    }

    if (input.entityType === ActivityEntityType.INVESTMENT) {
        if (
            input.action === ActivityAction.DELETE ||
            input.action === ActivityAction.BULK_DELETE
        ) {
            return `Investment removed: "${t}" — ${label} balance ${deltaStr}`;
        }
        if (input.action === ActivityAction.CREATE) {
            return `Investment recorded: "${t}" — ${label} balance ${deltaStr}`;
        }
        return `Investment updated: "${t}" — ${label} balance ${deltaStr}`;
    }

    return `Activity: "${t}" — ${label} balance ${deltaStr}`;
}

export async function logAccountBalanceFromTransaction(
    tx: Prisma.TransactionClient,
    input: AccountBalanceActivityInput
): Promise<void> {
    const description = buildLedgerDescription(input);
    const source = ledgerMetadataSource(input.entityType);

    const accountRow = await tx.account.findUnique({
        where: { id: input.accountId },
        select: { balance: true },
    });
    let accountBalanceAfterUserCurrency: number | undefined;
    let accountBalanceBeforeUserCurrency: number | undefined;
    if (accountRow) {
        const after = decimalToNumber(accountRow.balance, "account balance");
        accountBalanceAfterUserCurrency = after;
        accountBalanceBeforeUserCurrency = after - input.balanceDeltaUserCurrency;
    }

    await tx.activityLog.create({
        data: {
            userId: input.userId,
            action: input.action,
            entityType: input.entityType,
            entityId: input.entityId,
            description,
            metadata: {
                source,
                reason: input.reason,
                accountId: input.accountId,
                accountLabel: input.holderName?.trim()
                    ? `${input.holderName.trim()} · ${input.accountBankName}`
                    : input.accountBankName,
                balanceDeltaUserCurrency: input.balanceDeltaUserCurrency,
                userCurrency: input.userCurrency,
                transactionTitle: input.transactionTitle,
                transactionAmountOriginal: input.transactionAmountOriginal,
                transactionCurrency: input.transactionCurrency,
                ...(accountBalanceBeforeUserCurrency !== undefined &&
                accountBalanceAfterUserCurrency !== undefined
                    ? {
                          accountBalanceBeforeUserCurrency,
                          accountBalanceAfterUserCurrency,
                      }
                    : {}),
                ...(input.extraMetadata ?? {}),
            },
            category: input.category,
            severity: ActivitySeverity.INFO,
            status: ActivityStatus.SUCCESS,
        },
    });
}
