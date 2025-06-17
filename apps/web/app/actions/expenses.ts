"use server";

import { revalidatePath } from "next/cache";
import { Expense } from "../types/financial";
import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { 
    parseCSV, 
    parseDate, 
    parseAmount, 
    parseTags, 
    mapRowToObject 
} from "../utils/csvUtils";
import { 
    ImportResult, 
    ImportExpenseRow, 
    BulkOperationResult 
} from "../types/bulkImport";

// Helper function to get user ID from session
function getUserIdFromSession(sessionUserId: string): number {
    // If it's a very large number (OAuth provider), take last 5 digits
    if (sessionUserId.length > 5) {
        return parseInt(sessionUserId.slice(-5));
    }
    // Otherwise parse normally
    return parseInt(sessionUserId);
}

export async function getExpenses() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        const expenses = await prisma.expense.findMany({
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

        // Transform Prisma result to match our Expense type
        return expenses.map(expense => ({
            ...expense,
            amount: parseFloat(expense.amount.toString()),
            date: new Date(expense.date),
            createdAt: new Date(expense.createdAt),
            updatedAt: new Date(expense.updatedAt),
            // Convert account balance from Decimal to number
            account: expense.account ? {
                ...expense.account,
                balance: parseFloat(expense.account.balance.toString()),
                accountOpeningDate: new Date(expense.account.accountOpeningDate),
                createdAt: new Date(expense.account.createdAt),
                updatedAt: new Date(expense.account.updatedAt)
            } : null
        })) as Expense[];
    } catch (error) {
        console.error("Error fetching expenses:", error);
        throw new Error("Failed to fetch expenses");
    }
}

export async function createExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Use a transaction to ensure both expense and account balance are updated atomically
        const result = await prisma.$transaction(async (tx) => {
            // Create the expense
            const createData: any = {
                title: data.title,
                description: data.description,
                amount: data.amount,
                date: data.date,
                category: {
                    connect: { id: data.categoryId }
                },
                user: {
                    connect: { id: userId }
                },
                tags: data.tags,
                receipt: data.receipt,
                notes: data.notes,
                isRecurring: data.isRecurring,
                recurringFrequency: data.recurringFrequency
            };

            if (data.accountId) {
                createData.account = {
                    connect: { id: data.accountId }
                };
            }

            const expense = await tx.expense.create({
                data: createData,
                include: {
                    category: true,
                    account: true,
                    user: true
                }
            });

            // Update the account balance (decrease by expense amount)
            if (data.accountId) {
                await tx.account.update({
                    where: { id: data.accountId },
                    data: {
                        balance: {
                            decrement: data.amount
                        }
                    }
                });
            }

            return expense;
        });

        revalidatePath("/(dashboard)/expenses");
        revalidatePath("/(dashboard)/accounts");

        // Transform Prisma result to match our Expense type
        return {
            ...result,
            amount: parseFloat(result.amount.toString()),
            date: new Date(result.date),
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt),
            // Convert account balance from Decimal to number
            account: result.account ? {
                ...result.account,
                balance: parseFloat((result.account.balance.toNumber() - data.amount).toString()),
                accountOpeningDate: new Date(result.account.accountOpeningDate),
                createdAt: new Date(result.account.createdAt),
                updatedAt: new Date(result.account.updatedAt)
            } : null
        } as Expense;
    } catch (error) {
        console.error("Error creating expense:", error);
        throw new Error("Failed to create expense");
    }
}

