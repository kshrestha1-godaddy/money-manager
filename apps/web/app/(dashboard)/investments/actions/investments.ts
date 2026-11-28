"use server";

import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { InvestmentInterface } from "../../../types/investments";
import { revalidatePath } from "next/cache";
import { getUserIdFromSession, decimalToNumber } from "../../../utils/auth";
import type { Prisma } from "@prisma/client";
import { parseInvestmentsCSV, ParsedInvestmentData } from "../../../utils/csvImportInvestments";
import { convertForDisplayWithDbRates } from "../../../utils/currencyDisplayServer";
import { ImportResult } from "../../../types/bulkImport";
import { parseCSV } from "../../../utils/csvUtils";
import { bulkImportInvestmentTargets } from "./investment-targets";
import { requireAppLockPassword } from "../../../lib/security/require-app-lock-password";
import { getLockedLedgerCurrency } from "../../../utils/ledgerCurrency";
import {
    presentValueForPosition,
    resolvePurchasePriceForInvestmentDisplay,
    sumStocksCategoryExpenseAmountsForUser,
} from "../utils/stocksExpenseBasis";

function investmentShouldDeduct(
    deductFromAccount: boolean | undefined | null
): boolean {
    return deductFromAccount !== false;
}

function investmentPurchaseCost(quantity: unknown, purchasePrice: unknown): number {
    const q = decimalToNumber(quantity, "investment quantity");
    const p = decimalToNumber(purchasePrice, "investment purchase price");
    return q * p;
}

/**
 * Withheld investments reserve free balance without changing Account.balance.
 * Free = ledger balance − other withheld purchase costs on the same account.
 */
export async function assertAccountHasFreeBalanceForWithheld(
    tx: Prisma.TransactionClient,
    userId: number,
    accountId: number,
    requiredAmount: number,
    excludeInvestmentId?: number
): Promise<{ bankName: string; free: number }> {
    const account = await tx.account.findUnique({
        where: { id: accountId },
        select: { balance: true, bankName: true, userId: true },
    });
    if (!account || account.userId !== userId) {
        throw new Error("Selected account not found");
    }

    const otherWithheld = await tx.investment.findMany({
        where: {
            userId,
            accountId,
            deductFromAccount: true,
            ...(excludeInvestmentId != null ? { id: { not: excludeInvestmentId } } : {}),
        },
        select: { quantity: true, purchasePrice: true },
    });
    const withheldTotal = otherWithheld.reduce(
        (sum, row) => sum + investmentPurchaseCost(row.quantity, row.purchasePrice),
        0
    );
    const balance = decimalToNumber(account.balance, "account balance");
    const free = balance - withheldTotal;
    if (requiredAmount > free) {
        throw new Error(
            `Insufficient free balance in ${account.bankName}. Available: ${free}, required: ${requiredAmount}`
        );
    }
    return { bankName: account.bankName, free };
}

/** Sum of quantity × currentPrice for all investments linked to this target (same rule as target progress). */
async function sumFulfilledForTarget(userId: number, targetId: number): Promise<number> {
    const rows = await prisma.investment.findMany({
        where: { userId, investmentTargetId: targetId },
        select: { quantity: true, currentPrice: true },
    });
    return rows.reduce((sum, r) => sum + presentValueForPosition(r), 0);
}

function mapInvestmentTargetRow(
    target: {
        id: number;
        investmentType: InvestmentInterface["type"];
        nickname: string | null;
        targetAmount: unknown;
        targetCompletionDate: Date | null;
    },
    fulfilledAmount: number
): NonNullable<InvestmentInterface["investmentTarget"]> {
    return {
        id: target.id,
        investmentType: target.investmentType,
        nickname: target.nickname,
        targetAmount: decimalToNumber(target.targetAmount, "investment target amount"),
        fulfilledAmount,
        targetCompletionDate: target.targetCompletionDate
            ? new Date(target.targetCompletionDate)
            : undefined,
    };
}

async function resolveInvestmentTargetIdForUser(
    userId: number,
    investmentTargetId: number | null
): Promise<number | null> {
    if (investmentTargetId === null) return null;
    const target = await prisma.investmentTarget.findFirst({
        where: { id: investmentTargetId, userId },
        select: { id: true },
    });
    if (!target) {
        throw new Error("Investment target not found or does not belong to you");
    }
    return target.id;
}

