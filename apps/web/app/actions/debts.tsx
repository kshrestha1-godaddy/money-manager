"use server";

import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { DebtInterface } from "../types/debts";

// Helper function to get user ID from session
function getUserIdFromSession(sessionUserId: string): number {
    // If it's a very large number (OAuth provider), take last 5 digits
    if (sessionUserId.length > 5) {
        return parseInt(sessionUserId.slice(-5));
    }
    // Otherwise parse normally
    return parseInt(sessionUserId);
}


export async function getUserDebts(): Promise<{ data?: DebtInterface[], error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return { error: "Unauthorized" };
        }

        const userId = getUserIdFromSession(session.user.id);
        console.log("Original session ID:", session.user.id);
        console.log("Converted userId:", userId);
        
        // Validate that userId is a valid number
        if (isNaN(userId)) {
            console.error("Invalid userId:", userId);
            return { error: "Invalid user ID" };
        }
        
        // First verify user exists
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });

        console.log("User:", user);

        if (!user) {
            // If user doesn't exist, create them (for OAuth users)
            if (session.user.email && session.user.name) {
                console.log("Creating new user for OAuth login");
                const newUser = await prisma.user.create({
                    data: {
                        id: userId,
                        email: session.user.email,
                        name: session.user.name,
                        number: `oauth_${userId}`, // Temporary number for OAuth users
                        password: "oauth_user", // Placeholder password for OAuth users
                    },
                });
                console.log("Created new user:", newUser);
                
                // Return empty debts array for new user
                return { data: [] };
            } else {
                return { error: "User not found in database and insufficient data to create user" };
            }
        }
        
        // Get debts for the verified user
        const debts = await prisma.debt.findMany({
            where: {
                userId: userId,
            },
            include: {
                repayments: true,
            },
            orderBy: {
                lentDate: 'desc',
            },
        });
        
        // Ensure debts is an array
        if (!Array.isArray(debts)) {
            console.error("Debts query did not return an array:", debts);
            return { error: "Invalid debts data" };
        }
        
        // Convert Decimal amounts to number to prevent serialization issues
        const transformedDebts = debts.map(debt => {
            try {
                const amount = parseFloat(debt.amount.toString());
                const interestRate = parseFloat(debt.interestRate.toString());
                
                // Validate converted numbers
                if (!isFinite(amount) || isNaN(amount)) {
                    throw new Error(`Invalid debt amount: ${debt.amount}`);
                }
                if (!isFinite(interestRate) || isNaN(interestRate)) {
                    throw new Error(`Invalid interest rate: ${debt.interestRate}`);
                }
                
                return {
                    ...debt,
                    amount,
                    interestRate,
                    lentDate: new Date(debt.lentDate),
                    dueDate: debt.dueDate ? new Date(debt.dueDate) : undefined,
                    createdAt: new Date(debt.createdAt),
                    updatedAt: new Date(debt.updatedAt),
                    repayments: debt.repayments?.map(repayment => {
                        const repaymentAmount = parseFloat(repayment.amount.toString());
                        if (!isFinite(repaymentAmount) || isNaN(repaymentAmount)) {
                            throw new Error(`Invalid repayment amount: ${repayment.amount}`);
                        }
                        return {
                            ...repayment,
                            amount: repaymentAmount,
                            repaymentDate: new Date(repayment.repaymentDate),
                            createdAt: new Date(repayment.createdAt),
                            updatedAt: new Date(repayment.updatedAt),
                        };
                    }),
                };
            } catch (transformError) {
                console.error("Error transforming debt data:", transformError);
                throw new Error(`Data transformation failed for debt ID ${debt.id}`);
            }
        }) as DebtInterface[];

        return { data: transformedDebts };
    } catch (error) {
        console.error("Error fetching user debts:", error);
        return { error: "Failed to fetch debts" };
    }
}

