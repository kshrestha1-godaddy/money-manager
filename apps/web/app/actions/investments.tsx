"use server";

import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { InvestmentInterface } from "../types/investments";
import { revalidatePath } from "next/cache";

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
                    id: investment.id,
                    name: investment.name,
                    type: investment.type,
                    symbol: investment.symbol,
                    quantity,
                    purchasePrice,
                    currentPrice,
                    purchaseDate: new Date(investment.purchaseDate),
                    accountId: investment.accountId,
                    userId: investment.userId,
                    notes: investment.notes,
                    createdAt: new Date(investment.createdAt),
                    updatedAt: new Date(investment.updatedAt),
                    account: transformedAccount,
                    // Handle fixed deposit specific fields
                    interestRate: investment.interestRate ? parseFloat(investment.interestRate.toString()) : undefined,
                    maturityDate: investment.maturityDate ? new Date(investment.maturityDate) : undefined,
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

export async function createInvestment(investment: Omit<InvestmentInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'account'>) {
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

    // Use a transaction to ensure both investment creation and account balance are updated atomically
    const result = await prisma.$transaction(async (tx) => {
        // Validate account balance
        const account = await tx.account.findUnique({
            where: { id: investment.accountId },
            select: { balance: true, bankName: true }
        });

        if (!account) {
            throw new Error("Selected account not found");
        }

        const totalInvestmentAmount = investment.type === 'FIXED_DEPOSIT' ? investment.purchasePrice : investment.quantity * investment.purchasePrice;
        const currentBalance = parseFloat(account.balance.toString());
        
        if (currentBalance < totalInvestmentAmount) {
            throw new Error(`Insufficient balance in ${account.bankName}. Available: ${currentBalance}, Required: ${totalInvestmentAmount}`);
        }

        // Create the investment
        const newInvestment = await tx.investment.create({
            data: {
                ...investment,
                userId: user.id,
            },
            include: {
                account: true,
            },
        });

        // Update the account balance (decrease by investment amount)
        await tx.account.update({
            where: { id: investment.accountId },
            data: {
                balance: {
                    decrement: totalInvestmentAmount
                }
            }
        });

        return newInvestment;
    });

    // Revalidate related pages
    revalidatePath("/(dashboard)/investments");
    revalidatePath("/(dashboard)/accounts");
    
    // Convert Decimal amounts to number to prevent serialization issues
    // Transform nested account data if it exists
    const transformedAccount = result.account ? {
        ...result.account,
        balance: parseFloat(result.account.balance.toString()),
        accountOpeningDate: new Date(result.account.accountOpeningDate),
        createdAt: new Date(result.account.createdAt),
        updatedAt: new Date(result.account.updatedAt),
    } : result.account;
    
    return {
        id: result.id,
        name: result.name,
        type: result.type,
        symbol: result.symbol,
        quantity: parseFloat(result.quantity.toString()),
        purchasePrice: parseFloat(result.purchasePrice.toString()),
        currentPrice: parseFloat(result.currentPrice.toString()),
        purchaseDate: new Date(result.purchaseDate),
        accountId: result.accountId,
        userId: result.userId,
        notes: result.notes,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt),
        account: transformedAccount,
        // Handle fixed deposit specific fields
        interestRate: result.interestRate ? parseFloat(result.interestRate.toString()) : undefined,
        maturityDate: result.maturityDate ? new Date(result.maturityDate) : undefined,
    } as InvestmentInterface;
}