export async function getUserInvestments(): Promise<{ data?: InvestmentInterface[], error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return { error: "Unauthorized" };
        }

        const userId = getUserIdFromSession(session.user.id);
        
        // Validate that userId is a valid number
        if (isNaN(userId)) {
            console.error(`Invalid user ID: ${session.user.id}`);
            return { error: "Invalid user ID" };
        }
        
        // First verify user exists
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user) {
            // If user doesn't exist, create them (for OAuth users)
            if (session.user.email && session.user.name) {
                console.info(`Creating new OAuth user for investments: ${session.user.email}`);
                const newUser = await prisma.user.create({
                    data: {
                        id: userId,
                        email: session.user.email,
                        name: session.user.name,
                        number: `oauth_${userId}`, // Temporary number for OAuth users
                        password: "oauth_user", // Placeholder password for OAuth users
                    },
                });
                
                // Return empty investments array for new user
                return { data: [] };
            } else {
                console.error(`User not found and insufficient OAuth data for investments user ID: ${userId}`);
                return { error: "User not found in database and insufficient data to create user" };
            }
        }
        
        // Get investments for the verified user
        const investments = await prisma.investment.findMany({
            where: {
                userId: userId,
            },
            include: {
                account: true,
                _count: { select: { scheduledPayments: true } },
                investmentTarget: {
                    select: {
                        id: true,
                        investmentType: true,
                        nickname: true,
                        targetAmount: true,
                        targetCompletionDate: true,
                    },
                },
            },
            orderBy: {
                purchaseDate: 'desc',
            },
        });
        
        // Ensure investments is an array
        if (!Array.isArray(investments)) {
            console.error("Invalid investments data received from database");
            return { error: "Invalid investments data" };
        }

        const [stocksExpenseTotal, sipExpenseTotal] = await Promise.all([
            sumStocksCategoryExpenseAmountsForUser(userId),
            sumStocksCategoryExpenseAmountsForUser(userId, "SIP"),
        ]);
        const isScheduleCreatedShell = (investment: (typeof investments)[number]) =>
            Boolean(investment._count?.scheduledPayments) ||
            investment.notes === "Created via Schedule an Investment";

        const sipPositionCount = investments.filter(
            (inv) => inv.type === "SIP" && !isScheduleCreatedShell(inv)
        ).length;
        const stocksPositionCount = investments.filter(
            (inv) => inv.type === "STOCKS" && !isScheduleCreatedShell(inv)
        ).length;

        const fulfilledByTargetId = new Map<number, number>();
        for (const inv of investments) {
            if (inv.investmentTargetId == null) continue;
            const pv = presentValueForPosition({
                quantity: inv.quantity,
                currentPrice: inv.currentPrice,
            });
            const tid = inv.investmentTargetId;
            fulfilledByTargetId.set(tid, (fulfilledByTargetId.get(tid) ?? 0) + pv);
        }
        
        // Convert Decimal amounts to number to prevent serialization issues
        const transformedInvestments = investments.map(investment => {
            try {
                const quantity = parseFloat(investment.quantity.toString());
                const dbPurchasePrice = parseFloat(investment.purchasePrice.toString());
                // Schedule shells use DB cost (withhold basis). Expense-split display is for
                // the primary Stocks/SIP portfolio position only.
                const purchasePrice =
                    isScheduleCreatedShell(investment) ||
                    (investment.type !== "STOCKS" && investment.type !== "SIP")
                        ? dbPurchasePrice
                        : resolvePurchasePriceForInvestmentDisplay(
                              {
                                  type: investment.type,
                                  quantity: investment.quantity,
                                  purchasePrice: investment.purchasePrice,
                              },
                              investment.type === "SIP" ? sipExpenseTotal : stocksExpenseTotal,
                              investment.type === "SIP" ? sipPositionCount : stocksPositionCount
                          );
                const currentPrice = parseFloat(investment.currentPrice.toString());
                
                // Validate converted numbers
                if (!isFinite(quantity) || isNaN(quantity)) {
                    throw new Error(`Invalid investment quantity: ${investment.quantity}`);
                }
                if (!isFinite(purchasePrice) || isNaN(purchasePrice)) {
                    throw new Error(`Invalid purchase price: ${investment.purchasePrice}`);
                }
                if (!isFinite(currentPrice) || isNaN(currentPrice)) {
                    throw new Error(`Invalid current price: ${investment.currentPrice}`);
                }
                
                // Transform nested account data if it exists
                const transformedAccount = investment.account ? {
                    ...investment.account,
                    balance: parseFloat(investment.account.balance.toString()),
                    accountOpeningDate: new Date(investment.account.accountOpeningDate),
                    createdAt: new Date(investment.account.createdAt),
                    updatedAt: new Date(investment.account.updatedAt),
                } : investment.account;
                
                return {
                    id: investment.id,
                    name: investment.name,
                    type: investment.type,
                    isScheduledContribution: isScheduleCreatedShell(investment),
                    symbol: investment.symbol,
                    quantity,
                    purchasePrice,
                    currentPrice,
                    purchaseDate: new Date(investment.purchaseDate),
                    accountId: investment.accountId,
                    userId: investment.userId,
                    notes: investment.notes,
                    deductFromAccount: investment.deductFromAccount,
                    investmentTargetId: investment.investmentTargetId,
                    investmentTarget: investment.investmentTarget
                        ? mapInvestmentTargetRow(
                              investment.investmentTarget,
                              fulfilledByTargetId.get(investment.investmentTarget.id) ?? 0
                          )
                        : null,
                    createdAt: new Date(investment.createdAt),
                    updatedAt: new Date(investment.updatedAt),
                    account: transformedAccount,
                    // Handle fixed deposit specific fields
                    interestRate: investment.interestRate ? parseFloat(investment.interestRate.toString()) : undefined,
                    maturityDate: investment.maturityDate ? new Date(investment.maturityDate) : undefined,
                };
            } catch (transformError) {
                console.error(`Data transformation failed for investment ID ${investment.id}:`, transformError);
                throw new Error(`Data transformation failed for investment ID ${investment.id}`);
            }
        }) as InvestmentInterface[];

        return { data: transformedInvestments };
    } catch (error) {
        console.error("Failed to fetch user investments:", error);
        return { error: "Failed to fetch investments" };
    }
}

