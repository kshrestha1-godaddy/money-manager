"use server";

import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { InvestmentInterface } from "../types/investments";

// Helper function to get user ID from session
function getUserIdFromSession(sessionUserId: string): number {
    // If it's a very large number (OAuth provider), take last 5 digits
    if (sessionUserId.length > 5) {
        return parseInt(sessionUserId.slice(-5));
    }
    // Otherwise parse normally
    return parseInt(sessionUserId);
}

export async function getUserInvestments(): Promise<{ data?: InvestmentInterface[], error?: string }> {
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
                
                // Return empty investments array for new user
                return { data: [] };
            } else {
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
            },
            orderBy: {
                purchaseDate: 'desc',
            },
        });
        
        // Ensure investments is an array
        if (!Array.isArray(investments)) {
            console.error("Investments query did not return an array:", investments);
            return { error: "Invalid investments data" };
        }
        
        // Convert Decimal amounts to number to prevent serialization issues
        const transformedInvestments = investments.map(investment => {
            try {
                const quantity = parseFloat(investment.quantity.toString());
                const purchasePrice = parseFloat(investment.purchasePrice.toString());
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
                    ...investment,
                    quantity,
                    purchasePrice,
                    currentPrice,
                    purchaseDate: new Date(investment.purchaseDate),
                    createdAt: new Date(investment.createdAt),
                    updatedAt: new Date(investment.updatedAt),
                    account: transformedAccount,
                };
            } catch (transformError) {
                console.error("Error transforming investment data:", transformError);
                throw new Error(`Data transformation failed for investment ID ${investment.id}`);
            }
        }) as InvestmentInterface[];

        return { data: transformedInvestments };
    } catch (error) {
        console.error("Error fetching user investments:", error);
        return { error: "Failed to fetch investments" };
    }
}

export async function createInvestment(investment: Omit<InvestmentInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
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

    const newInvestment = await prisma.investment.create({
        data: {
            ...investment,
            userId: user.id,
        },
        include: {
            account: true,
        },
    });
    
    // Convert Decimal amounts to number to prevent serialization issues
    // Transform nested account data if it exists
    const transformedAccount = newInvestment.account ? {
        ...newInvestment.account,
        balance: parseFloat(newInvestment.account.balance.toString()),
        accountOpeningDate: new Date(newInvestment.account.accountOpeningDate),
        createdAt: new Date(newInvestment.account.createdAt),
        updatedAt: new Date(newInvestment.account.updatedAt),
    } : newInvestment.account;
    
    return {
        ...newInvestment,
        quantity: parseFloat(newInvestment.quantity.toString()),
        purchasePrice: parseFloat(newInvestment.purchasePrice.toString()),
        currentPrice: parseFloat(newInvestment.currentPrice.toString()),
        purchaseDate: new Date(newInvestment.purchaseDate),
        createdAt: new Date(newInvestment.createdAt),
        updatedAt: new Date(newInvestment.updatedAt),
        account: transformedAccount,
    } as InvestmentInterface;
}

export async function updateInvestment(id: number, investment: Partial<Omit<InvestmentInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    // Verify the investment belongs to the user
    const existingInvestment = await prisma.investment.findFirst({
        where: {
            id: id,
            userId: userId,
        },
    });

    if (!existingInvestment) {
        throw new Error("Investment not found or unauthorized");
    }

    const updatedInvestment = await prisma.investment.update({
        where: {
            id: id,
        },
        data: investment,
        include: {
            account: true,
        },
    });
    
    // Convert Decimal amounts to number to prevent serialization issues
    // Transform nested account data if it exists
    const transformedAccount = updatedInvestment.account ? {
        ...updatedInvestment.account,
        balance: parseFloat(updatedInvestment.account.balance.toString()),
        accountOpeningDate: new Date(updatedInvestment.account.accountOpeningDate),
        createdAt: new Date(updatedInvestment.account.createdAt),
        updatedAt: new Date(updatedInvestment.account.updatedAt),
    } : updatedInvestment.account;
    
    return {
        ...updatedInvestment,
        quantity: parseFloat(updatedInvestment.quantity.toString()),
        purchasePrice: parseFloat(updatedInvestment.purchasePrice.toString()),
        currentPrice: parseFloat(updatedInvestment.currentPrice.toString()),
        purchaseDate: new Date(updatedInvestment.purchaseDate),
        createdAt: new Date(updatedInvestment.createdAt),
        updatedAt: new Date(updatedInvestment.updatedAt),
        account: transformedAccount,
    } as InvestmentInterface;
}

export async function deleteInvestment(id: number) {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    // Verify the investment belongs to the user
    const existingInvestment = await prisma.investment.findFirst({
        where: {
            id: id,
            userId: userId,
        },
    });

    if (!existingInvestment) {
        throw new Error("Investment not found or unauthorized");
    }

    await prisma.investment.delete({
        where: {
            id: id,
        },
    });
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
        console.error("Error fetching user accounts:", error);
        return { error: "Failed to fetch accounts" };
    }
} 