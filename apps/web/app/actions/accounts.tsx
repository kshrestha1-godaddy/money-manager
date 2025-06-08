"use server";

import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { AccountInterface } from "../types/accounts";

// Helper function to get user ID from session
function getUserIdFromSession(sessionUserId: string): number {
    // If it's a very large number (OAuth provider), take last 10 digits
    if (sessionUserId.length > 5) {
        return parseInt(sessionUserId.slice(-5));
    }
    // Otherwise parse normally
    return parseInt(sessionUserId);
}


export async function getAllAccounts(): Promise<AccountInterface[]> {
    const accounts = await prisma.account.findMany();
    
    // Convert Decimal balance to number to prevent serialization issues
    return accounts.map(account => ({
        ...account,
        balance: account.balance ? parseFloat(account.balance.toString()) : undefined,
        accountOpeningDate: new Date(account.accountOpeningDate),
        createdAt: new Date(account.createdAt),
        updatedAt: new Date(account.updatedAt)
    }));
}


export async function getUserAccounts() {
    
    const session = await getServerSession(authOptions);
    if (!session) {
        return { error: "Unauthorized" };
    }

    const userId = getUserIdFromSession(session.user.id);
    console.log("Original session ID:", session.user.id);
    console.log("Converted userId:", userId);
    
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });

    // console.log("Found user:", user);

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
            
            // Return empty accounts array for new user
            return [];
        } else {
            return { error: "User not found in database and insufficient data to create user" };
        }
    }

    const accounts = await prisma.account.findMany({
        where: {
            userId: user.id,
        },
    });
    
    // Convert Decimal balance to number to prevent serialization issues
    return accounts.map(account => ({
        ...account,
        balance: account.balance ? parseFloat(account.balance.toString()) : undefined,
        accountOpeningDate: new Date(account.accountOpeningDate),
        createdAt: new Date(account.createdAt),
        updatedAt: new Date(account.updatedAt)
    })) as AccountInterface[];
}



export async function createAccount(account: Omit<AccountInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });

    if (!user) {
        throw new Error("User not found");
    }

    const newAccount = await prisma.account.create({
        data: {
            ...account,
            userId: user.id,
            balance: account.balance || 0,
        },
    });
    
    // Convert Decimal balance to number to prevent serialization issues
    return {
        ...newAccount,
        balance: newAccount.balance ? parseFloat(newAccount.balance.toString()) : undefined,
        accountOpeningDate: new Date(newAccount.accountOpeningDate),
        createdAt: new Date(newAccount.createdAt),
        updatedAt: new Date(newAccount.updatedAt)
    } as AccountInterface;
}

export async function updateAccount(id: number, account: Partial<Omit<AccountInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    // Verify the account belongs to the user
    const existingAccount = await prisma.account.findFirst({
        where: {
            id,
            userId: userId,
        },
    });

    if (!existingAccount) {
        throw new Error("Account not found or unauthorized");
    }

    const updatedAccount = await prisma.account.update({
        where: { id },
        data: account,
    });
    
    // Convert Decimal balance to number to prevent serialization issues
    return {
        ...updatedAccount,
        balance: updatedAccount.balance ? parseFloat(updatedAccount.balance.toString()) : undefined,
        accountOpeningDate: new Date(updatedAccount.accountOpeningDate),
        createdAt: new Date(updatedAccount.createdAt),
        updatedAt: new Date(updatedAccount.updatedAt)
    } as AccountInterface;
}

export async function deleteAccount(id: number) {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    // Verify the account belongs to the user
    const existingAccount = await prisma.account.findFirst({
        where: {
            id,
            userId: userId,
        },
    });

    if (!existingAccount) {
        throw new Error("Account not found or unauthorized");
    }

    await prisma.account.delete({
        where: { id },
    });
    
    return { success: true };
}