/**
 * Increase an investment's quantity so purchase cost grows by `contributionAmount`
 * (ledger currency). When the position is withheld, asserts free balance first.
 */
export async function applyContributionToInvestmentInTransaction(
    tx: Prisma.TransactionClient,
    userId: number,
    investmentId: number,
    contributionAmount: number
): Promise<void> {
    if (!Number.isFinite(contributionAmount) || contributionAmount <= 0) {
        throw new Error("Contribution amount must be positive");
    }

    const investment = await tx.investment.findFirst({
        where: { id: investmentId, userId },
        select: {
            id: true,
            accountId: true,
            deductFromAccount: true,
            quantity: true,
            purchasePrice: true,
            currentPrice: true,
        },
    });
    if (!investment) throw new Error("Linked investment not found");
    if (!investment.accountId) {
        throw new Error("Linked investment has no account to withhold from");
    }

    const purchasePrice = decimalToNumber(investment.purchasePrice, "investment purchase price");
    const quantity = decimalToNumber(investment.quantity, "investment quantity");
    const currentPrice = decimalToNumber(investment.currentPrice, "investment current price");

    // Zero-basis scheduled shell (initial contribution was 0): first accept establishes cost.
    if (purchasePrice <= 0) {
        await assertAccountHasFreeBalanceForWithheld(
            tx,
            userId,
            investment.accountId,
            contributionAmount,
            investment.id
        );
        await tx.investment.update({
            where: { id: investment.id },
            data: {
                quantity: 1,
                purchasePrice: contributionAmount,
                currentPrice: currentPrice > 0 ? currentPrice : contributionAmount,
                deductFromAccount: true,
            },
        });
        return;
    }

    const addedQuantity = contributionAmount / purchasePrice;
    const newQuantity = quantity + addedQuantity;
    const newCost = newQuantity * purchasePrice;

    await assertAccountHasFreeBalanceForWithheld(
        tx,
        userId,
        investment.accountId,
        newCost,
        investment.id
    );

    await tx.investment.update({
        where: { id: investment.id },
        data: {
            quantity: newQuantity,
            deductFromAccount: true,
        },
    });
}

