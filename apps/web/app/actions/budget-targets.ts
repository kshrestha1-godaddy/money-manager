"use server";

import prisma from "@repo/db/client";
import { BudgetTarget } from "../types/financial";
import { BudgetComparisonData, BudgetTargetFormData } from "../hooks/useBudgetTracking";
import { getAuthenticatedSession, getUserIdFromSession } from "../utils/auth";
import { convertForDisplaySync } from "../utils/currencyDisplay";
import { ImportResult } from "../types/bulkImport";
import { parseCSV } from "../utils/csvUtils";

export async function getBudgetTargets(period?: string): Promise<{ data?: BudgetTarget[], error?: string }> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        const whereClause: any = {
            userId: userId,
            isActive: true,
        };

        if (period) {
            whereClause.period = period;
        }

        const budgetTargets = await prisma.budgetTarget.findMany({
            where: whereClause,
            orderBy: {
                createdAt: 'desc',
            },
        });

        const formattedTargets: BudgetTarget[] = budgetTargets.map(target => ({
            id: target.id,
            name: target.name,
            targetAmount: parseFloat(target.targetAmount.toString()),
            currentAmount: parseFloat(target.currentAmount.toString()),
            period: target.period as 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
            startDate: target.startDate,
            endDate: target.endDate,
            userId: target.userId,
            isActive: target.isActive,
            createdAt: target.createdAt,
            updatedAt: target.updatedAt,
        }));

        return { data: formattedTargets };
    } catch (error) {
        console.error("Error fetching budget targets:", error);
        return { error: "Failed to fetch budget targets" };
    }
}

export async function createBudgetTarget(data: BudgetTargetFormData): Promise<BudgetTarget> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        const budgetTarget = await prisma.budgetTarget.create({
            data: {
                name: data.name,
                targetAmount: data.targetAmount,
                currentAmount: 0,
                period: data.period,
                startDate: data.startDate,
                endDate: data.endDate,
                userId: userId,
                isActive: true,
            },
        });

        return {
            id: budgetTarget.id,
            name: budgetTarget.name,
            targetAmount: parseFloat(budgetTarget.targetAmount.toString()),
            currentAmount: parseFloat(budgetTarget.currentAmount.toString()),
            period: budgetTarget.period as 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
            startDate: budgetTarget.startDate,
            endDate: budgetTarget.endDate,
            userId: budgetTarget.userId,
            isActive: budgetTarget.isActive,
            createdAt: budgetTarget.createdAt,
            updatedAt: budgetTarget.updatedAt,
        };
    } catch (error) {
        console.error("Error creating budget target:", error);
        throw error;
    }
}

export async function updateBudgetTarget(id: number, data: Partial<BudgetTargetFormData>): Promise<BudgetTarget> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Verify ownership
        const existingTarget = await prisma.budgetTarget.findFirst({
            where: {
                id: id,
                userId: userId,
            },
        });

        if (!existingTarget) {
            throw new Error("Budget target not found or access denied");
        }

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.targetAmount !== undefined) updateData.targetAmount = data.targetAmount;
        if (data.period !== undefined) updateData.period = data.period;
        if (data.startDate !== undefined) updateData.startDate = data.startDate;
        if (data.endDate !== undefined) updateData.endDate = data.endDate;

        const budgetTarget = await prisma.budgetTarget.update({
            where: { id: id },
            data: updateData,
        });

        return {
            id: budgetTarget.id,
            name: budgetTarget.name,
            targetAmount: parseFloat(budgetTarget.targetAmount.toString()),
            currentAmount: parseFloat(budgetTarget.currentAmount.toString()),
            period: budgetTarget.period as 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
            startDate: budgetTarget.startDate,
            endDate: budgetTarget.endDate,
            userId: budgetTarget.userId,
            isActive: budgetTarget.isActive,
            createdAt: budgetTarget.createdAt,
            updatedAt: budgetTarget.updatedAt,
        };
    } catch (error) {
        console.error("Error updating budget target:", error);
        throw error;
    }
}

export async function deleteBudgetTarget(id: number): Promise<void> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Verify ownership
        const existingTarget = await prisma.budgetTarget.findFirst({
            where: {
                id: id,
                userId: userId,
            },
        });

        if (!existingTarget) {
            throw new Error("Budget target not found or access denied");
        }

        await prisma.budgetTarget.delete({
            where: { id: id },
        });
    } catch (error) {
        console.error("Error deleting budget target:", error);
        throw error;
    }
}

