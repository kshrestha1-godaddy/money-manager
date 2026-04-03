"use server";

import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { InvestmentInterface } from "../../../types/investments";
import { revalidatePath } from "next/cache";
import { getUserIdFromSession, decimalToNumber } from "../../../utils/auth";
import { logAccountBalanceFromTransaction } from "../../../utils/accountActivityLog";
import {
    ActivityAction,
    ActivityCategory,
    ActivityEntityType,
} from "@prisma/client";
import { parseInvestmentsCSV, ParsedInvestmentData } from "../../../utils/csvImportInvestments";
import { ImportResult } from "../../../types/bulkImport";
import { bulkImportInvestmentTargets } from "./investment-targets";
import {
    countStocksInvestmentsForUser,
    investedAmountForPosition,
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

/** Sum of quantity × purchasePrice for all investments linked to this target (same rule as target progress). */
async function sumFulfilledForTarget(userId: number, targetId: number): Promise<number> {
    const [rows, stocksExpenseTotal, stocksPositionCount] = await Promise.all([
        prisma.investment.findMany({
            where: { userId, investmentTargetId: targetId },
            select: { quantity: true, purchasePrice: true, type: true },
        }),
        sumStocksCategoryExpenseAmountsForUser(userId),
        countStocksInvestmentsForUser(userId),
    ]);
    return rows.reduce(
        (sum, r) =>
            sum + investedAmountForPosition(r, stocksExpenseTotal, stocksPositionCount),
        0
    );
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

        const stocksExpenseTotal = await sumStocksCategoryExpenseAmountsForUser(userId);
        const stocksPositionCount = investments.filter((inv) => inv.type === "STOCKS").length;

        const fulfilledByTargetId = new Map<number, number>();
        for (const inv of investments) {
            if (inv.investmentTargetId == null) continue;
            const cost = investedAmountForPosition(
                { type: inv.type, quantity: inv.quantity, purchasePrice: inv.purchasePrice },
                stocksExpenseTotal,
                stocksPositionCount
            );
            const tid = inv.investmentTargetId;
            fulfilledByTargetId.set(tid, (fulfilledByTargetId.get(tid) ?? 0) + cost);
        }
        
        // Convert Decimal amounts to number to prevent serialization issues
        const transformedInvestments = investments.map(investment => {
            try {
                const quantity = parseFloat(investment.quantity.toString());
                const purchasePrice = resolvePurchasePriceForInvestmentDisplay(
                    {
                        type: investment.type,
                        quantity: investment.quantity,
                        purchasePrice: investment.purchasePrice,
                    },
                    stocksExpenseTotal,
                    stocksPositionCount
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

        const userCurrency = user.currency || "USD";
        const deduct = investmentShouldDeduct(investment.deductFromAccount);
        const linkedAccountId = investment.accountId ?? null;
        const purchaseCost =
            Number(investment.quantity) * Number(investment.purchasePrice);

        if (investment.type === "STOCKS") {
            const existingStocks = await prisma.investment.count({
                where: { userId: user.id, type: "STOCKS" },
            });
            if (existingStocks > 0) {
                throw new Error(
                    "You already have a Stocks investment. Only one Stocks position is allowed—edit or remove it before adding another."
                );
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            if (deduct && linkedAccountId && purchaseCost > 0) {
                const account = await tx.account.findUnique({
                    where: { id: linkedAccountId },
                    select: {
                        balance: true,
                        bankName: true,
                        holderName: true,
                        userId: true,
                    },
                });
                if (!account || account.userId !== userId) {
                    throw new Error("Selected account not found");
                }
                const bal = decimalToNumber(account.balance, "account balance");
                if (bal < purchaseCost) {
                    throw new Error(
                        `Insufficient balance in ${account.bankName}. Available: ${bal}, required for purchase: ${purchaseCost}`
                    );
                }
                await tx.account.update({
                    where: { id: linkedAccountId },
                    data: { balance: { decrement: purchaseCost } },
                });
            }

            const created = await tx.investment.create({
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

            if (deduct && linkedAccountId && purchaseCost > 0) {
                const acc = await tx.account.findUnique({
                    where: { id: linkedAccountId },
                    select: { bankName: true, holderName: true },
                });
                if (acc) {
                    await logAccountBalanceFromTransaction(tx, {
                        userId,
                        action: ActivityAction.CREATE,
                        entityType: ActivityEntityType.INVESTMENT,
                        entityId: created.id,
                        category: ActivityCategory.TRANSACTION,
                        accountId: linkedAccountId,
                        accountBankName: acc.bankName,
                        holderName: acc.holderName,
                        balanceDeltaUserCurrency: -purchaseCost,
                        userCurrency,
                        transactionTitle: investment.name,
                        transactionAmountOriginal: purchaseCost,
                        transactionCurrency: userCurrency,
                        reason: "investment_create",
                    });
                }
            }

            return created;
        });

        // Revalidate related pages
        revalidatePath("/(dashboard)/investments");
        revalidatePath("/(dashboard)/accounts");
        
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

        const userRow = await prisma.user.findUnique({
            where: { id: userId },
            select: { currency: true },
        });
        const userCurrency = userRow?.currency || "USD";

        const result = await prisma.$transaction(async (tx) => {
            const existing = await tx.investment.findFirst({
                where: { id, userId },
            });

            if (!existing) {
                throw new Error("Investment not found or unauthorized");
            }

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

            const oldCost = investmentPurchaseCost(
                existing.quantity,
                existing.purchasePrice
            );
            const oldAccountId = existing.accountId;
            const oldDeduct = investmentShouldDeduct(existing.deductFromAccount);

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
                    : oldDeduct;

            if (
                oldAccountId != null &&
                newAccountId != null &&
                oldAccountId === newAccountId &&
                oldDeduct &&
                newDeduct
            ) {
                const deltaCost = newCost - oldCost;
                if (deltaCost !== 0) {
                    const account = await tx.account.findUnique({
                        where: { id: oldAccountId },
                        select: {
                            balance: true,
                            bankName: true,
                            holderName: true,
                            userId: true,
                        },
                    });
                    if (!account || account.userId !== userId) {
                        throw new Error("Account not found");
                    }
                    const bal = decimalToNumber(account.balance, "account balance");
                    if (deltaCost > 0 && bal < deltaCost) {
                        throw new Error(
                            `Insufficient balance in ${account.bankName}. Available: ${bal}, additional required: ${deltaCost}`
                        );
                    }
                    await tx.account.update({
                        where: { id: oldAccountId },
                        data: { balance: { decrement: deltaCost } },
                    });
                    const acc = await tx.account.findUnique({
                        where: { id: oldAccountId },
                        select: { bankName: true, holderName: true },
                    });
                    if (acc) {
                        await logAccountBalanceFromTransaction(tx, {
                            userId,
                            action: ActivityAction.UPDATE,
                            entityType: ActivityEntityType.INVESTMENT,
                            entityId: id,
                            category: ActivityCategory.TRANSACTION,
                            accountId: oldAccountId,
                            accountBankName: acc.bankName,
                            holderName: acc.holderName,
                            balanceDeltaUserCurrency: -deltaCost,
                            userCurrency,
                            transactionTitle:
                                investment.name ?? existing.name,
                            transactionAmountOriginal: newCost,
                            transactionCurrency: userCurrency,
                            reason: "investment_update_cost",
                        });
                    }
                }
            } else {
                if (oldDeduct && oldAccountId != null && oldCost > 0) {
                    await tx.account.update({
                        where: { id: oldAccountId },
                        data: { balance: { increment: oldCost } },
                    });
                    const accOld = await tx.account.findUnique({
                        where: { id: oldAccountId },
                        select: { bankName: true, holderName: true },
                    });
                    if (accOld) {
                        await logAccountBalanceFromTransaction(tx, {
                            userId,
                            action: ActivityAction.UPDATE,
                            entityType: ActivityEntityType.INVESTMENT,
                            entityId: id,
                            category: ActivityCategory.TRANSACTION,
                            accountId: oldAccountId,
                            accountBankName: accOld.bankName,
                            holderName: accOld.holderName,
                            balanceDeltaUserCurrency: oldCost,
                            userCurrency,
                            transactionTitle: existing.name,
                            transactionAmountOriginal: oldCost,
                            transactionCurrency: userCurrency,
                            reason: "investment_update_release_prior",
                        });
                    }
                }

                if (newDeduct && newAccountId != null && newCost > 0) {
                    const account = await tx.account.findUnique({
                        where: { id: newAccountId },
                        select: {
                            balance: true,
                            bankName: true,
                            holderName: true,
                            userId: true,
                        },
                    });
                    if (!account || account.userId !== userId) {
                        throw new Error("Selected account not found");
                    }
                    const bal = decimalToNumber(account.balance, "account balance");
                    if (bal < newCost) {
                        throw new Error(
                            `Insufficient balance in ${account.bankName}. Available: ${bal}, required: ${newCost}`
                        );
                    }
                    await tx.account.update({
                        where: { id: newAccountId },
                        data: { balance: { decrement: newCost } },
                    });
                    const accNew = await tx.account.findUnique({
                        where: { id: newAccountId },
                        select: { bankName: true, holderName: true },
                    });
                    if (accNew) {
                        await logAccountBalanceFromTransaction(tx, {
                            userId,
                            action: ActivityAction.UPDATE,
                            entityType: ActivityEntityType.INVESTMENT,
                            entityId: id,
                            category: ActivityCategory.TRANSACTION,
                            accountId: newAccountId,
                            accountBankName: accNew.bankName,
                            holderName: accNew.holderName,
                            balanceDeltaUserCurrency: -newCost,
                            userCurrency,
                            transactionTitle:
                                investment.name ?? existing.name,
                            transactionAmountOriginal: newCost,
                            transactionCurrency: userCurrency,
                            reason: "investment_update_apply_new",
                        });
                    }
                }
            }

            return tx.investment.update({
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
        });

        // Revalidate related pages
        revalidatePath("/(dashboard)/investments");
        revalidatePath("/(dashboard)/accounts");

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

/**
 * Sets the same purchase price per unit on every Gold-type investment for the current user.
 * Delegates to {@link updateInvestment} per row so linked-account balance adjustments stay consistent
 * with editing a single position.
 */
export async function bulkUpdateGoldPurchasePrices(purchasePrice: number): Promise<{ updated: number }> {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);
    if (isNaN(userId)) {
        throw new Error("Invalid user ID");
    }

    if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
        throw new Error("Purchase rate must be greater than zero");
    }

    const goldRows = await prisma.investment.findMany({
        where: { userId, type: "GOLD" },
        select: { id: true },
        orderBy: { id: "asc" },
    });

    if (goldRows.length === 0) {
        return { updated: 0 };
    }

    for (const row of goldRows) {
        await updateInvestment(row.id, { purchasePrice });
    }

    return { updated: goldRows.length };
}

export async function deleteInvestment(id: number) {
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

        await prisma.$transaction(async (tx) => {
            const existingInvestment = await tx.investment.findFirst({
                where: { id, userId },
            });

            if (!existingInvestment) {
                throw new Error("Investment not found or unauthorized");
            }

            const deduct = investmentShouldDeduct(
                existingInvestment.deductFromAccount
            );
            const cost = investmentPurchaseCost(
                existingInvestment.quantity,
                existingInvestment.purchasePrice
            );
            const accountId = existingInvestment.accountId;

            if (deduct && accountId != null && cost > 0) {
                await tx.account.update({
                    where: { id: accountId },
                    data: { balance: { increment: cost } },
                });
                const acc = await tx.account.findUnique({
                    where: { id: accountId },
                    select: { bankName: true, holderName: true },
                });
                if (acc) {
                    await logAccountBalanceFromTransaction(tx, {
                        userId,
                        action: ActivityAction.DELETE,
                        entityType: ActivityEntityType.INVESTMENT,
                        entityId: id,
                        category: ActivityCategory.TRANSACTION,
                        accountId,
                        accountBankName: acc.bankName,
                        holderName: acc.holderName,
                        balanceDeltaUserCurrency: cost,
                        userCurrency,
                        transactionTitle: existingInvestment.name,
                        transactionAmountOriginal: cost,
                        transactionCurrency: userCurrency,
                        reason: "investment_delete",
                    });
                }
            }

            await tx.investment.delete({
                where: { id },
            });
        });

        // Revalidate related pages
        revalidatePath("/(dashboard)/investments");
        revalidatePath("/(dashboard)/accounts");

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
                                deductFromCsv ?? true
                            );
                            const purchaseCost =
                                investmentData.quantity * investmentData.purchasePrice;

                            if (
                                deduct &&
                                investmentData.accountId &&
                                purchaseCost > 0
                            ) {
                                const accCheck = account!;
                                const bal = decimalToNumber(
                                    accCheck.balance,
                                    "account balance"
                                );
                                if (bal < purchaseCost) {
                                    result.errors.push({
                                        row: 0,
                                        error: `Insufficient balance for ${investmentData.name} (need ${purchaseCost})`,
                                        data: investmentData,
                                    });
                                    continue;
                                }
                                await tx.account.update({
                                    where: { id: investmentData.accountId },
                                    data: {
                                        balance: { decrement: purchaseCost },
                                    },
                                });
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

                            const created = await tx.investment.create({
                                data: {
                                    ...investmentData,
                                    userId: userId,
                                    deductFromAccount: deductFromCsv ?? true,
                                },
                            });

                            if (
                                deduct &&
                                investmentData.accountId &&
                                purchaseCost > 0 &&
                                account
                            ) {
                                await logAccountBalanceFromTransaction(tx, {
                                    userId,
                                    action: ActivityAction.CREATE,
                                    entityType: ActivityEntityType.INVESTMENT,
                                    entityId: created.id,
                                    category: ActivityCategory.TRANSACTION,
                                    accountId: investmentData.accountId,
                                    accountBankName: account.bankName,
                                    holderName: account.holderName,
                                    balanceDeltaUserCurrency: -purchaseCost,
                                    userCurrency,
                                    transactionTitle: investmentData.name,
                                    transactionAmountOriginal: purchaseCost,
                                    transactionCurrency: userCurrency,
                                    reason: "investment_import_csv",
                                });
                            }

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
export async function bulkDeleteInvestments(investmentIds: number[]) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Verify all investments belong to the user
        const existingInvestments = await prisma.investment.findMany({
            where: {
                id: { in: investmentIds },
                userId: userId,
            },
        });

        if (existingInvestments.length !== investmentIds.length) {
            throw new Error("Some investments not found or unauthorized");
        }

        const userRow = await prisma.user.findUnique({
            where: { id: userId },
            select: { currency: true },
        });
        const userCurrency = userRow?.currency || "USD";

        await prisma.$transaction(async (tx) => {
            await tx.investment.deleteMany({
                where: {
                    id: { in: investmentIds },
                    userId: userId,
                },
            });

            const accountUpdates = new Map<number, number>();
            const accountInvestmentIds = new Map<number, number[]>();

            existingInvestments.forEach((inv) => {
                if (
                    investmentShouldDeduct(inv.deductFromAccount) &&
                    inv.accountId != null
                ) {
                    const c = investmentPurchaseCost(
                        inv.quantity,
                        inv.purchasePrice
                    );
                    if (c <= 0) return;
                    const cur = accountUpdates.get(inv.accountId) || 0;
                    accountUpdates.set(inv.accountId, cur + c);
                    const ids = accountInvestmentIds.get(inv.accountId) || [];
                    ids.push(inv.id);
                    accountInvestmentIds.set(inv.accountId, ids);
                }
            });

            for (const [accountId, totalAmount] of accountUpdates) {
                await tx.account.update({
                    where: { id: accountId },
                    data: { balance: { increment: totalAmount } },
                });
                const acc = await tx.account.findUnique({
                    where: { id: accountId },
                    select: { bankName: true, holderName: true },
                });
                const invIds = accountInvestmentIds.get(accountId) || [];
                if (acc) {
                    await logAccountBalanceFromTransaction(tx, {
                        userId,
                        action: ActivityAction.BULK_DELETE,
                        entityType: ActivityEntityType.INVESTMENT,
                        entityId: null,
                        category: ActivityCategory.BULK_OPERATION,
                        accountId,
                        accountBankName: acc.bankName,
                        holderName: acc.holderName,
                        balanceDeltaUserCurrency: totalAmount,
                        userCurrency,
                        transactionTitle: `${invIds.length} investment(s) deleted`,
                        transactionAmountOriginal: totalAmount,
                        transactionCurrency: userCurrency,
                        reason: "bulk_delete_investment",
                        extraMetadata: { investmentIds: invIds },
                    });
                }
            }
        });

        // Revalidate related pages
        revalidatePath("/(dashboard)/investments");
        revalidatePath("/(dashboard)/accounts");
        
        console.info(`Bulk investment deletion successful: ${investmentIds.length} investments for user ${userId}`);
        return { 
            success: true, 
            deletedCount: existingInvestments.length 
        };
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
    const investmentImportResult = await bulkImportInvestments(investmentText);

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
    try {
        const lines = csvText.split('\n');
        return lines.map(line => {
            const cells: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    cells.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            
            cells.push(current.trim());
            return cells;
        }).filter(row => row.some(cell => cell.length > 0));
    } catch (error) {
        console.error("Error parsing CSV for UI:", error);
        return [];
    }
}

/**
 * Import a corrected investment row (compatible with unified modal)
 */
export async function importCorrectedRow(rowData: string[], headers: string[]): Promise<any> {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

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
    const deduct = investmentShouldDeduct(deductFromCsv ?? true);
    const purchaseCost =
        investmentData.quantity * investmentData.purchasePrice;

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
        if (
            deduct &&
            investmentData.accountId &&
            purchaseCost > 0
        ) {
            const account = await tx.account.findUnique({
                where: { id: investmentData.accountId },
                select: {
                    balance: true,
                    bankName: true,
                    holderName: true,
                    userId: true,
                },
            });
            if (!account || account.userId !== userId) {
                throw new Error("Selected account not found");
            }
            const bal = decimalToNumber(account.balance, "account balance");
            if (bal < purchaseCost) {
                throw new Error(
                    `Insufficient balance. Available: ${bal}, required: ${purchaseCost}`
                );
            }
            await tx.account.update({
                where: { id: investmentData.accountId },
                data: { balance: { decrement: purchaseCost } },
            });
        }

        const created = await tx.investment.create({
            data: {
                ...(investmentData as any),
                userId: userId,
                deductFromAccount: deductFromCsv ?? true,
            } as any,
            include: {
                account: true,
            },
        });

        if (
            deduct &&
            investmentData.accountId &&
            purchaseCost > 0
        ) {
            const acc = await tx.account.findUnique({
                where: { id: investmentData.accountId },
                select: { bankName: true, holderName: true },
            });
            if (acc) {
                await logAccountBalanceFromTransaction(tx, {
                    userId,
                    action: ActivityAction.CREATE,
                    entityType: ActivityEntityType.INVESTMENT,
                    entityId: created.id,
                    category: ActivityCategory.TRANSACTION,
                    accountId: investmentData.accountId,
                    accountBankName: acc.bankName,
                    holderName: acc.holderName,
                    balanceDeltaUserCurrency: -purchaseCost,
                    userCurrency,
                    transactionTitle: investmentData.name,
                    transactionAmountOriginal: purchaseCost,
                    transactionCurrency: userCurrency,
                    reason: "investment_import_corrected_row",
                });
            }
        }

        return created;
    });
    
    revalidatePath("/(dashboard)/investments");
    revalidatePath("/(dashboard)/accounts");
    return newInvestment;
} 