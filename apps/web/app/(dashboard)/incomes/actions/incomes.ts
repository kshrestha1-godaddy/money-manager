"use server";

import { revalidatePath } from "next/cache";
import { Income } from "../../../types/financial";
import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getUserIdFromSession } from "../../../utils/auth";
import { parseCSV, parseTags, mergeLocationAndLinksFromRow, parseOptionalMapCoordinates } from "../../../utils/csvUtils";
import { parseCategoriesCSV, type ParsedCategoryData } from "../../../utils/csvImportCategories";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { autoBookmarkHighValueTransaction, handleBookmarkOnAmountChange } from "../../../utils/autoBookmarkUtils";
import { logAccountBalanceFromTransaction } from "../../../utils/accountActivityLog";
import {
    ActivityAction,
    ActivityCategory,
    ActivityEntityType,
} from "@prisma/client";

// Helper function to serialize transaction location data
function serializeTransactionLocation(location: any) {
    if (!location) return null;
    return {
        ...location,
        latitude: location.latitude ? Number(location.latitude) : null,
        longitude: location.longitude ? Number(location.longitude) : null,
    };
}

// Helper function to revalidate all income-related paths
const revalidateIncomePaths = () => {
    revalidatePath("/(dashboard)/incomes");
    revalidatePath("/(dashboard)/accounts");
};

// Helper function to transform Prisma income to Income type
const getDisplayIncome = (prismaIncome: any): Income => {
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
        account: prismaIncome.account ? {
            ...prismaIncome.account,
            balance: parseFloat(prismaIncome.account.balance.toString()),
            accountOpeningDate: new Date(prismaIncome.account.accountOpeningDate),
            createdAt: new Date(prismaIncome.account.createdAt),
            updatedAt: new Date(prismaIncome.account.updatedAt)
        } : null
    };
};


export async function getIncomes() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized for user " + session?.user?.id);

        const userId = getUserIdFromSession(session.user.id);

        const incomes = await prisma.income.findMany({
            where: { userId },
            include: {
                category: true,
                account: true,
                user: true,
                transactionLocation: true
            },
            orderBy: { date: 'desc' }
        });

        // Serialize transaction locations to avoid Decimal serialization issues
        incomes.forEach(income => {
            if (income.transactionLocation) {
                income.transactionLocation = serializeTransactionLocation(income.transactionLocation);
            }
        });

        // Get all bookmarks for this user's incomes
        const bookmarkedIncomes = await prisma.transactionBookmark.findMany({
            where: {
                userId: userId,
                transactionType: 'INCOME'
            }
        });

        const bookmarkedIncomeIds = new Set(bookmarkedIncomes.map(b => b.transactionId));

        return incomes.map(income => ({
            ...getDisplayIncome(income),
            isBookmarked: bookmarkedIncomeIds.has(income.id)
        }));

    } catch (error) {
        console.error("Failed to fetch incomes:", error);
        throw new Error("Failed to fetch incomes for user ");
    }
}