export async function getBudgetComparison(period: string = 'MONTHLY'): Promise<{ data?: BudgetComparisonData[], error?: string }> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Get user's preferred currency for display
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { currency: true }
        });
        const userCurrency = user?.currency || 'USD';

        // Get all user's categories that are included in budget (both expense and income)
        const categories = await prisma.category.findMany({
            where: {
                userId: userId,
                includedInBudget: true,
            },
        });

        // Get current month's start and end dates
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Get all expense and income data for the current month only
        const [expenses, incomes] = await Promise.all([
            prisma.expense.findMany({
                where: {
                    userId: userId,
                    date: {
                        gte: currentMonthStart,
                        lte: currentMonthEnd,
                    },
                },
                include: {
                    category: true,
                },
            }),
            prisma.income.findMany({
                where: {
                    userId: userId,
                    date: {
                        gte: currentMonthStart,
                        lte: currentMonthEnd,
                    },
                },
                include: {
                    category: true,
                },
            })
        ]);

        // Get existing budget targets for the specified period
        const existingBudgetTargets = await prisma.budgetTarget.findMany({
            where: {
                userId: userId,
                period: period as any,
                isActive: true,
            },
        });

        // Create a map of existing budget targets by category name
        const budgetTargetsMap = new Map(
            existingBudgetTargets.map(target => [target.name, target])
        );

        // Create a set of category names that are included in budget for quick lookup
        const includedCategoryNames = new Set(categories.map(cat => cat.name));

        // Group transactions by category (only for categories included in budget)
        const transactionsByCategory = new Map<string, { 
            expenses: any[], 
            incomes: any[], 
            categoryType: 'EXPENSE' | 'INCOME' 
        }>();

        // Process expenses (only for categories included in budget)
        expenses.forEach(expense => {
            const categoryName = expense.category?.name || 'Unknown';
            // Only include if category is marked as included in budget
            if (includedCategoryNames.has(categoryName)) {
                if (!transactionsByCategory.has(categoryName)) {
                    transactionsByCategory.set(categoryName, {
                        expenses: [],
                        incomes: [],
                        categoryType: 'EXPENSE'
                    });
                }
                transactionsByCategory.get(categoryName)!.expenses.push(expense);
            }
        });

        // Process incomes (only for categories included in budget)
        incomes.forEach(income => {
            const categoryName = income.category?.name || 'Unknown';
            // Only include if category is marked as included in budget
            if (includedCategoryNames.has(categoryName)) {
                if (!transactionsByCategory.has(categoryName)) {
                    transactionsByCategory.set(categoryName, {
                        expenses: [],
                        incomes: [],
                        categoryType: 'INCOME'
                    });
                }
                transactionsByCategory.get(categoryName)!.incomes.push(income);
            }
        });

        // Add categories that don't have transactions yet (these are already filtered by includedInBudget: true)
        categories.forEach(category => {
            if (!transactionsByCategory.has(category.name)) {
                transactionsByCategory.set(category.name, {
                    expenses: [],
                    incomes: [],
                    categoryType: category.type
                });
            }
        });

        // Create budget comparison data for all categories
        const budgetComparison: BudgetComparisonData[] = [];

        for (const [categoryName, categoryData] of transactionsByCategory) {
            const isExpenseCategory = categoryData.categoryType === 'EXPENSE';
            const relevantTransactions = isExpenseCategory ? categoryData.expenses : categoryData.incomes;
            
            // Calculate actual spending/earning for current month (with currency conversion)
            const totalAmount = relevantTransactions.reduce((sum, transaction) => {
                const amount = parseFloat(transaction.amount.toString());
                const transactionCurrency = transaction.currency || 'USD';
                const convertedAmount = convertForDisplaySync(amount, transactionCurrency, userCurrency);
                return sum + convertedAmount;
            }, 0);
            const transactionCount = relevantTransactions.length;
            // Use actual current month total instead of average
            const currentMonthActual = totalAmount;

            // Get or create budget target
            let budgetTarget = budgetTargetsMap.get(categoryName);
            let monthlySpend = 0;
            
            if (budgetTarget) {
                const targetAmount = parseFloat(budgetTarget.targetAmount.toString());
                monthlySpend = period === 'MONTHLY' ? targetAmount : 
                              period === 'QUARTERLY' ? targetAmount / 3 :
                              period === 'YEARLY' ? targetAmount / 12 : targetAmount;
            } else {
                // Create a default budget target with 0 amount
                monthlySpend = 0;
            }
            
            // Calculate variance
            const variance = currentMonthActual - monthlySpend;
            const variancePercentage = monthlySpend > 0 ? (variance / monthlySpend) * 100 : 
                                     (currentMonthActual > 0 ? 100 : 0);
            
            let status: 'over' | 'under' | 'on-track' = 'on-track';
            if (monthlySpend === 0) {
                status = currentMonthActual > 0 ? 'over' : 'on-track';
            } else if (Math.abs(variancePercentage) > 10) {
                status = variance > 0 ? 'over' : 'under';
            }

            budgetComparison.push({
                categoryName,
                categoryType: categoryData.categoryType,
                actualSpending: {
                    monthlyAverage: currentMonthActual, // Now represents current month actual, not average
                    totalAmount,
                    transactionCount,
                },
                budgetTarget: {
                    monthlySpend,
                    impliedAnnualSpend: monthlySpend * 12,
                },
                variance: {
                    amount: variance,
                    percentage: variancePercentage,
                    status: status,
                },
            });
        }

        return { data: budgetComparison };
    } catch (error) {
        console.error("Error fetching budget comparison:", error);
        return { error: "Failed to fetch budget comparison data" };
    }
}