export async function updateExpense(id: number, data: Partial<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Verify the expense belongs to the user
        const existingExpense = await prisma.expense.findFirst({
            where: {
                id,
                userId: userId,
            },
        });

        if (!existingExpense) {
            throw new Error("Expense not found or unauthorized");
        }

        const updateData: any = {};
        
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.amount !== undefined) updateData.amount = data.amount;
        if (data.date !== undefined) updateData.date = data.date;
        if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
        if (data.accountId !== undefined) updateData.accountId = data.accountId;
        if (data.tags !== undefined) updateData.tags = data.tags;
        if (data.receipt !== undefined) updateData.receipt = data.receipt;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
        if (data.recurringFrequency !== undefined) updateData.recurringFrequency = data.recurringFrequency;

        // Use a transaction to handle expense update and account balance changes
        const result = await prisma.$transaction(async (tx) => {
            // Update the expense
            const expense = await tx.expense.update({
                where: { id },
                data: updateData,
                include: {
                    category: true,
                    account: true,
                    user: true
                }
            });

            // Handle account balance changes
            const oldAmount = parseFloat(existingExpense.amount.toString());
            const newAmount = data.amount !== undefined ? data.amount : oldAmount;
            const oldAccountId = existingExpense.accountId;
            const newAccountId = data.accountId !== undefined ? data.accountId : oldAccountId;

            // If amount changed and same account
            if (data.amount !== undefined && oldAccountId === newAccountId && oldAccountId) {
                const amountDifference = newAmount - oldAmount;
                // For expenses: if amount increased, decrease balance more; if decreased, increase balance
                await tx.account.update({
                    where: { id: oldAccountId },
                    data: {
                        balance: {
                            decrement: amountDifference
                        }
                    }
                });
            }
            // If account changed
            else if (data.accountId !== undefined && oldAccountId !== newAccountId) {
                // Add back to old account (expense no longer from that account)
                if (oldAccountId) {
                    await tx.account.update({
                        where: { id: oldAccountId },
                        data: {
                            balance: {
                                increment: oldAmount
                            }
                        }
                    });
                }
                // Subtract from new account
                if (newAccountId) {
                    await tx.account.update({
                        where: { id: newAccountId },
                        data: {
                            balance: {
                                decrement: newAmount
                            }
                        }
                    });
                }
            }

            return expense;
        });

        revalidatePath("/(dashboard)/expenses");
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
        } as Expense;
    } catch (error) {
        console.error("Error updating expense:", error);
        throw new Error("Failed to update expense");
    }
}

export async function deleteExpense(id: number) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Verify the expense belongs to the user
        const existingExpense = await prisma.expense.findFirst({
            where: {
                id,
                userId: userId,
            },
        });

        if (!existingExpense) {
            throw new Error("Expense not found or unauthorized");
        }

        // Use a transaction to ensure both expense deletion and account balance update
        await prisma.$transaction(async (tx) => {
            // Delete the expense
            await tx.expense.delete({
                where: { id }
            });

            // Update the account balance (increase by expense amount since expense is removed)
            if (existingExpense.accountId) {
                await tx.account.update({
                    where: { id: existingExpense.accountId },
                    data: {
                        balance: {
                            increment: parseFloat(existingExpense.amount.toString())
                        }
                    }
                });
            }
        });

        revalidatePath("/(dashboard)/expenses");
        revalidatePath("/(dashboard)/accounts");
        return { success: true };
    } catch (error) {
        console.error("Error deleting expense:", error);
        throw new Error("Failed to delete expense");
    }
}

export async function getExpensesByCategory(categoryId: number) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        const expenses = await prisma.expense.findMany({
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

        return expenses.map(expense => ({
            ...expense,
            amount: parseFloat(expense.amount.toString()),
            date: new Date(expense.date),
            createdAt: new Date(expense.createdAt),
            updatedAt: new Date(expense.updatedAt),
            // Convert account balance from Decimal to number
            account: expense.account ? {
                ...expense.account,
                balance: parseFloat(expense.account.balance.toString()),
                accountOpeningDate: new Date(expense.account.accountOpeningDate),
                createdAt: new Date(expense.account.createdAt),
                updatedAt: new Date(expense.account.updatedAt)
            } : null
        })) as Expense[];
    } catch (error) {
        console.error("Error fetching expenses by category:", error);
        throw new Error("Failed to fetch expenses by category");
    }
}