export async function createIncome(data: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        const userId = getUserIdFromSession(session.user.id);

        // Get user's preferred currency
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { currency: true }
        });

        const result = await prisma.$transaction(async (tx) => {

            const createData: any = {
                title: data.title,
                description: data.description,
                amount: data.amount,
                currency: data.currency || user?.currency || 'USD',
                date: data.date,
                category: { connect: { id: data.categoryId } },
                user: { connect: { id: userId } },
                tags: data.tags,
                location: data.location,
                receipt: data.receipt,
                notes: data.notes,
                isRecurring: data.isRecurring,
                recurringFrequency: data.recurringFrequency
            };

            // Handle transaction location
            if ((data as any).transactionLocationId && (data as any).transactionLocationId !== -1) {
                createData.transactionLocation = {
                    connect: { id: (data as any).transactionLocationId }
                };
            } else if ((data as any).transactionLocation && (data as any).transactionLocation.id === -1) {
                // Create new transaction location
                const newLocationData = (data as any).transactionLocation;
                const newLocation = await tx.transactionLocation.create({
                    data: {
                        latitude: newLocationData.latitude,
                        longitude: newLocationData.longitude,
                        userId: userId
                    }
                });
                createData.transactionLocation = {
                    connect: { id: newLocation.id }
                };
            }

            if (data.accountId) {
                createData.account = { connect: { id: data.accountId } };
            }

            const income = await tx.income.create({
                data: createData,
                include: {
                    category: true,
                    account: true,
                    user: true,
                    transactionLocation: true
                }
            });

            // Create TransactionImage record if receipt URL is provided
            if (data.receipt) {
                try {
                    await tx.transactionImage.create({
                        data: {
                            imageUrl: data.receipt,
                            fileName: `income-receipt-${income.id}`,
                            transactionType: 'INCOME',
                            transactionId: income.id,
                            description: `Document for ${data.title}`,
                            userId: userId
                        }
                    });
                } catch (imageError) {
                    console.error('Failed to create transaction image record:', imageError);
                    // Don't fail the entire transaction if image record creation fails
                }
            }

            // adding the amount to the account balance (convert to user's currency)
            if (data.accountId) {
                const userCurrency = user?.currency || 'USD';
                const transactionCurrency = data.currency || userCurrency;
                const convertedAmount = convertForDisplaySync(data.amount, transactionCurrency, userCurrency);
                
                await tx.account.update({
                    where: { id: data.accountId },
                    data: { balance: { increment: convertedAmount } }
                });

                if (income.account) {
                    await logAccountBalanceFromTransaction(tx, {
                        userId,
                        action: ActivityAction.CREATE,
                        entityType: ActivityEntityType.INCOME,
                        entityId: income.id,
                        category: ActivityCategory.TRANSACTION,
                        accountId: data.accountId,
                        accountBankName: income.account.bankName,
                        holderName: income.account.holderName,
                        balanceDeltaUserCurrency: convertedAmount,
                        userCurrency,
                        transactionTitle: data.title,
                        transactionAmountOriginal: data.amount,
                        transactionCurrency,
                        reason: "income_create",
                    });
                }
            }

            return income;
        });

        revalidateIncomePaths();
        console.info(`Income created successfully: ${data.title} - $${data.amount} for user ${userId}`);

        // Auto-bookmark high-value income
        let isBookmarked = false;
        try {
            await autoBookmarkHighValueTransaction(
                result.id,
                'INCOME',
                data.title,
                data.amount
            );
            // Check if it was actually bookmarked
            const { isTransactionBookmarked } = await import('../../transactions/actions/transaction-bookmarks');
            isBookmarked = await isTransactionBookmarked('INCOME', result.id);
        } catch (error) {
            console.error("Failed to auto-bookmark high-value income:", error);
            // Don't fail the entire operation if bookmarking fails
        }

        // Trigger notification checks
        try {
            const { generateNotificationsForUser } = await import('../../../actions/notifications');
            await generateNotificationsForUser(userId);
        } catch (error) {
            console.error("Failed to check notifications after income creation:", error);
        }

        return {
            ...getDisplayIncome(result),
            isBookmarked
        };


    } catch (error) {
        console.error(`Failed to create income: ${data.title}`, error);
        throw new Error("Failed to create income");
    }
}