export async function updateOrCreateBudgetTarget(
    categoryName: string, 
    targetAmount: number, 
    period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' = 'MONTHLY'
): Promise<{ success?: boolean, error?: string }> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Check if budget target already exists
        const existingTarget = await prisma.budgetTarget.findFirst({
            where: {
                userId: userId,
                name: categoryName,
                period: period,
                isActive: true,
            },
        });

        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        if (existingTarget) {
            // Update existing target
            await prisma.budgetTarget.update({
                where: { id: existingTarget.id },
                data: { targetAmount: targetAmount },
            });
        } else {
            // Create new target
            await prisma.budgetTarget.create({
                data: {
                    name: categoryName,
                    targetAmount: targetAmount,
                    currentAmount: 0,
                    period: period,
                    startDate: startDate,
                    endDate: endDate,
                    userId: userId,
                    isActive: true,
                },
            });
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating/creating budget target:", error);
        return { error: "Failed to update budget target" };
    }
}

export async function updateCategoryBudgetInclusion(
    categoryName: string, 
    includedInBudget: boolean
): Promise<{ success?: boolean, error?: string }> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Find and update the category
        await prisma.category.updateMany({
            where: {
                userId: userId,
                name: categoryName,
            },
            data: {
                includedInBudget: includedInBudget,
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Error updating category budget inclusion:", error);
        return { error: "Failed to update category budget inclusion" };
    }
}

export async function getAllCategoriesWithBudgetStatus(): Promise<{ data?: any[], error?: string }> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Get all user's categories with their budget inclusion status
        const categories = await prisma.category.findMany({
            where: {
                userId: userId,
            },
            select: {
                id: true,
                name: true,
                type: true,
                includedInBudget: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        return { data: categories };
    } catch (error) {
        console.error("Error fetching categories with budget status:", error);
        return { error: "Failed to fetch categories" };
    }
}

export async function getAllBudgetTargetsForExport(): Promise<{ data?: (BudgetTarget & { categoryType?: string })[], error?: string }> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        const budgetTargets = await prisma.budgetTarget.findMany({
            where: {
                userId: userId,
            },
            orderBy: [
                { isActive: 'desc' }, // Active targets first
                { createdAt: 'desc' }, // Then by creation date
            ],
        });

        // Get all categories to map category names to their types
        const categories = await prisma.category.findMany({
            where: {
                userId: userId,
            },
            select: {
                name: true,
                type: true,
            },
        });

        // Create a map of category name to type
        const categoryTypeMap = new Map(
            categories.map(cat => [cat.name, cat.type])
        );

        const formattedTargets: (BudgetTarget & { categoryType?: string })[] = budgetTargets.map(target => ({
            id: target.id,
            name: target.name,
            targetAmount: parseFloat(target.targetAmount.toString()),
            currentAmount: parseFloat(target.currentAmount.toString()),
            period: target.period as 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
            startDate: target.startDate,
            endDate: target.endDate,
            userId: target.userId,
            isActive: target.isActive,
            createdAt: target.createdAt,
            updatedAt: target.updatedAt,
            categoryType: categoryTypeMap.get(target.name) || 'UNKNOWN',
        }));

        return { data: formattedTargets };
    } catch (error) {
        console.error("Error fetching budget targets for export:", error);
        return { error: "Failed to fetch budget targets for export" };
    }
}

