"use server";

import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { InvestmentTarget, InvestmentTargetFormData, InvestmentTargetProgress } from "../../../types/investments";
import { revalidatePath } from "next/cache";
import { getUserIdFromSession } from "../../../utils/auth";
import { parseInvestmentTargetsCSV, ParsedInvestmentTargetData } from "../../../utils/csvImportInvestmentTargets";

export async function getInvestmentTargets(): Promise<{ data?: InvestmentTarget[], error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return { error: "Unauthorized" };
        }

        const userId = getUserIdFromSession(session.user.id);
        
        if (isNaN(userId)) {
            return { error: "Invalid user ID" };
        }

        const targets = await prisma.investmentTarget.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                investmentType: 'asc',
            },
        });

        // Convert Decimal to number for client component compatibility
        const serializedTargets = targets.map(target => ({
            ...target,
            targetAmount: parseFloat(target.targetAmount.toString()),
            targetCompletionDate: target.targetCompletionDate || undefined,
        })) as InvestmentTarget[];

        return { data: serializedTargets };
    } catch (error) {
        console.error("Error fetching investment targets:", error);
        return { error: "Failed to fetch investment targets" };
    }
}

const formatInvestmentType = (type: string): string => {
    switch (type) {
        case 'STOCKS': return 'Stocks';
        case 'CRYPTO': return 'Cryptocurrency';
        case 'MUTUAL_FUNDS': return 'Mutual Funds';
        case 'BONDS': return 'Bonds';
        case 'REAL_ESTATE': return 'Real Estate';
        case 'GOLD': return 'Gold';
        case 'FIXED_DEPOSIT': return 'Fixed Deposit';
        case 'EMERGENCY_FUND': return 'Emergency Fund';
        case 'MARRIAGE': return 'Marriage';
        case 'VACATION': return 'Vacation';
        case 'PROVIDENT_FUNDS': return 'Provident Funds';
        case 'SAFE_KEEPINGS': return 'Safe Keepings';
        case 'OTHER': return 'Other';
        default: return type;
    }
};

export async function createInvestmentTarget(data: InvestmentTargetFormData): Promise<InvestmentTarget> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        if (isNaN(userId)) {
            throw new Error("Invalid user ID");
        }

        // Check if target already exists for this investment type
        const existingTarget = await prisma.investmentTarget.findFirst({
            where: {
                userId: userId,
                investmentType: data.investmentType,
            },
        });

        if (existingTarget) {
            // const { formatInvestmentType } = await import("../constants");
            throw new Error(`A target for ${formatInvestmentType(data.investmentType)} already exists. Please edit the existing target instead.`);
        }

        const target = await prisma.investmentTarget.create({
            data: {
                ...data,
                userId: userId,
            },
        });

        revalidatePath("/(dashboard)/investments");
        
        // Convert Decimal to number for client component compatibility
        return {
            ...target,
            targetAmount: parseFloat(target.targetAmount.toString()),
            targetCompletionDate: target.targetCompletionDate || undefined,
        } as InvestmentTarget;
    } catch (error) {
        console.error("Error creating investment target:", error);
        throw error;
    }
}

export async function updateInvestmentTarget(id: number, data: Partial<InvestmentTargetFormData>): Promise<InvestmentTarget> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Verify the target belongs to the user
        const existingTarget = await prisma.investmentTarget.findFirst({
            where: {
                id,
                userId: userId,
            },
        });

        if (!existingTarget) {
            throw new Error("Investment target not found or unauthorized");
        }

        const updatedTarget = await prisma.investmentTarget.update({
            where: { id },
            data: data,
        });

        revalidatePath("/(dashboard)/investments");

        // Convert Decimal to number for client component compatibility
        return {
            ...updatedTarget,
            targetAmount: parseFloat(updatedTarget.targetAmount.toString()),
            targetCompletionDate: updatedTarget.targetCompletionDate || undefined,
        } as InvestmentTarget;
    } catch (error) {
        console.error("Error updating investment target:", error);
        throw error;
    }
}

export async function deleteInvestmentTarget(id: number): Promise<void> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Verify the target belongs to the user
        const existingTarget = await prisma.investmentTarget.findFirst({
            where: {
                id,
                userId: userId,
            },
        });

        if (!existingTarget) {
            throw new Error("Investment target not found or unauthorized");
        }

        await prisma.investmentTarget.delete({
            where: { id },
        });

        revalidatePath("/(dashboard)/investments");
    } catch (error) {
        console.error("Error deleting investment target:", error);
        throw error;
    }
}