export async function updateIncome(id: number, data: Partial<Omit<Income, 'id' | 'createdAt' | 'updatedAt'>>) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        const userId = getUserIdFromSession(session.user.id);

        const existingIncome = await prisma.income.findFirst({
            where: { id, userId }
        });

        if (!existingIncome) {
            console.error(`Income update failed - not found or unauthorized: ${id} for user ${userId}`);
            throw new Error("Income not found or unauthorized");
        }

        // Get user's preferred currency
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { currency: true }
        });

        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.amount !== undefined) updateData.amount = data.amount;
        if (data.currency !== undefined) updateData.currency = data.currency;
        if (data.date !== undefined) updateData.date = data.date;
        if (data.categoryId !== undefined) updateData.category = { connect: { id: data.categoryId } };
        if (data.accountId !== undefined) {
            updateData.account = data.accountId === null ? { disconnect: true } : { connect: { id: data.accountId } };
        }
        if (data.tags !== undefined) updateData.tags = data.tags;
        if (data.location !== undefined) updateData.location = data.location;
        if (data.receipt !== undefined) updateData.receipt = data.receipt;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
        if (data.recurringFrequency !== undefined) updateData.recurringFrequency = data.recurringFrequency;

        const result = await prisma.$transaction(async (tx) => {
            // Handle transaction location update if provided
            if ((data as any).transactionLocationId !== undefined) {
                const locationId = (data as any).transactionLocationId;
                updateData.transactionLocation = locationId
                    ? { connect: { id: locationId } }
                    : { disconnect: true };
            } else if ((data as any).transactionLocation?.id === -1) {
                const newLocationData = (data as any).transactionLocation;
                const newLocation = await tx.transactionLocation.create({
                    data: {
                        latitude: newLocationData.latitude,
                        longitude: newLocationData.longitude,
                        userId: userId
                    }
                });
                updateData.transactionLocation = { connect: { id: newLocation.id } };
            } else if ((data as any).transactionLocation === null) {
                updateData.transactionLocation = { disconnect: true };
            }

            const income = await tx.income.update({
                where: { id },
                data: updateData,
                include: {
                    category: true,
                    account: true,
                    user: true,
                    transactionLocation: true
                }
            });

            if (income.transactionLocation) {
                income.transactionLocation = serializeTransactionLocation(income.transactionLocation);
            }

            // Handle TransactionImage updates if receipt changed
            if (data.receipt !== undefined) {
                // First, deactivate any existing images for this income
                await tx.transactionImage.updateMany({
                    where: {
                        transactionType: 'INCOME',
                        transactionId: id,
                        userId: userId,
                        isActive: true
                    },
                    data: {
                        isActive: false
                    }
                });

                // Create new image record if new receipt URL is provided
                if (data.receipt) {
                    try {
                        await tx.transactionImage.create({
                            data: {
                                imageUrl: data.receipt,
                                fileName: `income-receipt-${income.id}`,
                                transactionType: 'INCOME',
                                transactionId: income.id,
                                description: `Document for ${data.title || income.title}`,
                                userId: userId
                            }
                        });
                    } catch (imageError) {
                        console.error('Failed to create transaction image record during update:', imageError);
                        // Don't fail the entire transaction if image record creation fails
                    }
                }
            }

            const userCurrency = user?.currency || 'USD';
            const oldAmount = parseFloat(existingIncome.amount.toString());
            const oldCurrency = existingIncome.currency;
            const newAmount = data.amount !== undefined ? data.amount : oldAmount;
            const newCurrency = data.currency !== undefined ? data.currency : oldCurrency;
            const oldAccountId = existingIncome.accountId;
            const newAccountId = data.accountId !== undefined ? data.accountId : oldAccountId;

            // Convert amounts to user's currency for account balance updates
            const oldAmountConverted = convertForDisplaySync(oldAmount, oldCurrency, userCurrency);
            const newAmountConverted = convertForDisplaySync(newAmount, newCurrency, userCurrency);

            // Same linked account: adjust balance when amount or currency changes (edit modal may send both).
            const incomeValueChangedForBalance =
                data.amount !== undefined || data.currency !== undefined;

            if (
                incomeValueChangedForBalance &&
                oldAccountId === newAccountId &&
                oldAccountId
            ) {
                const amountDifference = newAmountConverted - oldAmountConverted;
                if (amountDifference !== 0) {
                    const nominalAmountChanged =
                        data.amount !== undefined &&
                        parseFloat(String(data.amount)) !== oldAmount;
                    const currencyCodeChanged =
                        data.currency !== undefined &&
                        data.currency !== oldCurrency;
                    const updateReason =
                        nominalAmountChanged && currencyCodeChanged
                            ? "income_update_amount_currency"
                            : currencyCodeChanged
                              ? "income_update_currency"
                              : nominalAmountChanged
                                ? "income_update_amount"
                                : "income_update_display_adjustment";

                    await tx.account.update({
                        where: { id: oldAccountId },
                        data: { balance: { increment: amountDifference } }
                    });
                    const acc = await tx.account.findUnique({
                        where: { id: oldAccountId },
                        select: { bankName: true, holderName: true },
                    });
                    if (acc) {
                        await logAccountBalanceFromTransaction(tx, {
                            userId,
                            action: ActivityAction.UPDATE,
                            entityType: ActivityEntityType.INCOME,
                            entityId: id,
                            category: ActivityCategory.TRANSACTION,
                            accountId: oldAccountId,
                            accountBankName: acc.bankName,
                            holderName: acc.holderName,
                            balanceDeltaUserCurrency: amountDifference,
                            userCurrency,
                            transactionTitle: income.title,
                            transactionAmountOriginal: newAmount,
                            transactionCurrency: newCurrency,
                            reason: updateReason,
                        });
                    }
                }
            } else if (data.accountId !== undefined && oldAccountId !== newAccountId) {
                if (oldAccountId) {
                    await tx.account.update({
                        where: { id: oldAccountId },
                        data: { balance: { decrement: oldAmountConverted } }
                    });
                    const accOld = await tx.account.findUnique({
                        where: { id: oldAccountId },
                        select: { bankName: true, holderName: true },
                    });
                    if (accOld) {
                        await logAccountBalanceFromTransaction(tx, {
                            userId,
                            action: ActivityAction.UPDATE,
                            entityType: ActivityEntityType.INCOME,
                            entityId: id,
                            category: ActivityCategory.TRANSACTION,
                            accountId: oldAccountId,
                            accountBankName: accOld.bankName,
                            holderName: accOld.holderName,
                            balanceDeltaUserCurrency: -oldAmountConverted,
                            userCurrency,
                            transactionTitle: income.title,
                            transactionAmountOriginal: oldAmount,
                            transactionCurrency: oldCurrency,
                            reason: "income_update_account_from",
                        });
                    }
                }
                if (newAccountId) {
                    await tx.account.update({
                        where: { id: newAccountId },
                        data: { balance: { increment: newAmountConverted } }
                    });
                    const accNew = await tx.account.findUnique({
                        where: { id: newAccountId },
                        select: { bankName: true, holderName: true },
                    });
                    if (accNew) {
                        await logAccountBalanceFromTransaction(tx, {
                            userId,
                            action: ActivityAction.UPDATE,
                            entityType: ActivityEntityType.INCOME,
                            entityId: id,
                            category: ActivityCategory.TRANSACTION,
                            accountId: newAccountId,
                            accountBankName: accNew.bankName,
                            holderName: accNew.holderName,
                            balanceDeltaUserCurrency: newAmountConverted,
                            userCurrency,
                            transactionTitle: income.title,
                            transactionAmountOriginal: newAmount,
                            transactionCurrency: newCurrency,
                            reason: "income_update_account_to",
                        });
                    }
                }
            }

            return income;
        });

        // Handle bookmark updates if amount changed
        if (data.amount !== undefined) {
            try {
                const oldAmount = parseFloat(existingIncome.amount.toString());
                const newAmount = data.amount;
                const title = data.title !== undefined ? data.title : existingIncome.title;
                
                await handleBookmarkOnAmountChange(
                    id,
                    'INCOME',
                    title,
                    oldAmount,
                    newAmount
                );
            } catch (error) {
                console.error("Failed to handle bookmark update for income:", error);
                // Don't fail the entire operation if bookmarking fails
            }
        }

        revalidateIncomePaths();
        console.info(`Income updated successfully: ${id} for user ${userId}`);
        return getDisplayIncome(result);
    } catch (error) {
        console.error(`Failed to update income ${id}:`, error);
        throw new Error("Failed to update income");
    }
}

