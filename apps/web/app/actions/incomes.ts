"use server";

import { revalidatePath } from "next/cache";
import { Income } from "../types/financial";
import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";

// Helper function to get user ID from session
function getUserIdFromSession(sessionUserId: string): number {
    // If it's a very large number (OAuth provider), take last 5 digits
    if (sessionUserId.length > 5) {
        return parseInt(sessionUserId.slice(-5));
    }
    // Otherwise parse normally
    return parseInt(sessionUserId);
}

export async function getIncomes() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        const incomes = await prisma.income.findMany({
            where: {
                userId: userId
            },
            include: {
                category: true,
                account: true,
                user: true
            },
            orderBy: {
                date: 'desc'
            }
        });

        // Transform Prisma result to match our Income type
        return incomes.map(income => ({
            ...income,
            amount: parseFloat(income.amount.toString()),
            date: new Date(income.date),
            createdAt: new Date(income.createdAt),
            updatedAt: new Date(income.updatedAt),
            // Convert account balance from Decimal to number
            account: income.account ? {
                ...income.account,
                balance: parseFloat(income.account.balance.toString()),
                accountOpeningDate: new Date(income.account.accountOpeningDate),
                createdAt: new Date(income.account.createdAt),
                updatedAt: new Date(income.account.updatedAt)
            } : null
        })) as Income[];
    } catch (error) {
        console.error("Error fetching incomes:", error);
        throw new Error("Failed to fetch incomes");
    }
}

export async function createIncome(data: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Use a transaction to ensure both income and account balance are updated atomically
        const result = await prisma.$transaction(async (tx) => {
            // Create the income
            const income = await tx.income.create({
                data: {
                    title: data.title,
                    description: data.description,
                    amount: data.amount,
                    date: data.date,
                    categoryId: data.categoryId,
                    accountId: data.accountId,
                    userId: userId,
                    tags: data.tags,
                    notes: data.notes,
                    isRecurring: data.isRecurring,
                    recurringFrequency: data.recurringFrequency
                },
                include: {
                    category: true,
                    account: true,
                    user: true
                }
            });

            // Update the account balance (increase by income amount)
            if (data.accountId) {
                await tx.account.update({
                    where: { id: data.accountId },
                    data: {
                        balance: {
                            increment: data.amount
                        }
                    }
                });
            }

            return income;
        });

        revalidatePath("/(dashboard)/incomes");
        revalidatePath("/(dashboard)/accounts");

        // Transform Prisma result to match our Income type
        return {
            ...result,
            amount: parseFloat(result.amount.toString()),
            date: new Date(result.date),
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt),
            // Convert account balance from Decimal to number
            account: result.account ? {
                ...result.account,
                balance: parseFloat((result.account.balance.toNumber() + data.amount).toString()),
                accountOpeningDate: new Date(result.account.accountOpeningDate),
                createdAt: new Date(result.account.createdAt),
                updatedAt: new Date(result.account.updatedAt)
            } : null
        } as Income;
    } catch (error) {
        console.error("Error creating income:", error);
        throw new Error("Failed to create income");
    }
}

export async function updateIncome(id: number, data: Partial<Omit<Income, 'id' | 'createdAt' | 'updatedAt'>>) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Verify the income belongs to the user
        const existingIncome = await prisma.income.findFirst({
            where: {
                id,
                userId: userId,
            },
        });

        if (!existingIncome) {
            throw new Error("Income not found or unauthorized");
        }

        const updateData: any = {};
        
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.amount !== undefined) updateData.amount = data.amount;
        if (data.date !== undefined) updateData.date = data.date;
        if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
        if (data.accountId !== undefined) updateData.accountId = data.accountId;
        if (data.tags !== undefined) updateData.tags = data.tags;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
        if (data.recurringFrequency !== undefined) updateData.recurringFrequency = data.recurringFrequency;

        // Use a transaction to handle income update and account balance changes
        const result = await prisma.$transaction(async (tx) => {
            // Update the income
            const income = await tx.income.update({
                where: { id },
                data: updateData,
                include: {
                    category: true,
                    account: true,
                    user: true
                }
            });

            // Handle account balance changes
            const oldAmount = parseFloat(existingIncome.amount.toString());
            const newAmount = data.amount !== undefined ? data.amount : oldAmount;
            const oldAccountId = existingIncome.accountId;
            const newAccountId = data.accountId !== undefined ? data.accountId : oldAccountId;

            // If amount changed and same account
            if (data.amount !== undefined && oldAccountId === newAccountId && oldAccountId) {
                const amountDifference = newAmount - oldAmount;
                await tx.account.update({
                    where: { id: oldAccountId },
                    data: {
                        balance: {
                            increment: amountDifference
                        }
                    }
                });
            }
            // If account changed
            else if (data.accountId !== undefined && oldAccountId !== newAccountId) {
                // Remove from old account
                if (oldAccountId) {
                    await tx.account.update({
                        where: { id: oldAccountId },
                        data: {
                            balance: {
                                decrement: oldAmount
                            }
                        }
                    });
                }
                // Add to new account
                if (newAccountId) {
                    await tx.account.update({
                        where: { id: newAccountId },
                        data: {
                            balance: {
                                increment: newAmount
                            }
                        }
                    });
                }
            }

            return income;
        });

        revalidatePath("/(dashboard)/incomes");
        revalidatePath("/(dashboard)/accounts");

        return {
            ...result,
            amount: parseFloat(result.amount.toString()),
            date: new Date(result.date),
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt),
            // Convert account balance from Decimal to number  
            account: result.account ? {
                ...result.account,
                balance: parseFloat(result.account.balance.toString()),
                accountOpeningDate: new Date(result.account.accountOpeningDate),
                createdAt: new Date(result.account.createdAt),
                updatedAt: new Date(result.account.updatedAt)
            } : null
        } as Income;
    } catch (error) {
        console.error("Error updating income:", error);
        throw new Error("Failed to update income");
    }
}