export async function createInvestment(
    investment: Omit<InvestmentInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'account' | 'investmentTarget'>
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);
        const validatedTargetId = await resolveInvestmentTargetIdForUser(
            userId,
            investment.investmentTargetId ?? null
        );
        let user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user) {
            // If user doesn't exist, create them (for OAuth users)
            if (session.user.email && session.user.name) {
                console.info(`Creating new OAuth user for investment creation: ${session.user.email}`);
                user = await prisma.user.create({
                    data: {
                        id: userId,
                        email: session.user.email,
                        name: session.user.name,
                        number: `oauth_${userId}`, // Temporary number for OAuth users
                        password: "oauth_user", // Placeholder password for OAuth users
                    },
                });
            } else {
                console.error(`User not found and insufficient OAuth data for investment creation user ID: ${userId}`);
                throw new Error("User not found in database and insufficient data to create user");
            }
        }

        const deduct = investmentShouldDeduct(investment.deductFromAccount);
        const linkedAccountId = investment.accountId ?? null;
        const purchaseCost =
            Number(investment.quantity) * Number(investment.purchasePrice);

        const result = await prisma.$transaction(async (tx) => {
            await getLockedLedgerCurrency(tx, userId);
            if (investment.type === "STOCKS") {
                const existingStocks = await tx.investment.count({
                    where: { userId, type: "STOCKS" },
                });
                if (existingStocks > 0) {
                    throw new Error(
                        "You already have a Stocks investment. Only one Stocks position is allowed—edit or remove it before adding another."
                    );
                }
            }
            // Withhold reserves free balance; do not mutate Account.balance.
            if (deduct && linkedAccountId && purchaseCost > 0) {
                await assertAccountHasFreeBalanceForWithheld(
                    tx,
                    userId,
                    linkedAccountId,
                    purchaseCost
                );
            }

            const saved = await tx.investment.create({
                data: {
                    name: investment.name,
                    type: investment.type,
                    symbol: investment.symbol ?? null,
                    quantity: investment.quantity,
                    purchasePrice: investment.purchasePrice,
                    currentPrice: investment.currentPrice,
                    purchaseDate: investment.purchaseDate,
                    accountId: investment.accountId ?? null,
                    notes: investment.notes ?? null,
                    interestRate: investment.interestRate ?? null,
                    maturityDate: investment.maturityDate ?? null,
                    deductFromAccount: investment.deductFromAccount ?? true,
                    investmentTargetId: validatedTargetId,
                    userId: user.id,
                },
                include: {
                    account: true,
                    investmentTarget: {
                        select: {
                            id: true,
                            investmentType: true,
                            nickname: true,
                            targetAmount: true,
                            targetCompletionDate: true,
                        },
                    },
                },
            });
            if (validatedTargetId) {
                const { recalcOpenContributionSchedulesForTarget } = await import("./schedule-investment");
                await recalcOpenContributionSchedulesForTarget(userId, validatedTargetId, tx);
            }
            return saved;
        });

        // Revalidate related pages
        revalidatePath("/(dashboard)/investments");
        revalidatePath("/(dashboard)/accounts");
        revalidatePath("/scheduled-payments");
        revalidatePath("/calendar");
        console.info(`Investment created successfully: ${investment.name} - $${investment.purchasePrice} for user ${userId}`);

        // Trigger notification checks
        try {
            const { generateNotificationsForUser } = await import('../../../actions/notifications');
            
            // Use the comprehensive check to ensure all notification types are evaluated
            await generateNotificationsForUser(userId);
        } catch (error) {
            console.error("Failed to check notifications after investment creation:", error);
        }
        
        // Convert Decimal amounts to number to prevent serialization issues
        // Transform nested account data if it exists
        const transformedAccount = result.account ? {
            ...result.account,
            balance: parseFloat(result.account.balance.toString()),
            accountOpeningDate: new Date(result.account.accountOpeningDate),
            createdAt: new Date(result.account.createdAt),
            updatedAt: new Date(result.account.updatedAt),
        } : result.account;

        let investmentTargetOut: InvestmentInterface["investmentTarget"] = null;
        if (result.investmentTargetId && result.investmentTarget) {
            const fulfilled = await sumFulfilledForTarget(userId, result.investmentTargetId);
            investmentTargetOut = mapInvestmentTargetRow(result.investmentTarget, fulfilled);
        }
        
        return {
            id: result.id,
            name: result.name,
            type: result.type,
            symbol: result.symbol,
            quantity: parseFloat(result.quantity.toString()),
            purchasePrice: parseFloat(result.purchasePrice.toString()),
            currentPrice: parseFloat(result.currentPrice.toString()),
            purchaseDate: new Date(result.purchaseDate),
            accountId: result.accountId,
            userId: result.userId,
            notes: result.notes,
            deductFromAccount: result.deductFromAccount,
            investmentTargetId: result.investmentTargetId,
            investmentTarget: investmentTargetOut,
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt),
            account: transformedAccount,
            // Handle fixed deposit specific fields
            interestRate: result.interestRate ? parseFloat(result.interestRate.toString()) : undefined,
            maturityDate: result.maturityDate ? new Date(result.maturityDate) : undefined,
        } as InvestmentInterface;
    } catch (error) {
        console.error(`Failed to create investment: ${investment.name}`, error);
        throw error;
    }
}