export async function deleteIncome(id: number) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        const userId = getUserIdFromSession(session.user.id);

        const existingIncome = await prisma.income.findFirst({
            where: { id, userId }
        });

        if (!existingIncome) {
            console.error(`Income deletion failed - not found or unauthorized: ${id} for user ${userId}`);
            throw new Error("Income not found or unauthorized");
        }

        // Get user's preferred currency
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { currency: true }
        });

        await prisma.$transaction(async (tx) => {
            // Delete any associated transaction images from database
            await tx.transactionImage.deleteMany({
                where: {
                    transactionType: 'INCOME',
                    transactionId: id,
                    userId: userId
                }
            });

            await tx.income.delete({ where: { id } });

            if (existingIncome.accountId) {
                const userCurrency = user?.currency || 'USD';
                const incomeAmount = parseFloat(existingIncome.amount.toString());
                const convertedAmount = convertForDisplaySync(incomeAmount, existingIncome.currency, userCurrency);
                
                await tx.account.update({
                    where: { id: existingIncome.accountId },
                    data: { balance: { decrement: convertedAmount } }
                });
                const acc = await tx.account.findUnique({
                    where: { id: existingIncome.accountId },
                    select: { bankName: true, holderName: true },
                });
                if (acc) {
                    await logAccountBalanceFromTransaction(tx, {
                        userId,
                        action: ActivityAction.DELETE,
                        entityType: ActivityEntityType.INCOME,
                        entityId: id,
                        category: ActivityCategory.TRANSACTION,
                        accountId: existingIncome.accountId,
                        accountBankName: acc.bankName,
                        holderName: acc.holderName,
                        balanceDeltaUserCurrency: -convertedAmount,
                        userCurrency,
                        transactionTitle: existingIncome.title,
                        transactionAmountOriginal: incomeAmount,
                        transactionCurrency: existingIncome.currency,
                        reason: "income_delete",
                    });
                }
            }
        });

        revalidateIncomePaths();
        console.info(`Income deleted successfully: ${id} for user ${userId}`);
        return { success: true };
    } catch (error) {
        console.error(`Failed to delete income ${id}:`, error);
        throw new Error("Failed to delete income");
    }
}

