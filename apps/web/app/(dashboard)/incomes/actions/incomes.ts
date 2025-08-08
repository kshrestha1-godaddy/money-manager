"use server";

import { revalidatePath } from "next/cache";
import { Income } from "../../../types/financial";
import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getUserIdFromSession } from "../../../utils/auth";
import { parseCSV, parseTags } from "../../../utils/csvUtils";

// Helper function to revalidate all income-related paths
const revalidateIncomePaths = () => {
    revalidatePath("/(dashboard)/incomes");
    revalidatePath("/(dashboard)/accounts");
};

// Helper function to transform Prisma income to Income type
const getDisplayIncome = (prismaIncome: any): Income => ({
    ...prismaIncome,
    amount: parseFloat(prismaIncome.amount.toString()),
    date: new Date(prismaIncome.date),
    createdAt: new Date(prismaIncome.createdAt),
    updatedAt: new Date(prismaIncome.updatedAt),
    account: prismaIncome.account ? {
        ...prismaIncome.account,
        balance: parseFloat(prismaIncome.account.balance.toString()),
        accountOpeningDate: new Date(prismaIncome.account.accountOpeningDate),
        createdAt: new Date(prismaIncome.account.createdAt),
        updatedAt: new Date(prismaIncome.account.updatedAt)
    } : null
});


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
                user: true
            },
            orderBy: { date: 'desc' }
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

        const result = await prisma.$transaction(async (tx) => {

            const createData: any = {
                title: data.title,
                description: data.description,
                amount: data.amount,
                date: data.date,
                category: { connect: { id: data.categoryId } },
                user: { connect: { id: userId } },
                tags: data.tags,
                notes: data.notes,
                isRecurring: data.isRecurring,
                recurringFrequency: data.recurringFrequency
            };

            if (data.accountId) {
                createData.account = { connect: { id: data.accountId } };
            }

            const income = await tx.income.create({
                data: createData,
                include: {
                    category: true,
                    account: true,
                    user: true
                }
            });

            // adding the amount to the account balance
            if (data.accountId) {
                await tx.account.update({
                    where: { id: data.accountId },
                    data: { balance: { increment: data.amount } }
                });
            }

            return income;
        });

        revalidateIncomePaths();
        console.info(`Income created successfully: ${data.title} - $${data.amount} for user ${userId}`);

        // Trigger notification checks
        try {
            const { generateNotificationsForUser } = await import('../../../actions/notifications');
            await generateNotificationsForUser(userId);
        } catch (error) {
            console.error("Failed to check notifications after income creation:", error);
        }


        return getDisplayIncome(result);


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

        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.amount !== undefined) updateData.amount = data.amount;
        if (data.date !== undefined) updateData.date = data.date;
        if (data.categoryId !== undefined) updateData.category = { connect: { id: data.categoryId } };
        if (data.accountId !== undefined) {
            updateData.account = data.accountId === null ? { disconnect: true } : { connect: { id: data.accountId } };
        }
        if (data.tags !== undefined) updateData.tags = data.tags;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
        if (data.recurringFrequency !== undefined) updateData.recurringFrequency = data.recurringFrequency;

        const result = await prisma.$transaction(async (tx) => {
            const income = await tx.income.update({
                where: { id },
                data: updateData,
                include: {
                    category: true,
                    account: true,
                    user: true
                }
            });

            const oldAmount = parseFloat(existingIncome.amount.toString());
            const newAmount = data.amount !== undefined ? data.amount : oldAmount;
            const oldAccountId = existingIncome.accountId;
            const newAccountId = data.accountId !== undefined ? data.accountId : oldAccountId;

            if (data.amount !== undefined && oldAccountId === newAccountId && oldAccountId) {
                const amountDifference = newAmount - oldAmount;
                await tx.account.update({
                    where: { id: oldAccountId },
                    data: { balance: { increment: amountDifference } }
                });
            } else if (data.accountId !== undefined && oldAccountId !== newAccountId) {
                if (oldAccountId) {
                    await tx.account.update({
                        where: { id: oldAccountId },
                        data: { balance: { decrement: oldAmount } }
                    });
                }
                if (newAccountId) {
                    await tx.account.update({
                        where: { id: newAccountId },
                        data: { balance: { increment: newAmount } }
                    });
                }
            }

            return income;
        });

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

        await prisma.$transaction(async (tx) => {
            await tx.income.delete({ where: { id } });

            if (existingIncome.accountId) {
                await tx.account.update({
                    where: { id: existingIncome.accountId },
                    data: { balance: { decrement: parseFloat(existingIncome.amount.toString()) } }
                });
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
                user: true
            },
            orderBy: { date: 'desc' }
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
                user: true
            },
            orderBy: { date: 'desc' }
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

    const [categories, accounts] = await Promise.all([
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
            const income = await processIncomeRow(rowData, headers, categories, accounts, defaultAccountId, userId);
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

    const [categories, accounts] = await Promise.all([
        prisma.category.findMany({ where: { type: "INCOME", userId } }),
        prisma.account.findMany({ where: { userId } })
    ]);

    const income = await processIncomeRow(rowData, headers, categories, accounts, '', userId);
    
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

    await prisma.$transaction(async (tx) => {
        await tx.income.deleteMany({
            where: { id: { in: incomeIds }, userId }
        });

        const accountUpdates = new Map<number, number>();
        
        existingIncomes.forEach(income => {
            if (income.accountId) {
                const currentTotal = accountUpdates.get(income.accountId) || 0;
                accountUpdates.set(income.accountId, currentTotal + parseFloat(income.amount.toString()));
            }
        });

        for (const [accountId, totalAmount] of accountUpdates) {
            await tx.account.update({
                where: { id: accountId },
                data: { balance: { decrement: totalAmount } }
            });
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
    userId: number
): Promise<any> {
    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
        rowObj[header.toLowerCase().trim()] = rowData[index]?.trim() || '';
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

    const recurringString = rowObj.recurring || '';
    const isRecurring = recurringString.toLowerCase() === 'true' || recurringString.toLowerCase() === 'yes';

    const incomeData: any = {
        title: rowObj.title,
        description: rowObj.description || undefined,
        amount: parseFloat(rowObj.amount),
        date: date,
        categoryId: category.id,
        tags: tags,
        notes: rowObj.notes || undefined,
        isRecurring: isRecurring,
        recurringFrequency: isRecurring ? (rowObj.frequency?.toUpperCase() as any || 'MONTHLY') : undefined
    };

    if (accountId && accountId !== '') {
        const selectedAccount = accounts.find(a => a.id === parseInt(accountId));
        if (selectedAccount) {
            incomeData.accountId = parseInt(accountId);
        }
    }

    return await createIncome(incomeData as any);
} 