export async function getExpensesByDateRange(startDate: Date, endDate: Date) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        const expenses = await prisma.expense.findMany({
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

        return expenses.map(expense => ({
            ...expense,
            amount: parseFloat(expense.amount.toString()),
            date: new Date(expense.date),
            createdAt: new Date(expense.createdAt),
            updatedAt: new Date(expense.updatedAt),
            // Convert account balance from Decimal to number
            account: expense.account ? {
                ...expense.account,
                balance: parseFloat(expense.account.balance.toString()),
                accountOpeningDate: new Date(expense.account.accountOpeningDate),
                createdAt: new Date(expense.account.createdAt),
                updatedAt: new Date(expense.account.updatedAt)
            } : null
        })) as Expense[];
    } catch (error) {
        console.error("Error fetching expenses by date range:", error);
        throw new Error("Failed to fetch expenses by date range");
    }
}



// Removed duplicate types and functions - now using centralized utilities

// Helper function to validate and transform CSV row
async function validateAndTransformRow(
    row: string[], 
    headers: string[], 
    userId: number,
    categories: any[],
    accounts: any[],
    defaultAccountId?: number
): Promise<ImportExpenseRow> {
    // Map CSV columns to object using utility
    const rowData = mapRowToObject(row, headers);

    // Validate required fields
    if (!rowData.title) {
        throw new Error('Title is required');
    }
    
    if (!rowData.categoryname && !rowData.category) {
        throw new Error('Category is required');
    }

    // Parse and validate using utilities
    const amount = parseAmount(rowData.amount || '');
    const parsedDate = parseDate(rowData.date || '');
    const tags = parseTags(rowData.tags || '');

    // Find or validate category
    const categoryName = rowData.categoryname || rowData.category || '';
    const category = categories.find(c => 
        c.name && categoryName && c.name.toLowerCase() === categoryName.toLowerCase()
    );
    
    if (!category) {
        throw new Error(`Category '${categoryName}' not found`);
    }

    // Find account if specified, otherwise use default
    let accountId = null;
    if (rowData.accountname || rowData.account) {
        const accountName = (rowData.accountname || rowData.account || '');
        const account = accounts.find(a => {
            if (!accountName) return false;
            
            // First try to match against the exported format: "holderName - bankName"
            const exportedFormat = `${a.holderName} - ${a.bankName}`;
            if (exportedFormat.toLowerCase() === accountName.toLowerCase()) {
                return true;
            }
            
            // Fallback: Match against individual components
            const holderNameMatch = a.holderName && a.holderName.toLowerCase() === accountName.toLowerCase();
            const bankNameMatch = a.bankName && a.bankName.toLowerCase() === accountName.toLowerCase();
            const accountNumberMatch = a.accountNumber && a.accountNumber.toLowerCase() === accountName.toLowerCase();
            
            return holderNameMatch || bankNameMatch || accountNumberMatch;
        });
        
        if (account) {
            accountId = account.id;
        }
        // If account is not found, we'll continue without an account (no error thrown)
        // This allows expenses to be imported even if account names don't match exactly
    } else if (defaultAccountId) {
        // Use default account if no account specified in CSV
        accountId = defaultAccountId;
    }

    return {
        title: rowData.title,
        description: rowData.description || '',
        amount,
        date: parsedDate,
        categoryName: category.name,
        categoryId: category.id,
        accountId,
        tags,
        notes: rowData.notes || '',
        isRecurring: rowData.isrecurring?.toLowerCase() === 'true' || false,
        recurringFrequency: rowData.recurringfrequency || null,
        userId
    };
}