export async function createDebt(debt: Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>) {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);
    let user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });

    if (!user) {
        // If user doesn't exist, create them (for OAuth users)
        if (session.user.email && session.user.name) {
            console.log("Creating new user for OAuth login");
            user = await prisma.user.create({
                data: {
                    id: userId,
                    email: session.user.email,
                    name: session.user.name,
                    number: `oauth_${userId}`, // Temporary number for OAuth users
                    password: "oauth_user", // Placeholder password for OAuth users
                },
            });
            console.log("Created new user:", user);
        } else {
            throw new Error("User not found in database and insufficient data to create user");
        }
    }

    const newDebt = await prisma.debt.create({
        data: {
            ...debt,
            userId: user.id,
        },
        include: {
            repayments: true,
        },
    });
    
    // Convert Decimal amounts to number to prevent serialization issues
    return {
        ...newDebt,
        amount: parseFloat(newDebt.amount.toString()),
        interestRate: parseFloat(newDebt.interestRate.toString()),
        lentDate: new Date(newDebt.lentDate),
        dueDate: newDebt.dueDate ? new Date(newDebt.dueDate) : undefined,
        createdAt: new Date(newDebt.createdAt),
        updatedAt: new Date(newDebt.updatedAt),
        repayments: newDebt.repayments?.map(repayment => ({
            ...repayment,
            amount: parseFloat(repayment.amount.toString()),
            repaymentDate: new Date(repayment.repaymentDate),
            createdAt: new Date(repayment.createdAt),
            updatedAt: new Date(repayment.updatedAt),
        })),
    } as DebtInterface;
}

export async function updateDebt(id: number, debt: Partial<Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>>) {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    // Verify the debt belongs to the user
    const existingDebt = await prisma.debt.findFirst({
        where: {
            id,
            userId: userId,
        },
    });

    if (!existingDebt) {
        throw new Error("Debt not found or unauthorized");
    }

    const updatedDebt = await prisma.debt.update({
        where: { id },
        data: debt,
        include: {
            repayments: true,
        },
    });
    
    // Convert Decimal amounts to number to prevent serialization issues
    return {
        ...updatedDebt,
        amount: parseFloat(updatedDebt.amount.toString()),
        interestRate: parseFloat(updatedDebt.interestRate.toString()),
        lentDate: new Date(updatedDebt.lentDate),
        dueDate: updatedDebt.dueDate ? new Date(updatedDebt.dueDate) : undefined,
        createdAt: new Date(updatedDebt.createdAt),
        updatedAt: new Date(updatedDebt.updatedAt),
        repayments: updatedDebt.repayments?.map(repayment => ({
            ...repayment,
            amount: parseFloat(repayment.amount.toString()),
            repaymentDate: new Date(repayment.repaymentDate),
            createdAt: new Date(repayment.createdAt),
            updatedAt: new Date(repayment.updatedAt),
        })),
    } as DebtInterface;
}

export async function deleteDebt(id: number) {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    // Verify the debt belongs to the user
    const existingDebt = await prisma.debt.findFirst({
        where: {
            id,
            userId: userId,
        },
    });

    if (!existingDebt) {
        throw new Error("Debt not found or unauthorized");
    }

    await prisma.debt.delete({
        where: { id },
    });
    
    return { success: true };
}

export async function addRepayment(debtId: number, amount: number, notes?: string) {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    // Verify the debt belongs to the user
    const existingDebt = await prisma.debt.findFirst({
        where: {
            id: debtId,
            userId: userId,
        },
        include: {
            repayments: true,
        },
    });

    if (!existingDebt) {
        throw new Error("Debt not found or unauthorized");
    }

    // Calculate total repayments
    const totalRepayments = existingDebt.repayments.reduce((sum, repayment) => {
        return sum + parseFloat(repayment.amount.toString());
    }, 0);

    const newTotalRepayments = totalRepayments + amount;
    const originalAmount = parseFloat(existingDebt.amount.toString());

    // Create the repayment
    const repayment = await prisma.debtRepayment.create({
        data: {
            amount,
            notes,
            debtId,
        },
    });

    // Update debt status based on repayments
    let newStatus = existingDebt.status;
    if (newTotalRepayments >= originalAmount) {
        newStatus = 'FULLY_PAID';
    } else if (newTotalRepayments > 0) {
        newStatus = 'PARTIALLY_PAID';
    }

    // Update the debt status
    await prisma.debt.update({
        where: { id: debtId },
        data: { status: newStatus },
    });

    return {
        ...repayment,
        amount: parseFloat(repayment.amount.toString()),
        repaymentDate: new Date(repayment.repaymentDate),
        createdAt: new Date(repayment.createdAt),
        updatedAt: new Date(repayment.updatedAt),
    };
} 