export async function getIncomesByCategory(categoryId: number) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        const userId = getUserIdFromSession(session.user.id);

        const incomes = await prisma.income.findMany({
            where: { categoryId, userId },
            include: {
                category: true,
                account: true,
                user: true,
                transactionLocation: true
            },
            orderBy: { date: 'desc' }
        });

        // Serialize transaction locations to avoid Decimal serialization issues
        incomes.forEach(income => {
            if (income.transactionLocation) {
                income.transactionLocation = serializeTransactionLocation(income.transactionLocation);
            }
        });

        return incomes.map(getDisplayIncome);
    } catch (error) {
        console.error(`Failed to fetch incomes by category ${categoryId}:`, error);
        throw new Error("Failed to fetch incomes by category");
    }
}

export async function getIncomesByDateRange(startDate: Date, endDate: Date) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        const userId = getUserIdFromSession(session.user.id);

        const incomes = await prisma.income.findMany({
            where: {
                date: { gte: startDate, lte: endDate },
                userId
            },
            include: {
                category: true,
                account: true,
                user: true,
                transactionLocation: true
            },
            orderBy: { date: 'desc' }
        });

        // Serialize transaction locations to avoid Decimal serialization issues
        incomes.forEach(income => {
            if (income.transactionLocation) {
                income.transactionLocation = serializeTransactionLocation(income.transactionLocation);
            }
        });

        return incomes.map(getDisplayIncome);
    } catch (error) {
        console.error(`Failed to fetch incomes by date range:`, error);
        throw new Error("Failed to fetch incomes by date range");
    }
}