export async function bulkImportExpenses(csvText: string, defaultAccountId?: number): Promise<ImportResult> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Parse CSV
        const rows = parseCSV(csvText);
        if (rows.length === 0) {
            throw new Error("CSV file is empty");
        }

        const headers = rows[0]?.map(h => h?.toLowerCase().replace(/\s+/g, '') || '') || [];
        const dataRows = rows.slice(1);

        // Get categories and accounts for validation
        const [categories, accounts] = await Promise.all([
            prisma.category.findMany({
                where: { 
                    type: 'EXPENSE',
                    userId: userId
                }
            }),
            prisma.account.findMany({
                where: { userId: userId }
            })
        ]);

        const result: ImportResult = {
            success: false,
            importedCount: 0,
            errors: [],
            skippedCount: 0
        };

        // Process rows individually to avoid long-running transactions
        // Pre-validate all rows first to avoid partial imports
        const validatedRows: Array<{
            data: ImportExpenseRow;
            rowIndex: number;
            originalRow: string[];
        }> = [];

        for (let i = 0; i < dataRows.length; i++) {
            const rowIndex = i + 2; // +2 for header and 1-based indexing
            const row = dataRows[i];

            if (!row) continue;

            try {
                // Skip empty rows - safely handle undefined cells
                if (row.every(cell => !cell || (typeof cell === 'string' && !cell.trim()))) {
                    result.skippedCount++;
                    continue;
                }

                // Validate and transform row
                const expenseData = await validateAndTransformRow(
                    row, 
                    headers, 
                    userId, 
                    categories, 
                    accounts,
                    defaultAccountId
                );

                validatedRows.push({
                    data: expenseData,
                    rowIndex,
                    originalRow: row
                });

            } catch (error) {
                result.errors.push({
                    row: rowIndex,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    data: row
                });
            }
        }

        // Process validated rows in smaller batches with shorter transactions
        const BATCH_SIZE = 10; // Reduced batch size
        const batches: typeof validatedRows[] = [];
        
        for (let i = 0; i < validatedRows.length; i += BATCH_SIZE) {
            batches.push(validatedRows.slice(i, i + BATCH_SIZE));
        }

        // Process each batch in a separate transaction to avoid timeouts
        for (const batch of batches) {
            try {
                await prisma.$transaction(async (tx) => {
                    for (const validatedRow of batch) {
                        // Create expense using relational approach to match the include statement
                        const createData: any = {
                            title: validatedRow.data.title,
                            description: validatedRow.data.description,
                            amount: validatedRow.data.amount,
                            date: validatedRow.data.date,
                            category: {
                                connect: { id: validatedRow.data.categoryId }
                            },
                            user: {
                                connect: { id: userId }
                            },
                            tags: validatedRow.data.tags,
                            notes: validatedRow.data.notes,
                            isRecurring: validatedRow.data.isRecurring || false
                        };

                        if (validatedRow.data.accountId) {
                            createData.account = {
                                connect: { id: validatedRow.data.accountId }
                            };
                        }

                        if (validatedRow.data.recurringFrequency) {
                            createData.recurringFrequency = validatedRow.data.recurringFrequency;
                        }

                        const expense = await tx.expense.create({
                            data: createData
                        });

                        // Update account balance if account is specified
                        if (validatedRow.data.accountId) {
                            await tx.account.update({
                                where: { id: validatedRow.data.accountId },
                                data: {
                                    balance: {
                                        decrement: validatedRow.data.amount
                                    }
                                }
                            });
                        }

                        result.importedCount++;
                    }
                }, {
                    timeout: 30000, // 30 second timeout per batch
                });
            } catch (error) {
                // If a batch fails, add errors for all rows in that batch
                batch.forEach(validatedRow => {
                    result.errors.push({
                        row: validatedRow.rowIndex,
                        error: error instanceof Error ? error.message : 'Unknown error during batch import',
                        data: validatedRow.originalRow
                    });
                });
            }
        }

        result.success = result.importedCount > 0;

        revalidatePath("/(dashboard)/expenses");
        revalidatePath("/(dashboard)/accounts");

        return result;

    } catch (error) {
        console.error("Error in bulk import:", error);
        throw new Error(error instanceof Error ? error.message : "Failed to import expenses");
    }
}