interface ParsedBudgetTargetData {
    name: string;
    categoryType: 'INCOME' | 'EXPENSE';
    targetAmount: number;
    period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    startDate: Date;
    endDate: Date;
}

async function validateAndTransformBudgetTargetRow(
    row: string[],
    headers: string[],
    userId: number
): Promise<ParsedBudgetTargetData> {
    const getColumnValue = (columnName: string): string => {
        const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/\s+/g, ''));
        const normalizedColumnName = columnName.toLowerCase().replace(/\s+/g, '');
        const index = normalizedHeaders.indexOf(normalizedColumnName);
        return index >= 0 ? (row[index] || '').toString().trim() : '';
    };

    const name = getColumnValue('categoryname') || getColumnValue('category');
    const categoryType = getColumnValue('categorytype') || getColumnValue('type');
    const targetAmountStr = getColumnValue('targetamount') || getColumnValue('amount');
    const period = getColumnValue('period');
    const startDateStr = getColumnValue('startdate');
    const endDateStr = getColumnValue('enddate');

    // Validate required fields
    if (!name) throw new Error('Category name is required');
    if (!categoryType) throw new Error('Category type is required');
    if (!targetAmountStr) throw new Error('Target amount is required');
    if (!period) throw new Error('Period is required');

    // Validate category type
    if (!['INCOME', 'EXPENSE'].includes(categoryType.toUpperCase())) {
        throw new Error('Category type must be INCOME or EXPENSE');
    }

    // Validate and parse target amount
    const targetAmount = parseFloat(targetAmountStr);
    if (isNaN(targetAmount) || targetAmount <= 0) {
        throw new Error('Target amount must be a positive number');
    }

    // Validate period
    const validPeriods = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
    if (!validPeriods.includes(period.toUpperCase())) {
        throw new Error('Period must be WEEKLY, MONTHLY, QUARTERLY, or YEARLY');
    }

    // Parse dates
    let startDate: Date;
    let endDate: Date;

    if (startDateStr && endDateStr) {
        startDate = new Date(startDateStr);
        endDate = new Date(endDateStr);
        
        if (isNaN(startDate.getTime())) throw new Error('Invalid start date format');
        if (isNaN(endDate.getTime())) throw new Error('Invalid end date format');
        if (startDate >= endDate) throw new Error('Start date must be before end date');
    } else {
        // Default to current month if dates not provided
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return {
        name: name.trim(),
        categoryType: categoryType.toUpperCase() as 'INCOME' | 'EXPENSE',
        targetAmount,
        period: period.toUpperCase() as 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
        startDate,
        endDate
    };
}