export async function updateInvestment(
    id: number,
    investment: Partial<Omit<InvestmentInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'account' | 'investmentTarget'>>
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        let previousTargetId: number | null = null;
        const result = await prisma.$transaction(async (tx) => {
            await getLockedLedgerCurrency(tx, userId);
            const existing = await tx.investment.findFirst({
                where: { id, userId },
            });

            if (!existing) {
                throw new Error("Investment not found or unauthorized");
            }
            previousTargetId = existing.investmentTargetId;

            const nextType =
                investment.type !== undefined ? investment.type : existing.type;
            if (nextType === "STOCKS") {
                const otherStocks = await tx.investment.count({
                    where: { userId, type: "STOCKS", id: { not: id } },
                });
                if (otherStocks > 0) {
                    throw new Error(
                        "Only one Stocks investment is allowed. Change the existing Stocks position or choose another type."
                    );
                }
            }

            const { investmentTargetId: rawTargetId, ...restInvestment } = investment;
            const updateData: Record<string, unknown> = { ...restInvestment };
            if (rawTargetId !== undefined) {
                updateData.investmentTargetId = await resolveInvestmentTargetIdForUser(
                    userId,
                    rawTargetId
                );
            }

            const oldAccountId = existing.accountId;
            const newQty =
                investment.quantity !== undefined
                    ? Number(investment.quantity)
                    : decimalToNumber(existing.quantity, "investment quantity");
            const newPrice =
                investment.purchasePrice !== undefined
                    ? Number(investment.purchasePrice)
                    : decimalToNumber(existing.purchasePrice, "investment purchase price");
            const newCost = newQty * newPrice;

            const newAccountId =
                investment.accountId !== undefined
                    ? investment.accountId
                    : oldAccountId;
            const newDeduct =
                investment.deductFromAccount !== undefined
                    ? investmentShouldDeduct(investment.deductFromAccount)
                    : investmentShouldDeduct(existing.deductFromAccount);

            if (nextType !== existing.type || newAccountId !== oldAccountId || !newDeduct ||
                (rawTargetId !== undefined && rawTargetId !== previousTargetId)) {
                const openPayment = await tx.scheduledPayment.findFirst({
                    where: { userId, investmentId: id, resolution: null },
                    select: { id: true },
                });
                if (openPayment) {
                    throw new Error("Finish or cancel the contribution schedule before changing its type, account, withholding, or target.");
                }
            }

            // Withhold is a reservation only — validate free balance, never mutate ledger.
            if (newDeduct && newAccountId != null && newCost > 0) {
                await assertAccountHasFreeBalanceForWithheld(
                    tx,
                    userId,
                    newAccountId,
                    newCost,
                    id
                );
            }

            const saved = await tx.investment.update({
                where: { id },
                data: updateData,
                include: {
                    account: true,
                    investmentTarget: {
                        select: {
                            id: true,
                            investmentType: true,
                            nickname: true,
                            targetAmount: true,
                            targetCompletionDate: true,
                        },
                    },
                },
            });

            // Target cleared or changed — drop open contribution reminders on this investment
            // so the series cannot recur without a completion bound.
            if (
                rawTargetId !== undefined &&
                previousTargetId !== saved.investmentTargetId
            ) {
                await tx.scheduledPayment.deleteMany({
                    where: { userId, investmentId: id, resolution: null },
                });
            }

            const { recalcOpenContributionSchedulesForTarget } = await import("./schedule-investment");
            for (const targetId of new Set([previousTargetId, saved.investmentTargetId])) {
                if (targetId) await recalcOpenContributionSchedulesForTarget(userId, targetId, tx);
            }
            return saved;
        });

        // Revalidate related pages
        revalidatePath("/(dashboard)/investments");
        revalidatePath("/(dashboard)/accounts");
        revalidatePath("/scheduled-payments");
        revalidatePath("/calendar");

        console.info(`Investment updated successfully: ${id} for user ${userId}`);
        
        // Convert Decimal amounts to number to prevent serialization issues
        // Transform nested account data if it exists
        const transformedAccount = result.account ? {
            ...result.account,
            balance: parseFloat(result.account.balance.toString()),
            accountOpeningDate: new Date(result.account.accountOpeningDate),
            createdAt: new Date(result.account.createdAt),
            updatedAt: new Date(result.account.updatedAt),
        } : result.account;

        let investmentTargetUpdated: InvestmentInterface["investmentTarget"] = null;
        if (result.investmentTargetId && result.investmentTarget) {
            const fulfilled = await sumFulfilledForTarget(userId, result.investmentTargetId);
            investmentTargetUpdated = mapInvestmentTargetRow(result.investmentTarget, fulfilled);
        }
        
        return {
            id: result.id,
            name: result.name,
            type: result.type,
            symbol: result.symbol,
            quantity: parseFloat(result.quantity.toString()),
            purchasePrice: parseFloat(result.purchasePrice.toString()),
            currentPrice: parseFloat(result.currentPrice.toString()),
            purchaseDate: new Date(result.purchaseDate),
            accountId: result.accountId,
            userId: result.userId,
            notes: result.notes,
            deductFromAccount: result.deductFromAccount,
            investmentTargetId: result.investmentTargetId,
            investmentTarget: investmentTargetUpdated,
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt),
            account: transformedAccount,
            // Handle fixed deposit specific fields
            interestRate: result.interestRate ? parseFloat(result.interestRate.toString()) : undefined,
            maturityDate: result.maturityDate ? new Date(result.maturityDate) : undefined,
        } as InvestmentInterface;
    } catch (error) {
        console.error(`Failed to update investment ${id}:`, error);
        throw error;
    }
}