export async function bulkDeleteExpenses(expenseIds: number[]) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Verify all expenses belong to the user and get expense details for account balance updates
        const existingExpenses = await prisma.expense.findMany({
            where: {
                id: { in: expenseIds },
                userId: userId,
            },
            include: {
                account: true
            }
        });

        if (existingExpenses.length !== expenseIds.length) {
            throw new Error("Some expenses not found or unauthorized");
        }

        // Use a transaction to ensure both expense deletion and account balance updates
        await prisma.$transaction(async (tx) => {
            // Delete the expenses
            await tx.expense.deleteMany({
                where: { 
                    id: { in: expenseIds },
                    userId: userId
                }
            });

            // Update account balances (increase by expense amounts since expenses are removed)
            const accountUpdates = new Map<number, number>();
            
            existingExpenses.forEach(expense => {
                if (expense.accountId) {
                    const currentTotal = accountUpdates.get(expense.accountId) || 0;
                    accountUpdates.set(expense.accountId, currentTotal + parseFloat(expense.amount.toString()));
                }
            });

            // Apply account balance updates
            for (const [accountId, totalAmount] of accountUpdates) {
                await tx.account.update({
                    where: { id: accountId },
                    data: {
                        balance: {
                            increment: totalAmount
                        }
                    }
                });
            }
        });

        revalidatePath("/(dashboard)/expenses");
        revalidatePath("/(dashboard)/accounts");
        
        return { 
            success: true, 
            deletedCount: existingExpenses.length 
        };
    } catch (error) {
        console.error("Error bulk deleting expenses:", error);
        throw new Error("Failed to delete expenses");
    }
}

export async function importCorrectedRow(
    row: string[], 
    headers: string[], 
    defaultAccountId?: number
): Promise<{ success: boolean; error?: string; expense?: any }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Get categories and accounts for validation
        const [categories, accounts] = await Promise.all([
            prisma.category.findMany({
                where: { 
                    type: 'EXPENSE',
                    userId: userId
                }
            }),
            prisma.account.findMany({
                where: { userId: userId }
            })
        ]);

        // Use a transaction to create the expense and update account balance
        const result = await prisma.$transaction(async (tx) => {
            // Validate and transform row
            const expenseData = await validateAndTransformRow(
                row, 
                headers, 
                userId, 
                categories, 
                accounts,
                defaultAccountId
            );

            // Create expense using relational approach to match the include statement
            const createData: any = {
                title: expenseData.title,
                description: expenseData.description,
                amount: expenseData.amount,
                date: expenseData.date,
                category: {
                    connect: { id: expenseData.categoryId }
                },
                user: {
                    connect: { id: userId }
                },
                tags: expenseData.tags,
                notes: expenseData.notes,
                isRecurring: expenseData.isRecurring || false
            };

            if (expenseData.accountId) {
                createData.account = {
                    connect: { id: expenseData.accountId }
                };
            }

            if (expenseData.recurringFrequency) {
                createData.recurringFrequency = expenseData.recurringFrequency;
            }

            const expense = await tx.expense.create({
                data: createData,
                include: {
                    category: true,
                    account: true,
                    user: true
                }
            });

            // Update account balance if account is specified
            if (expenseData.accountId) {
                await tx.account.update({
                    where: { id: expenseData.accountId },
                    data: {
                        balance: {
                            decrement: expenseData.amount
                        }
                    }
                });
            }

            return expense;
        });

        revalidatePath("/(dashboard)/expenses");
        revalidatePath("/(dashboard)/accounts");

        return { 
            success: true, 
            expense: {
                ...result,
                amount: parseFloat(result.amount.toString()),
                date: new Date(result.date),
                createdAt: new Date(result.createdAt),
                updatedAt: new Date(result.updatedAt),
                account: result.account ? {
                    ...result.account,
                    balance: parseFloat(result.account.balance.toString()),
                    accountOpeningDate: new Date(result.account.accountOpeningDate),
                    createdAt: new Date(result.account.createdAt),
                    updatedAt: new Date(result.account.updatedAt)
                } : null
            }
        };

    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        };
    }
}

// Export the parseCSV function for use in the UI
export async function parseCSVForUI(csvText: string): Promise<string[][]> {
    try {
        if (!csvText || typeof csvText !== 'string') {
            return [];
        }
        
        const result = parseCSV(csvText);
        return Array.isArray(result) ? result : [];
    } catch (error) {
        console.error('Error parsing CSV:', error);
        return [];
    }
}