export async function bulkImportIncomes(file: File, defaultAccountId: string, transactionType?: string): Promise<any> {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const userId = getUserIdFromSession(session.user.id);
    const text = await file.text();
    const rows = await parseCSVForUI(text);

    if (rows.length <= 1) {
        throw new Error("CSV file must contain header row and at least one data row");
    }

    const headers = rows[0];
    if (!headers) throw new Error("CSV file must have a valid header row");
    
    const dataRows = rows.slice(1);
    let successCount = 0;
    const errors: { row: number; message: string }[] = [];

    const [user, categories, accounts] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { currency: true }
        }),
        prisma.category.findMany({ where: { type: "INCOME", userId } }),
        prisma.account.findMany({ where: { userId } })
    ]);



    if (categories.length === 0) {
        throw new Error("No income categories found for this user. Please create at least one income category before importing.");
    }

    for (let i = 0; i < dataRows.length; i++) {
        const rowData = dataRows[i];
        if (!rowData) continue;
        const rowNumber = i + 2;

        try {
            const income = await processIncomeRow(rowData, headers, categories, accounts, defaultAccountId, userId, user?.currency);
            if (income) successCount++;
        } catch (error) {
            errors.push({
                row: rowNumber,
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    revalidateIncomePaths();

    return {
        success: successCount,
        errors: errors.map(error => ({
            row: error.row,
            error: error.message
        }))
    };
}

export async function parseCSVForUI(csvText: string): Promise<string[][]> {
    try {
        if (!csvText || typeof csvText !== 'string') {
            return [];
        }
        
        // Use the improved parseCSV function that handles multi-line fields
        const result = parseCSV(csvText);
        return Array.isArray(result) ? result : [];
    } catch (error) {
        console.error('Error parsing CSV for UI:', error);
        return [];
    }
}

export async function importCorrectedRow(rowData: string[], headers: string[], transactionType?: string): Promise<any> {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const userId = getUserIdFromSession(session.user.id);

    const [user, categories, accounts] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { currency: true }
        }),
        prisma.category.findMany({ where: { type: "INCOME", userId } }),
        prisma.account.findMany({ where: { userId } })
    ]);

    const income = await processIncomeRow(rowData, headers, categories, accounts, '', userId, user?.currency);
    
    revalidateIncomePaths();
    return income;
}

export async function bulkDeleteIncomes(incomeIds: number[]) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const userId = getUserIdFromSession(session.user.id);

    const existingIncomes = await prisma.income.findMany({
        where: { id: { in: incomeIds }, userId },
        include: { account: true }
    });

    if (existingIncomes.length !== incomeIds.length) {
        throw new Error("Some incomes not found or unauthorized");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { currency: true },
    });
    const userCurrency = user?.currency || "USD";

    await prisma.$transaction(async (tx) => {
        // Delete any associated transaction images from database
        await tx.transactionImage.deleteMany({
            where: {
                transactionType: 'INCOME',
                transactionId: { in: incomeIds },
                userId: userId
            }
        });

        await tx.income.deleteMany({
            where: { id: { in: incomeIds }, userId }
        });

        const accountUpdates = new Map<number, number>();
        const accountIncomeIds = new Map<number, number[]>();

        existingIncomes.forEach((income) => {
            if (income.accountId) {
                const amt = parseFloat(income.amount.toString());
                const converted = convertForDisplaySync(amt, income.currency, userCurrency);
                const currentTotal = accountUpdates.get(income.accountId) || 0;
                accountUpdates.set(income.accountId, currentTotal + converted);
                const ids = accountIncomeIds.get(income.accountId) || [];
                ids.push(income.id);
                accountIncomeIds.set(income.accountId, ids);
            }
        });

        for (const [accountId, totalAmount] of accountUpdates) {
            await tx.account.update({
                where: { id: accountId },
                data: { balance: { decrement: totalAmount } }
            });
            const acc = await tx.account.findUnique({
                where: { id: accountId },
                select: { bankName: true, holderName: true },
            });
            const idsForAccount = accountIncomeIds.get(accountId) || [];
            if (acc) {
                await logAccountBalanceFromTransaction(tx, {
                    userId,
                    action: ActivityAction.BULK_DELETE,
                    entityType: ActivityEntityType.INCOME,
                    entityId: null,
                    category: ActivityCategory.BULK_OPERATION,
                    accountId,
                    accountBankName: acc.bankName,
                    holderName: acc.holderName,
                    balanceDeltaUserCurrency: -totalAmount,
                    userCurrency,
                    transactionTitle: `${idsForAccount.length} income record(s) deleted`,
                    transactionAmountOriginal: totalAmount,
                    transactionCurrency: userCurrency,
                    reason: "bulk_delete_income",
                    extraMetadata: { incomeIds: idsForAccount },
                });
            }
        }
    });

    revalidateIncomePaths();
    return { success: true, deletedCount: existingIncomes.length };
}