export async function deleteInvestment(id: number, appLockPassword: string) {
    try {
        const userId = await requireAppLockPassword(appLockPassword);

        await deleteInvestmentsForUser(userId, [id]);

        console.info(`Investment deleted successfully: ${id} for user ${userId}`);
        return { success: true };
    } catch (error) {
        console.error(`Failed to delete investment ${id}:`, error);
        throw error;
    }
}

export async function getUserAccounts(): Promise<{ data?: any[], error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return { error: "Unauthorized" };
        }

        const userId = getUserIdFromSession(session.user.id);
        
        const accounts = await prisma.account.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                bankName: 'asc',
            },
        });

        // Convert Decimal balance to number to prevent serialization issues
        const transformedAccounts = accounts.map(account => ({
            ...account,
            balance: parseFloat(account.balance.toString()),
            accountOpeningDate: new Date(account.accountOpeningDate),
            createdAt: new Date(account.createdAt),
            updatedAt: new Date(account.updatedAt),
        }));

        return { data: transformedAccounts };
    } catch (error) {
        console.error("Failed to fetch user accounts for investments:", error);
        return { error: "Failed to fetch accounts" };
    }
}

/**
 * Bulk import investments from CSV
 */
export async function bulkImportInvestments(csvContent: string): Promise<ImportResult> {
    return importInvestmentRows(csvContent);
}