export async function bulkImportBudgetTargets(csvText: string): Promise<ImportResult> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Parse CSV
        const rows = parseCSV(csvText);
        if (rows.length === 0) {
            throw new Error("CSV file is empty");
        }

        const headers = rows[0]?.map((h: string) => h?.toLowerCase().replace(/\s+/g, '') || '') || [];
        const dataRows = rows.slice(1);

        const result: ImportResult = {
            success: false,
            importedCount: 0,
            errors: [],
            skippedCount: 0
        };

        // Get existing categories to create missing ones
        const existingCategories = await prisma.category.findMany({
            where: { userId: userId },
            select: { name: true, type: true }
        });

        const categoryMap = new Map(
            existingCategories.map(cat => [`${cat.name}-${cat.type}`, cat])
        );

        // Track categories that will be imported
        const importedCategoryNames = new Set<string>();

        // Pre-validate all rows and collect category information
        const validatedRows: Array<{
            data: ParsedBudgetTargetData;
            rowIndex: number;
            originalRow: string[];
        }> = [];

        for (let i = 0; i < dataRows.length; i++) {
            const rowIndex = i + 2;
            const row = dataRows[i];

            if (!row) continue;

            try {
                // Skip empty rows
                if (row.every((cell: string) => !cell || (typeof cell === 'string' && !cell.trim()))) {
                    result.skippedCount++;
                    continue;
                }

                // Validate and transform row
                const budgetTargetData = await validateAndTransformBudgetTargetRow(row, headers, userId);
                
                validatedRows.push({
                    data: budgetTargetData,
                    rowIndex,
                    originalRow: row
                });

                // Track category for creation if needed
                importedCategoryNames.add(budgetTargetData.name);

            } catch (error) {
                result.errors.push({
                    row: rowIndex,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    data: row
                });
            }
        }

        // Create missing categories first
        const categoriesToCreate: Array<{ name: string; type: 'INCOME' | 'EXPENSE' }> = [];
        
        for (const validatedRow of validatedRows) {
            const categoryKey = `${validatedRow.data.name}-${validatedRow.data.categoryType}`;
            if (!categoryMap.has(categoryKey)) {
                categoriesToCreate.push({
                    name: validatedRow.data.name,
                    type: validatedRow.data.categoryType
                });
            }
        }

        // Remove duplicates
        const uniqueCategoriesToCreate = categoriesToCreate.filter((cat, index, self) => 
            index === self.findIndex(c => c.name === cat.name && c.type === cat.type)
        );

        // Create missing categories
        if (uniqueCategoriesToCreate.length > 0) {
            await prisma.category.createMany({
                data: uniqueCategoriesToCreate.map(cat => ({
                    name: cat.name,
                    type: cat.type,
                    userId: userId,
                    includedInBudget: true // Include in budget by default
                })),
                skipDuplicates: true
            });
        }

        // Hide categories that are not in the import file
        await prisma.category.updateMany({
            where: {
                userId: userId,
                name: {
                    notIn: Array.from(importedCategoryNames)
                }
            },
            data: {
                includedInBudget: false
            }
        });

        // Process budget targets in batches
        const BATCH_SIZE = 10;
        const batches: typeof validatedRows[] = [];
        
        for (let i = 0; i < validatedRows.length; i += BATCH_SIZE) {
            batches.push(validatedRows.slice(i, i + BATCH_SIZE));
        }

        // Process each batch
        for (const batch of batches) {
            try {
                await prisma.$transaction(async (tx) => {
                    for (const validatedRow of batch) {
                        // Delete existing budget target for this category if it exists
                        await tx.budgetTarget.deleteMany({
                            where: {
                                userId: userId,
                                name: validatedRow.data.name
                            }
                        });

                        // Create new budget target
                        await tx.budgetTarget.create({
                            data: {
                                name: validatedRow.data.name,
                                targetAmount: validatedRow.data.targetAmount,
                                currentAmount: 0,
                                period: validatedRow.data.period,
                                startDate: validatedRow.data.startDate,
                                endDate: validatedRow.data.endDate,
                                userId: userId,
                                isActive: true
                            }
                        });

                        result.importedCount++;
                    }
                }, {
                    timeout: 30000
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
        return result;

    } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to import budget targets");
    }
}

export async function parseCSVForUI(csvText: string): Promise<string[][]> {
    try {
        return parseCSV(csvText);
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to parse CSV");
    }
}

export async function importCorrectedBudgetTargetRow(rowData: string[], headers: string[]): Promise<any> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        const budgetTargetData = await validateAndTransformBudgetTargetRow(rowData, headers, userId);

        // Create or update category
        const existingCategory = await prisma.category.findFirst({
            where: {
                userId: userId,
                name: budgetTargetData.name,
                type: budgetTargetData.categoryType
            }
        });

        if (existingCategory) {
            await prisma.category.update({
                where: { id: existingCategory.id },
                data: { includedInBudget: true }
            });
        } else {
            await prisma.category.create({
                data: {
                    name: budgetTargetData.name,
                    type: budgetTargetData.categoryType,
                    userId: userId,
                    includedInBudget: true
                }
            });
        }

        // Delete existing budget target for this category if it exists
        await prisma.budgetTarget.deleteMany({
            where: {
                userId: userId,
                name: budgetTargetData.name
            }
        });

        // Create new budget target
        const budgetTarget = await prisma.budgetTarget.create({
            data: {
                name: budgetTargetData.name,
                targetAmount: budgetTargetData.targetAmount,
                currentAmount: 0,
                period: budgetTargetData.period,
                startDate: budgetTargetData.startDate,
                endDate: budgetTargetData.endDate,
                userId: userId,
                isActive: true
            }
        });

        return budgetTarget;
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to import corrected budget target row");
    }
}

export async function bulkDeleteAllBudgetTargets(): Promise<{ success?: boolean, deletedCount?: number, error?: string }> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Get count of budget targets before deletion for confirmation
        const count = await prisma.budgetTarget.count({
            where: {
                userId: userId
            }
        });

        if (count === 0) {
            return { success: true, deletedCount: 0 };
        }

        // Delete all budget targets for the user
        const deleteResult = await prisma.budgetTarget.deleteMany({
            where: {
                userId: userId
            }
        });

        return { 
            success: true, 
            deletedCount: deleteResult.count 
        };
    } catch (error) {
        console.error("Error bulk deleting budget targets:", error);
        return { error: "Failed to delete budget targets" };
    }
}