async function processIncomeRow(
    rowData: string[], 
    headers: string[], 
    categories: any[], 
    accounts: any[], 
    defaultAccountId: string, 
    userId: number,
    userCurrency?: string
): Promise<any> {
    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
        // Normalize header: lowercase and remove all whitespace
        const normalizedHeader = header.toLowerCase().replace(/\s+/g, '');
        rowObj[normalizedHeader] = rowData[index]?.trim() || '';
    });

    if (!rowObj.title) throw new Error("Title is required");
    if (!rowObj.amount || isNaN(parseFloat(rowObj.amount))) throw new Error("Valid amount is required");
    if (!rowObj.date) throw new Error("Date is required");
    if (!rowObj.category) throw new Error("Category is required");

    const date = new Date(rowObj.date);
    if (isNaN(date.getTime())) throw new Error("Invalid date format. Use YYYY-MM-DD");

    const categoryName = rowObj.category;
    

    
    const category = categories.find(c => 
        c.name.toLowerCase() === categoryName.toLowerCase()
    );
    if (!category) {
        const availableCategoryNames = categories.map(c => c.name).join(', ');
        throw new Error(`Category "${categoryName}" not found. Available categories: ${availableCategoryNames}`);
    }

    let accountId = defaultAccountId;
    const accountName = rowObj.account;
    if (accountName) {
        const account = accounts.find(a => {
            if (!accountName) return false;
            
            const exportedFormat = `${a.holderName} - ${a.bankName}`;
            if (exportedFormat.toLowerCase() === accountName.toLowerCase()) {
                return true;
            }
            
            const holderNameMatch = a.holderName && a.holderName.toLowerCase().includes(accountName.toLowerCase());
            const bankNameMatch = a.bankName && a.bankName.toLowerCase().includes(accountName.toLowerCase());
            const accountNumberMatch = a.accountNumber && a.accountNumber.toLowerCase() === accountName.toLowerCase();
            
            return holderNameMatch || bankNameMatch || accountNumberMatch;
        });
        
        if (account) {
            accountId = account.id.toString();
        }
    }

    const tagsString = rowObj.tags || '';
    const tags = parseTags(tagsString);

    // "Is Recurring" header becomes "isrecurring" after normalization
    const recurringString = rowObj.isrecurring || '';
    const isRecurring = recurringString.toLowerCase() === 'true' || recurringString.toLowerCase() === 'yes';

    // Parse bookmark status - "Is Bookmarked" header becomes "isbookmarked"
    const isBookmarked = rowObj.isbookmarked?.toLowerCase() === 'yes' || 
                         rowObj.isbookmarked?.toLowerCase() === 'true' || 
                         false;

    const locationEntries = mergeLocationAndLinksFromRow(rowObj.location || '', rowObj.links || '');
    const mapCoords = parseOptionalMapCoordinates(rowObj);

    const incomeData: any = {
        title: rowObj.title,
        description: rowObj.description || undefined,
        amount: parseFloat(rowObj.amount),
        currency: rowObj.currency || userCurrency || 'USD', // Default to user's currency if not specified in CSV
        date: date,
        categoryId: category.id,
        tags: tags,
        location: locationEntries,
        notes: rowObj.notes || undefined,
        isRecurring: isRecurring,
        // "Recurring Frequency" header becomes "recurringfrequency" after normalization
        recurringFrequency: isRecurring ? (rowObj.recurringfrequency?.toUpperCase() as any || 'MONTHLY') : undefined
    };

    if (mapCoords) {
        incomeData.transactionLocation = { id: -1, latitude: mapCoords.latitude, longitude: mapCoords.longitude };
    }

    if (accountId && accountId !== '') {
        const selectedAccount = accounts.find(a => a.id === parseInt(accountId));
        if (selectedAccount) {
            incomeData.accountId = parseInt(accountId);
        }
    }

    const createdIncome = await createIncome(incomeData as any);

    // Create bookmark if needed
    if (isBookmarked && createdIncome) {
        try {
            await prisma.transactionBookmark.upsert({
                where: {
                    transactionType_transactionId_userId: {
                        transactionType: 'INCOME',
                        transactionId: createdIncome.id,
                        userId: userId
                    }
                },
                update: {
                    title: createdIncome.title,
                    description: createdIncome.description,
                    notes: createdIncome.notes,
                    tags: createdIncome.tags,
                },
                create: {
                    transactionType: 'INCOME',
                    transactionId: createdIncome.id,
                    title: createdIncome.title,
                    description: createdIncome.description,
                    notes: createdIncome.notes,
                    tags: createdIncome.tags,
                    userId: userId
                }
            });
            console.log(`Bookmark created for income: ${createdIncome.title} (ID: ${createdIncome.id})`);
        } catch (bookmarkError) {
            console.error(`Failed to create bookmark for income ${createdIncome.id}:`, bookmarkError);
            // Don't fail the entire import if bookmark creation fails
        }
    }

    return createdIncome;
}