export async function deleteIncome(id: number) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Verify the income belongs to the user
        const existingIncome = await prisma.income.findFirst({
            where: {
                id,
                userId: userId,
            },
        });

        if (!existingIncome) {
            throw new Error("Income not found or unauthorized");
        }

        // Use a transaction to ensure both income deletion and account balance update
        await prisma.$transaction(async (tx) => {
            // Delete the income
            await tx.income.delete({
                where: { id }
            });

            // Update the account balance (decrease by income amount)
            if (existingIncome.accountId) {
                await tx.account.update({
                    where: { id: existingIncome.accountId },
                    data: {
                        balance: {
                            decrement: parseFloat(existingIncome.amount.toString())
                        }
                    }
                });
            }
        });

        revalidatePath("/(dashboard)/incomes");
        revalidatePath("/(dashboard)/accounts");
        return { success: true };
    } catch (error) {
        console.error("Error deleting income:", error);
        throw new Error("Failed to delete income");
    }
}

export async function getIncomesByCategory(categoryId: number) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        const incomes = await prisma.income.findMany({
            where: { 
                categoryId,
                userId: userId
            },
            include: {
                category: true,
                account: true,
                user: true
            },
            orderBy: {
                date: 'desc'
            }
        });

        return incomes.map(income => ({
            ...income,
            amount: parseFloat(income.amount.toString()),
            date: new Date(income.date),
            createdAt: new Date(income.createdAt),
            updatedAt: new Date(income.updatedAt),
            // Convert account balance from Decimal to number
            account: income.account ? {
                ...income.account,
                balance: parseFloat(income.account.balance.toString()),
                accountOpeningDate: new Date(income.account.accountOpeningDate),
                createdAt: new Date(income.account.createdAt),
                updatedAt: new Date(income.account.updatedAt)
            } : null
        })) as Income[];
    } catch (error) {
        console.error("Error fetching incomes by category:", error);
        throw new Error("Failed to fetch incomes by category");
    }
}

export async function getIncomesByDateRange(startDate: Date, endDate: Date) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        const incomes = await prisma.income.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                },
                userId: userId
            },
            include: {
                category: true,
                account: true,
                user: true
            },
            orderBy: {
                date: 'desc'
            }
        });

        return incomes.map(income => ({
            ...income,
            amount: parseFloat(income.amount.toString()),
            date: new Date(income.date),
            createdAt: new Date(income.createdAt),
            updatedAt: new Date(income.updatedAt),
            // Convert account balance from Decimal to number
            account: income.account ? {
                ...income.account,
                balance: parseFloat(income.account.balance.toString()),
                accountOpeningDate: new Date(income.account.accountOpeningDate),
                createdAt: new Date(income.account.createdAt),
                updatedAt: new Date(income.account.updatedAt)
            } : null
        })) as Income[];
    } catch (error) {
        console.error("Error fetching incomes by date range:", error);
        throw new Error("Failed to fetch incomes by date range");
    }
} 

