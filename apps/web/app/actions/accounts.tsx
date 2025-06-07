"use server";

import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { AccountInterface } from "../types/accounts";


export async function getAllAccounts(): Promise<AccountInterface[]> {
    const accounts = await prisma.account.findMany();
    
    // Convert Decimal balance to number to prevent serialization issues
    return accounts.map(account => ({
        ...account,
        balance: parseFloat(account.balance.toString()),
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

    const user  = await prisma.user.findUnique({
        where: {
            id: session.user.id,
        },
    });

    if (!user) {
        return null;
    }

    const accounts = await prisma.account.findMany({
        where: {
            userId: user.id,
        },
    });
    
    // Convert Decimal balance to number to prevent serialization issues
    return accounts.map(account => ({
        ...account,
        balance: parseFloat(account.balance.toString()),
        accountOpeningDate: new Date(account.accountOpeningDate),
        createdAt: new Date(account.createdAt),
        updatedAt: new Date(account.updatedAt)
    })) as AccountInterface[];
}



export async function createAccount(account: Omit<AccountInterface, 'id'>) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return { error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
        where: {
            id: session.user.id,
        },
    });

    if (!user) {
        return { error: "User not found" };
    }

    const newAccount = await prisma.account.create({
        data: {
            ...account,
            userId: user.id,
        },
    });
    
    // Convert Decimal balance to number to prevent serialization issues
    return {
        ...newAccount,
        balance: parseFloat(newAccount.balance.toString()),
        accountOpeningDate: new Date(newAccount.accountOpeningDate),
        createdAt: new Date(newAccount.createdAt),
        updatedAt: new Date(newAccount.updatedAt)
    } as AccountInterface;
}