async function importInvestmentRows(csvContent: string, targetIds?: Record<number, number>): Promise<ImportResult> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        const userRow = await prisma.user.findUnique({
            where: { id: userId },
            select: { currency: true },
        });
        const userCurrency = userRow?.currency || "USD";

        // Get user accounts for validation
        const accounts = await prisma.account.findMany({
            where: { userId: userId }
        });

        // Parse CSV
        const parseResult = parseInvestmentsCSV(csvContent, accounts) as ImportResult & { data?: ParsedInvestmentData[] };
        
        if (!parseResult.success || !parseResult.data) {
            return {
                success: parseResult.success,
                importedCount: 0,
                errors: parseResult.errors,
                skippedCount: parseResult.skippedCount
            };
        }

        const validInvestments = parseResult.data;
        const result: ImportResult = {
            success: false,
            importedCount: 0,
            errors: [...parseResult.errors],
            skippedCount: parseResult.skippedCount
        };

        // Process investments in batches to avoid timeout
        const BATCH_SIZE = 10;
        const batches = [];
        for (let i = 0; i < validInvestments.length; i += BATCH_SIZE) {
            batches.push(validInvestments.slice(i, i + BATCH_SIZE));
        }

        for (const batch of batches) {
            try {
                await prisma.$transaction(async (tx) => {
                    const userCurrency = await getLockedLedgerCurrency(tx, userId);
                    for (const investmentData of batch) {
                        try {
                            let account = null;
                            
                            // Validate account exists only if accountId is provided
                            if (investmentData.accountId) {
                                account = await tx.account.findUnique({
                                    where: { id: investmentData.accountId },
                                    select: {
                                        id: true,
                                        bankName: true,
                                        holderName: true,
                                        balance: true,
                                        userId: true,
                                    },
                                });

                                if (!account || account.userId !== userId) {
                                    result.errors.push({
                                        row: 0, // We don't have row tracking in batch processing
                                        error: `Account not found for investment: ${investmentData.name}`,
                                        data: investmentData
                                    });
                                    continue;
                                }
                            }

                            const deductFromCsv = (
                                investmentData as { deductFromAccount?: boolean }
                            ).deductFromAccount;
                            const deduct = investmentShouldDeduct(
                                deductFromCsv ?? false
                            );
                            const priceCurrency =
                                investmentData.priceCurrency || userCurrency;
                            const [purchasePrice, currentPrice] = await Promise.all([
                                convertForDisplayWithDbRates(
                                    investmentData.purchasePrice,
                                    priceCurrency,
                                    userCurrency,
                                    userId
                                ),
                                convertForDisplayWithDbRates(
                                    investmentData.currentPrice,
                                    priceCurrency,
                                    userCurrency,
                                    userId
                                ),
                            ]);
                            const purchaseCost =
                                investmentData.quantity * purchasePrice;

                            if (
                                deduct &&
                                investmentData.accountId &&
                                purchaseCost > 0
                            ) {
                                try {
                                    await assertAccountHasFreeBalanceForWithheld(
                                        tx,
                                        userId,
                                        investmentData.accountId,
                                        purchaseCost
                                    );
                                } catch (error) {
                                    result.errors.push({
                                        row: 0,
                                        error: error instanceof Error
                                            ? error.message
                                            : `Insufficient free balance for ${investmentData.name}`,
                                        data: investmentData,
                                    });
                                    continue;
                                }
                            }

                            if (investmentData.type === "STOCKS") {
                                const stocksCount = await tx.investment.count({
                                    where: { userId, type: "STOCKS" },
                                });
                                if (stocksCount > 0) {
                                    result.errors.push({
                                        row: 0,
                                        error: `Only one Stocks investment allowed — skipped "${investmentData.name}"`,
                                        data: investmentData,
                                    });
                                    continue;
                                }
                            }

                            const { priceCurrency: _priceCurrency, investmentTargetId: sourceTargetId, ...investmentFields } =
                                investmentData;
                            const investmentTargetId = sourceTargetId && targetIds ? targetIds[sourceTargetId] : sourceTargetId;
                            if (sourceTargetId && !investmentTargetId) {
                                throw new Error(`Investment target ${sourceTargetId} was not restored from the targets file`);
                            }
                            if (investmentTargetId && !await tx.investmentTarget.findFirst({
                                where: { id: investmentTargetId, userId },
                                select: { id: true },
                            })) {
                                throw new Error(`Investment target ${investmentTargetId} was not found in this workspace`);
                            }
                            await tx.investment.create({
                                data: {
                                    ...investmentFields,
                                    investmentTargetId,
                                    purchasePrice,
                                    currentPrice,
                                    userId: userId,
                                    deductFromAccount: deductFromCsv ?? false,
                                },
                            });

                            result.importedCount++;
                        } catch (error) {
                            result.errors.push({
                                row: 0,
                                error: `Failed to import investment ${investmentData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                                data: investmentData
                            });
                        }
                    }
                }, {
                    timeout: 30000, // 30 second timeout per batch
                });
            } catch (error) {
                // If a batch fails, add errors for all items in that batch
                batch.forEach((investmentData: ParsedInvestmentData) => {
                    result.errors.push({
                        row: 0,
                        error: `Batch import failed for ${investmentData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        data: investmentData
                    });
                });
            }
        }

        result.success = result.importedCount > 0;

        revalidatePath("/(dashboard)/investments");
        revalidatePath("/(dashboard)/accounts");

        return result;

    } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to import investments");
    }
}

/**
 * Bulk delete investments
 */
async function deleteInvestmentsForUser(userId: number, ids: number[]) {
    const deletedCount = await prisma.$transaction(async (tx) => {
        await getLockedLedgerCurrency(tx, userId);
        const where = { userId, id: { in: ids } };
        const rows = await tx.investment.findMany({
            where,
            select: { investmentTargetId: true },
        });
        if (rows.length !== ids.length) {
            throw new Error("Some investments not found or unauthorized");
        }
        await tx.scheduledPayment.deleteMany({
            where: { userId, investmentId: { in: ids }, resolution: null },
        });
        const result = await tx.investment.deleteMany({ where });
        const { recalcOpenContributionSchedulesForTarget } = await import("./schedule-investment");
        for (const targetId of new Set(rows.map(row => row.investmentTargetId))) {
            if (targetId) await recalcOpenContributionSchedulesForTarget(userId, targetId, tx);
        }
        return result.count;
    });
    for (const path of ["/investments", "/accounts", "/scheduled-payments", "/calendar"]) {
        revalidatePath(path);
    }
    return deletedCount;
}

export async function bulkDeleteInvestments(investmentIds: number[], appLockPassword: string) {
    try {
        const userId = await requireAppLockPassword(appLockPassword);

        const deletedCount = await deleteInvestmentsForUser(userId, investmentIds);
        return { success: true, deletedCount };
    } catch (error) {
        console.error(`Failed to bulk delete investments:`, error);
        throw error;
    }
}

