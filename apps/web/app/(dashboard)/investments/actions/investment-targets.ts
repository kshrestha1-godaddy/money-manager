"use server";

import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { InvestmentTarget, InvestmentTargetFormData, InvestmentTargetProgress } from "../../../types/investments";
import { revalidatePath } from "next/cache";
import { getUserIdFromSession } from "../../../utils/auth";

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