export async function getInvestmentTargetProgress(): Promise<{ data?: InvestmentTargetProgress[], error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return { error: "Unauthorized" };
        }

        const userId = getUserIdFromSession(session.user.id);
        
        if (isNaN(userId)) {
            return { error: "Invalid user ID" };
        }

        // Get all targets
        const targets = await prisma.investmentTarget.findMany({
            where: {
                userId: userId,
            },
        });

        // Get current investment amounts by type
        const investments = await prisma.investment.findMany({
            where: {
                userId: userId,
            },
        });

        // Calculate current amounts by investment type
        const currentAmountsByType = investments.reduce((acc, investment) => {
            const currentValue = investment.type === 'FIXED_DEPOSIT' || investment.type === 'PROVIDENT_FUNDS' || investment.type === 'SAFE_KEEPINGS'
                ? parseFloat(investment.currentPrice.toString())
                : parseFloat(investment.quantity.toString()) * parseFloat(investment.currentPrice.toString());
            
            acc[investment.type] = (acc[investment.type] || 0) + currentValue;
            return acc;
        }, {} as Record<string, number>);

        // Create progress data
        const progressData: InvestmentTargetProgress[] = targets.map(target => {
            const currentAmount = currentAmountsByType[target.investmentType] || 0;
            const targetAmount = parseFloat(target.targetAmount.toString());
            const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
            
            // Calculate date-related fields
            let daysRemaining: number | undefined;
            let isOverdue: boolean | undefined;
            
            if (target.targetCompletionDate) {
                const targetDate = new Date(target.targetCompletionDate);
                const currentDate = new Date();
                const timeDifference = targetDate.getTime() - currentDate.getTime();
                daysRemaining = Math.ceil(timeDifference / (1000 * 3600 * 24));
                isOverdue = daysRemaining < 0;
            }
            
            return {
                investmentType: target.investmentType,
                targetAmount: targetAmount,
                currentAmount,
                progress: Math.min(progress, 100), // Cap at 100%
                isComplete: progress >= 100,
                targetCompletionDate: target.targetCompletionDate || undefined,
                nickname: target.nickname || undefined,
                daysRemaining,
                isOverdue,
            };
        });

        // Sort by progress percentage in descending order (highest % first)
        const sortedProgressData = progressData.sort((a, b) => b.progress - a.progress);

        return { data: sortedProgressData };
    } catch (error) {
        console.error("Error calculating investment target progress:", error);
        return { error: "Failed to calculate investment target progress" };
    }
}

/**
 * Bulk import investment targets from CSV
 */
export async function bulkImportInvestmentTargets(file: File): Promise<{
    success: number;
    errors: Array<{ row: number; error: string }>;
    importedCount: number;
}> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        const csvContent = await file.text();
        const parseResult = parseInvestmentTargetsCSV(csvContent);
        
        if (!parseResult.success || !parseResult.data) {
            return {
                success: 0,
                errors: parseResult.errors,
                importedCount: 0
            };
        }

        const validTargets = parseResult.data;
        let importedCount = 0;
        const errors: Array<{ row: number; error: string }> = [...parseResult.errors];

        // Process targets in batches to avoid timeout
        for (const targetData of validTargets) {
            try {
                // Check if target already exists for this investment type
                const existingTarget = await prisma.investmentTarget.findFirst({
                    where: {
                        userId: userId,
                        investmentType: targetData.investmentType,
                    },
                });

                if (existingTarget) {
                    // Update existing target instead of creating new one
                    await prisma.investmentTarget.update({
                        where: { id: existingTarget.id },
                        data: {
                            targetAmount: targetData.targetAmount,
                            targetCompletionDate: targetData.targetCompletionDate,
                            nickname: targetData.nickname,
                        },
                    });
                } else {
                    // Create new target
                    await prisma.investmentTarget.create({
                        data: {
                            ...targetData,
                            userId: userId,
                        },
                    });
                }
                
                importedCount++;
            } catch (error) {
                errors.push({
                    row: validTargets.indexOf(targetData) + 2, // Account for header row
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        revalidatePath("/(dashboard)/investments");

        return {
            success: importedCount,
            errors,
            importedCount
        };
    } catch (error) {
        console.error("Error importing investment targets:", error);
        throw error;
    }
}

/**
 * Parse CSV for UI preview (compatible with unified modal)
 */
export async function parseInvestmentTargetsCSVForUI(csvText: string): Promise<string[][]> {
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
 * Import a corrected target row (compatible with unified modal)
 */
export async function importCorrectedInvestmentTargetRow(rowData: string[], headers: string[]): Promise<any> {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const userId = getUserIdFromSession(session.user.id);

    // Create a temporary CSV string from the corrected row data
    const csvString = [headers, rowData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    
    const parseResult = parseInvestmentTargetsCSV(csvString);
    
    if (!parseResult.success || !parseResult.data || parseResult.data.length === 0) {
        throw new Error("Failed to parse corrected row data");
    }

    const targetData = parseResult.data[0];
    if (!targetData) {
        throw new Error("No valid target data found in corrected row");
    }

    // Check if target already exists for this investment type
    const existingTarget = await prisma.investmentTarget.findFirst({
        where: {
            userId: userId,
            investmentType: targetData.investmentType,
        },
    });

    let result;
    if (existingTarget) {
        // Update existing target
        result = await prisma.investmentTarget.update({
            where: { id: existingTarget.id },
            data: {
                targetAmount: targetData.targetAmount,
                targetCompletionDate: targetData.targetCompletionDate,
                nickname: targetData.nickname,
            },
        });
    } else {
        // Create new target
        result = await prisma.investmentTarget.create({
            data: {
                investmentType: targetData.investmentType,
                targetAmount: targetData.targetAmount,
                targetCompletionDate: targetData.targetCompletionDate,
                nickname: targetData.nickname,
                userId: userId,
            },
        });
    }
    
    revalidatePath("/(dashboard)/investments");
    return result;
}

/**
 * Bulk delete all investment targets for the current user
 */
export async function bulkDeleteAllInvestmentTargets(): Promise<{ deletedCount: number }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Delete all targets for this user
        const deleteResult = await prisma.investmentTarget.deleteMany({
            where: {
                userId: userId,
            },
        });

        revalidatePath("/(dashboard)/investments");

        return { deletedCount: deleteResult.count };
    } catch (error) {
        console.error("Error bulk deleting investment targets:", error);
        throw error;
    }
}