/**
 * Combined import: Import investments and targets
 */
export async function bulkImportInvestmentsWithTargets(
    investmentFile: File, 
    targetFile?: File, 
    defaultAccountId?: string
): Promise<{
    investmentImport: {
        success: number;
        errors: Array<{ row: number; message: string }>;
    };
    targetImport?: {
        success: number;
        errors: Array<{ row: number; error: string }>;
        importedCount: number;
    };
}> {
    let targetImportResult;

    // Import targets first if provided
    if (targetFile) {
        try {
            targetImportResult = await bulkImportInvestmentTargets(targetFile);
        } catch (error) {
            targetImportResult = {
                success: 0,
                errors: [{ row: 0, error: error instanceof Error ? error.message : 'Failed to import targets' }],
                importedCount: 0
            };
        }
    }

    // Import investments
    const investmentText = await investmentFile.text();
    const investmentImportResult = await importInvestmentRows(investmentText, targetFile ? targetImportResult?.targetIds ?? {} : undefined);

    return {
        investmentImport: {
            success: investmentImportResult.importedCount,
            errors: investmentImportResult.errors.map(e => ({
                row: e.row,
                message: e.error
            }))
        },
        targetImport: targetImportResult
    };
}

/**
 * Parse CSV for UI preview (compatible with unified modal)
 */
export async function parseCSVForUI(csvText: string): Promise<string[][]> {
    return parseCSV(csvText);
}

export async function importCorrectedRow(
    rowData: string[],
    headers: string[],
    targetIds?: Record<number, number>,
): Promise<any> {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const userId = getUserIdFromSession(session.user.id);

    // Get user accounts for validation
    const accounts = await prisma.account.findMany({
        where: { userId: userId }
    });

    // Create a temporary CSV string from the corrected row data
    const csvString = [headers, rowData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    
    const parseResult = parseInvestmentsCSV(csvString, accounts) as ImportResult & { data?: ParsedInvestmentData[] };
    
    if (!parseResult.success || !parseResult.data || parseResult.data.length === 0) {
        throw new Error("Failed to parse corrected row data");
    }

    const investmentData = parseResult.data[0];
    if (!investmentData) {
        throw new Error("Failed to parse corrected row data");
    }
    const deductFromCsv = (investmentData as { deductFromAccount?: boolean })
        .deductFromAccount;
    const deduct = investmentShouldDeduct(deductFromCsv ?? false);

    if (investmentData.type === "STOCKS") {
        const existingStocks = await prisma.investment.count({
            where: { userId, type: "STOCKS" },
        });
        if (existingStocks > 0) {
            throw new Error(
                "Only one Stocks investment is allowed. Remove or change the existing Stocks position first."
            );
        }
    }

    const newInvestment = await prisma.$transaction(async (tx) => {
        const userCurrency = await getLockedLedgerCurrency(tx, userId);
        const priceCurrency = investmentData.priceCurrency || userCurrency;
        const [purchasePrice, currentPrice] = await Promise.all([
            convertForDisplayWithDbRates(
                investmentData.purchasePrice,
                priceCurrency,
                userCurrency,
                userId
            ),
            convertForDisplayWithDbRates(
                investmentData.currentPrice,
                priceCurrency,
                userCurrency,
                userId
            ),
        ]);
        const purchaseCost = investmentData.quantity * purchasePrice;

        if (
            deduct &&
            investmentData.accountId &&
            purchaseCost > 0
        ) {
            await assertAccountHasFreeBalanceForWithheld(
                tx,
                userId,
                investmentData.accountId,
                purchaseCost
            );
        }

        const { priceCurrency: _priceCurrency, investmentTargetId: sourceTargetId, ...investmentFields } = investmentData;
        const investmentTargetId = sourceTargetId && targetIds ? targetIds[sourceTargetId] : sourceTargetId;
        if (sourceTargetId && !investmentTargetId) {
            throw new Error(`Investment target ${sourceTargetId} was not restored from the targets file`);
        }
        if (investmentTargetId && !await tx.investmentTarget.findFirst({
            where: { id: investmentTargetId, userId },
            select: { id: true },
        })) {
            throw new Error(`Investment target ${investmentTargetId} was not found in this workspace`);
        }
        return tx.investment.create({
            data: {
                ...investmentFields,
                investmentTargetId,
                purchasePrice,
                currentPrice,
                userId: userId,
                deductFromAccount: deductFromCsv ?? false,
            },
            include: {
                account: true,
            },
        });
    });
    
    revalidatePath("/(dashboard)/investments");
    revalidatePath("/(dashboard)/accounts");
    return newInvestment;
} 