export async function updateInvestment(id: number, investment: Partial<Omit<InvestmentInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'account'>>) {
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

    // Use a transaction to handle investment update and account balance changes
    const result = await prisma.$transaction(async (tx) => {
        // Calculate old and new investment amounts
        const oldQuantity = parseFloat(existingInvestment.quantity.toString());
        const oldPurchasePrice = parseFloat(existingInvestment.purchasePrice.toString());
        const oldAmount = existingInvestment.type === 'FIXED_DEPOSIT' ? oldPurchasePrice : oldQuantity * oldPurchasePrice;
        
        const newQuantity = investment.quantity !== undefined ? investment.quantity : oldQuantity;
        const newPurchasePrice = investment.purchasePrice !== undefined ? investment.purchasePrice : oldPurchasePrice;
        const newType = investment.type !== undefined ? investment.type : existingInvestment.type;
        const newAmount = newType === 'FIXED_DEPOSIT' ? newPurchasePrice : newQuantity * newPurchasePrice;
        
        const oldAccountId = existingInvestment.accountId;
        const newAccountId = investment.accountId !== undefined ? investment.accountId : oldAccountId;

        // Validate account balance for changes
        if (newAccountId) {
            const account = await tx.account.findUnique({
                where: { id: newAccountId },
                select: { balance: true, bankName: true }
            });

            if (!account) {
                throw new Error("Selected account not found");
            }

            const currentBalance = parseFloat(account.balance.toString());

            // If changing to a different account, check if new account has sufficient balance for full amount
            if (oldAccountId !== newAccountId) {
                if (currentBalance < newAmount) {
                    throw new Error(`Insufficient balance in ${account.bankName}. Available: ${currentBalance}, Required: ${newAmount}`);
                }
            }
            // If increasing amount on same account, check if there's sufficient balance for the increase
            else if (newAmount > oldAmount) {
                const amountIncrease = newAmount - oldAmount;
                if (currentBalance < amountIncrease) {
                    throw new Error(`Insufficient balance to increase investment by ${amountIncrease} in ${account.bankName}. Available: ${currentBalance}`);
                }
            }
        }

        // Update the investment
        const updatedInvestment = await tx.investment.update({
            where: { id },
            data: investment,
            include: {
                account: true,
            },
        });

        // Handle account balance changes
        // If amount changed and same account
        if ((investment.quantity !== undefined || investment.purchasePrice !== undefined) && oldAccountId === newAccountId && oldAccountId) {
            const amountDifference = newAmount - oldAmount;
            // For investments: if amount increased, decrease balance more; if decreased, increase balance
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
        else if (investment.accountId !== undefined && oldAccountId !== newAccountId) {
            // Add back to old account (investment no longer from that account)
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

        return updatedInvestment;
    });

    // Revalidate related pages
    revalidatePath("/(dashboard)/investments");
    revalidatePath("/(dashboard)/accounts");
    
    // Convert Decimal amounts to number to prevent serialization issues
    // Transform nested account data if it exists
    const transformedAccount = result.account ? {
        ...result.account,
        balance: parseFloat(result.account.balance.toString()),
        accountOpeningDate: new Date(result.account.accountOpeningDate),
        createdAt: new Date(result.account.createdAt),
        updatedAt: new Date(result.account.updatedAt),
    } : result.account;
    
    return {
        id: result.id,
        name: result.name,
        type: result.type,
        symbol: result.symbol,
        quantity: parseFloat(result.quantity.toString()),
        purchasePrice: parseFloat(result.purchasePrice.toString()),
        currentPrice: parseFloat(result.currentPrice.toString()),
        purchaseDate: new Date(result.purchaseDate),
        accountId: result.accountId,
        userId: result.userId,
        notes: result.notes,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt),
        account: transformedAccount,
        // Handle fixed deposit specific fields
        interestRate: result.interestRate ? parseFloat(result.interestRate.toString()) : undefined,
        maturityDate: result.maturityDate ? new Date(result.maturityDate) : undefined,
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

    // Use a transaction to ensure both investment deletion and account balance update
    await prisma.$transaction(async (tx) => {
        // Calculate investment amount to return to account
        const quantity = parseFloat(existingInvestment.quantity.toString());
        const purchasePrice = parseFloat(existingInvestment.purchasePrice.toString());
        const investmentAmount = existingInvestment.type === 'FIXED_DEPOSIT' ? purchasePrice : quantity * purchasePrice;

        // Delete the investment
        await tx.investment.delete({
            where: { id }
        });

        // Update the account balance (increase by investment amount since investment is removed)
        await tx.account.update({
            where: { id: existingInvestment.accountId },
            data: {
                balance: {
                    increment: investmentAmount
                }
            }
        });
    });

    // Revalidate related pages
    revalidatePath("/(dashboard)/investments");
    revalidatePath("/(dashboard)/accounts");
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