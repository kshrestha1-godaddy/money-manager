"use server";

import prisma from "@repo/db/client";
import { BudgetTarget } from "../types/financial";
import { BudgetComparisonData, BudgetTargetFormData } from "../hooks/useBudgetTracking";
import { getAuthenticatedSession, getUserIdFromSession } from "../utils/auth";

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

        // Get all user's categories that are included in budget (both expense and income)
        const categories = await prisma.category.findMany({
            where: {
                userId: userId,
                includedInBudget: true,
            },
        });

        // Get all expense and income data with their spending/earning data
        const [expenses, incomes] = await Promise.all([
            prisma.expense.findMany({
                where: {
                    userId: userId,
                    date: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1), // Last 12 months
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
                        gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1), // Last 12 months
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
            
            // Calculate actual spending/earning statistics
            const totalAmount = relevantTransactions.reduce((sum, transaction) => 
                sum + parseFloat(transaction.amount.toString()), 0
            );
            const transactionCount = relevantTransactions.length;
            const monthsSpan = 12; // Using 12 months for calculation
            const monthlyAverage = totalAmount / monthsSpan;

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
            const variance = monthlyAverage - monthlySpend;
            const variancePercentage = monthlySpend > 0 ? (variance / monthlySpend) * 100 : 
                                     (monthlyAverage > 0 ? 100 : 0);
            
            let status: 'over' | 'under' | 'on-track' = 'on-track';
            if (monthlySpend === 0) {
                status = monthlyAverage > 0 ? 'over' : 'on-track';
            } else if (Math.abs(variancePercentage) > 10) {
                status = variance > 0 ? 'over' : 'under';
            }

            budgetComparison.push({
                categoryName,
                categoryType: categoryData.categoryType,
                actualSpending: {
                    monthlyAverage,
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