/**
 * Import categories from CSV data
 */
export async function importCategories(categoryData: ParsedCategoryData[]): Promise<{
    success: number;
    errors: Array<{ error: string; data: ParsedCategoryData }>;
}> {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const userId = getUserIdFromSession(session.user.id);
    let successCount = 0;
    const errors: Array<{ error: string; data: ParsedCategoryData }> = [];

    for (const category of categoryData) {
        try {
            // Check if category already exists
            const existingCategory = await prisma.category.findFirst({
                where: {
                    name: category.name,
                    type: category.type,
                    userId: userId
                }
            });

            if (existingCategory) {
                // Update existing category with new data
                await prisma.category.update({
                    where: { id: existingCategory.id },
                    data: {
                        color: category.color,
                        icon: category.icon
                    }
                });
                successCount++;
            } else {
                // Create new category
                await prisma.category.create({
                    data: {
                        name: category.name,
                        type: category.type,
                        color: category.color,
                        icon: category.icon,
                        userId: userId
                    }
                });
                successCount++;
            }
        } catch (error) {
            errors.push({
                error: error instanceof Error ? error.message : 'Unknown error',
                data: category
            });
        }
    }

    return {
        success: successCount,
        errors
    };
}

/**
 * Import categories from CSV file
 */
export async function bulkImportCategories(file: File): Promise<{
    success: number;
    errors: Array<{ row: number; error: string }>;
    importedCount: number;
}> {
    const text = await file.text();
    const parseResult = parseCategoriesCSV(text);

    if (!parseResult.success || !parseResult.categories) {
        return {
            success: 0,
            errors: parseResult.errors,
            importedCount: 0
        };
    }

    const importResult = await importCategories(parseResult.categories);

    // Transform import errors to include row numbers (estimate based on order)
    const transformedErrors = importResult.errors.map((error, index) => ({
        row: index + 2, // Estimate row number (header + data rows)
        error: error.error
    }));

    // Combine parse errors and import errors
    const allErrors = [...parseResult.errors, ...transformedErrors];

    return {
        success: importResult.success,
        errors: allErrors,
        importedCount: importResult.success
    };
}

/**
 * Combined import: Import categories first, then incomes
 */
export async function bulkImportIncomesWithCategories(
    incomeFile: File, 
    categoriesFile?: File, 
    defaultAccountId?: string
): Promise<{
    incomeImport: {
        success: number;
        errors: Array<{ row: number; message: string }>;
    };
    categoryImport?: {
        success: number;
        errors: Array<{ row: number; error: string }>;
        importedCount: number;
    };
}> {
    let categoryImportResult;

    // Import categories first if provided
    if (categoriesFile) {
        try {
            categoryImportResult = await bulkImportCategories(categoriesFile);
        } catch (error) {
            categoryImportResult = {
                success: 0,
                errors: [{ row: 0, error: error instanceof Error ? error.message : 'Failed to import categories' }],
                importedCount: 0
            };
        }
    }

    // Import incomes
    const incomeImportResult = await bulkImportIncomes(incomeFile, defaultAccountId || "");

    return {
        incomeImport: incomeImportResult,
        categoryImport: categoryImportResult
    };
} 