// Bulk import functionality for incomes
export async function bulkImportIncomes(file: File, defaultAccountId: string, transactionType?: string): Promise<any> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);
        const text = await file.text();
        const rows = await parseCSVForUI(text);

        if (rows.length <= 1) {
            throw new Error("CSV file must contain header row and at least one data row");
        }

        const headers = rows[0];
        if (!headers) {
            throw new Error("CSV file must have a valid header row");
        }
        
        const dataRows = rows.slice(1);

        let successCount = 0;
        const errors: { row: number; message: string }[] = [];

        // Get all categories and accounts for validation
        const [categories, accounts] = await Promise.all([
            prisma.category.findMany({ where: { type: "INCOME" } }),
            prisma.account.findMany({ where: { userId } })
        ]);

        for (let i = 0; i < dataRows.length; i++) {
            const rowData = dataRows[i];
            if (!rowData) {
                continue; // Skip empty rows
            }
            const rowNumber = i + 2; // +2 because of header row and 0-based index

            try {
                const income = await processIncomeRow(rowData, headers, categories, accounts, defaultAccountId, userId);
                if (income) {
                    successCount++;
                }
            } catch (error) {
                errors.push({
                    row: rowNumber,
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        revalidatePath("/(dashboard)/incomes");
        revalidatePath("/(dashboard)/accounts");

        return {
            success: successCount,
            errors: errors.map(error => ({
                row: error.row,
                error: error.message
            }))
        };
    } catch (error) {
        console.error("Error in bulk import:", error);
        throw new Error("Failed to process bulk import");
    }
}

export async function parseCSVForUI(csvText: string): Promise<string[][]> {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    return lines.map(line => {
        const cells: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++; // Skip the next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                cells.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        cells.push(current.trim());
        return cells;
    });
}

export async function importCorrectedRow(rowData: string[], headers: string[], transactionType?: string): Promise<any> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Get all categories and accounts for validation
        const [categories, accounts] = await Promise.all([
            prisma.category.findMany({ where: { type: "INCOME" } }),
            prisma.account.findMany({ where: { userId } })
        ]);

        const income = await processIncomeRow(rowData, headers, categories, accounts, '', userId);
        
        revalidatePath("/(dashboard)/incomes");
        revalidatePath("/(dashboard)/accounts");
        
        return income;
    } catch (error) {
        console.error("Error importing corrected row:", error);
        throw new Error("Failed to import corrected row");
    }
}

async function processIncomeRow(
    rowData: string[], 
    headers: string[], 
    categories: any[], 
    accounts: any[], 
    defaultAccountId: string, 
    userId: number
): Promise<any> {
    // Create a mapping of headers to values
    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
        rowObj[header.toLowerCase().trim()] = rowData[index]?.trim() || '';
    });

    // Validate required fields
    if (!rowObj.title) {
        throw new Error("Title is required");
    }
    if (!rowObj.amount || isNaN(parseFloat(rowObj.amount))) {
        throw new Error("Valid amount is required");
    }
    if (!rowObj.date) {
        throw new Error("Date is required");
    }
    if (!rowObj.category) {
        throw new Error("Category is required");
    }

    // Parse and validate date
    const date = new Date(rowObj.date);
    if (isNaN(date.getTime())) {
        throw new Error("Invalid date format. Use YYYY-MM-DD");
    }

    // Find category
    const categoryName = rowObj.category;
    if (!categoryName) {
        throw new Error("Category is required");
    }
    const category = categories.find(c => 
        c.name.toLowerCase() === categoryName.toLowerCase()
    );
    if (!category) {
        throw new Error(`Category "${categoryName}" not found`);
    }

    // Find account
    let accountId = defaultAccountId;
    const accountName = rowObj.account;
    if (accountName) {
        const account = accounts.find(a => {
            if (!accountName) return false;
            
            // First try to match against the exported format: "holderName - bankName"
            const exportedFormat = `${a.holderName} - ${a.bankName}`;
            if (exportedFormat.toLowerCase() === accountName.toLowerCase()) {
                return true;
            }
            
            // Fallback: Match against individual components
            const holderNameMatch = a.holderName && a.holderName.toLowerCase().includes(accountName.toLowerCase());
            const bankNameMatch = a.bankName && a.bankName.toLowerCase().includes(accountName.toLowerCase());
            const accountNumberMatch = a.accountNumber && a.accountNumber.toLowerCase() === accountName.toLowerCase();
            
            return holderNameMatch || bankNameMatch || accountNumberMatch;
        });
        
        if (account) {
            accountId = account.id.toString();
        }
        // If account is not found, we'll continue without an account (no error thrown)
        // This allows incomes to be imported even if account names don't match exactly
    }

    // Account is now optional - income can be imported without an account
    // if (!accountId) {
    //     throw new Error("Account is required");
    // }

    // Parse tags - ensure we have an array
    const tagsString = rowObj.tags || '';
    const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(Boolean) : [];

    // Parse recurring
    const recurringString = rowObj.recurring || '';
    const isRecurring = recurringString.toLowerCase() === 'true' || recurringString.toLowerCase() === 'yes';

    // Create a simple data object that matches what createIncome expects
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

    // Only add accountId if we have a valid account
    if (accountId && accountId !== '') {
        const selectedAccount = accounts.find(a => a.id === parseInt(accountId));
        if (selectedAccount) {
            incomeData.accountId = parseInt(accountId);
        }
    }

    // The createIncome function will handle creating the full Income object with relationships
    return await createIncome(incomeData as any);
} 