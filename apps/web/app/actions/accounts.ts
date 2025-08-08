"use server";

import prisma from "@repo/db/client";
import { AccountInterface } from "../types/accounts";
import { 
    getUserIdFromSession, 
    getAuthenticatedSession, 
    createErrorResponse,
    decimalToNumber 
} from "../utils/auth";

export async function getAllAccounts(): Promise<AccountInterface[]> {
    try {
        const accounts = await prisma.account.findMany();
        
        // Convert Decimal balance to number to prevent serialization issues
        return accounts.map(account => ({
            ...account,
            balance: account.balance ? decimalToNumber(account.balance, 'balance') : undefined,
            accountOpeningDate: new Date(account.accountOpeningDate),
            createdAt: new Date(account.createdAt),
            updatedAt: new Date(account.updatedAt),
            // Convert null values to undefined for compatibility with AccountInterface
            appUsername: account.appUsername || undefined,
            appPassword: account.appPassword || undefined,
            appPin: account.appPin || undefined,
            notes: account.notes || undefined,
            nickname: account.nickname || undefined,
        }));
    } catch (error) {
        console.error("Failed to fetch all accounts:", error);
        throw error;
    }
}

export async function getUserAccounts() {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user) {
            // If user doesn't exist, create them (for OAuth users)
            if (session.user.email && session.user.name) {
                console.info(`Creating new OAuth user: ${session.user.email}`);
                const newUser = await prisma.user.create({
                    data: {
                        id: userId,
                        email: session.user.email,
                        name: session.user.name,
                        number: `oauth_${userId}`, // Temporary number for OAuth users
                        password: "oauth_user", // Placeholder password for OAuth users
                    },
                });
                
                // Return empty accounts array for new user
                return [];
            } else {
                console.error(`User not found and insufficient OAuth data for user ID: ${userId}`);
                return createErrorResponse("User not found in database and insufficient data to create user");
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
            balance: account.balance ? decimalToNumber(account.balance, 'balance') : undefined,
            accountOpeningDate: new Date(account.accountOpeningDate),
            createdAt: new Date(account.createdAt),
            updatedAt: new Date(account.updatedAt),
            // Convert null values to undefined for compatibility with AccountInterface
            appUsername: account.appUsername || undefined,
            appPassword: account.appPassword || undefined,
            appPin: account.appPin || undefined,
            notes: account.notes || undefined,
            nickname: account.nickname || undefined,
        })) as AccountInterface[];
    } catch (error) {
        console.error("Failed to fetch user accounts:", error);
        return createErrorResponse("Unauthorized");
    }
}

export async function createAccount(account: Omit<AccountInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user) {
            console.error(`User not found when creating account for user ID: ${userId}`);
            throw new Error("User not found");
        }

        // Use transaction to handle account creation and uniqueness validation atomically
        const result = await prisma.$transaction(async (tx) => {
            // Check for account number uniqueness inside transaction
            if (account.accountNumber) {
                const existingAccount = await tx.account.findUnique({
                    where: {
                        accountNumber: account.accountNumber,
                    },
                });

                if (existingAccount) {
                    throw new Error(`Account number ${account.accountNumber} is already in use. Please use a different account number.`);
                }
            }

            // Create the account
            const newAccount = await tx.account.create({
                data: {
                    ...account,
                    userId: user.id,
                    balance: account.balance || 0,
                },
            });

            return newAccount;
        });
        
        console.info(`Account created successfully for user ${userId}: ${result.bankName} (${result.accountNumber})`);
        
        // Convert Decimal balance to number to prevent serialization issues
        return {
            ...result,
            balance: result.balance ? decimalToNumber(result.balance, 'balance') : undefined,
            accountOpeningDate: new Date(result.accountOpeningDate),
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt),
            // Convert null values to undefined for compatibility with AccountInterface
            appUsername: result.appUsername || undefined,
            appPassword: result.appPassword || undefined,
            appPin: result.appPin || undefined,
            notes: result.notes || undefined,
            nickname: result.nickname || undefined,
        } as AccountInterface;
    } catch (error: any) {
        console.error(`Failed to create account for user: ${error.message}`, { account: account.bankName });
        // Handle Prisma unique constraint errors
        if (error.code === 'P2002' && error.meta?.target?.includes('accountNumber')) {
            throw new Error(`Account number ${account.accountNumber} is already in use. Please use a different account number.`);
        }
        // Re-throw other errors
        throw error;
    }
}

export async function updateAccount(id: number, account: Partial<Omit<AccountInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Use transaction to handle account update and uniqueness validation atomically
        const result = await prisma.$transaction(async (tx) => {
            // Verify the account belongs to the user
            const existingAccount = await tx.account.findFirst({
                where: {
                    id,
                    userId: userId,
                },
            });

            if (!existingAccount) {
                throw new Error("Account not found or unauthorized");
            }

            // Check for account number uniqueness if it's being updated
            if (account.accountNumber && account.accountNumber !== existingAccount.accountNumber) {
                const duplicateAccount = await tx.account.findUnique({
                    where: {
                        accountNumber: account.accountNumber,
                    },
                });

                if (duplicateAccount && duplicateAccount.id !== id) {
                    throw new Error(`Account number ${account.accountNumber} is already in use. Please use a different account number.`);
                }
            }

            // Update the account
            const updatedAccount = await tx.account.update({
                where: { id },
                data: account,
            });

            return updatedAccount;
        });
        
        console.info(`Account updated successfully: ${id} for user ${userId}`);
        
        // Convert Decimal balance to number to prevent serialization issues
        return {
            ...result,
            balance: result.balance ? decimalToNumber(result.balance, 'balance') : undefined,
            accountOpeningDate: new Date(result.accountOpeningDate),
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt),
            // Convert null values to undefined for compatibility with AccountInterface
            appUsername: result.appUsername || undefined,
            appPassword: result.appPassword || undefined,
            appPin: result.appPin || undefined,
            notes: result.notes || undefined,
            nickname: result.nickname || undefined,
        } as AccountInterface;
    } catch (error: any) {
        console.error(`Failed to update account ${id}: ${error.message}`);
        // Handle Prisma unique constraint errors
        if (error.code === 'P2002' && error.meta?.target?.includes('accountNumber')) {
            throw new Error(`Account number ${account.accountNumber} is already in use. Please use a different account number.`);
        }
        // Re-throw other errors
        throw error;
    }
}

export async function deleteAccount(id: number) {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Verify the account belongs to the user
        const existingAccount = await prisma.account.findFirst({
            where: {
                id,
                userId: userId,
            },
        });

        if (!existingAccount) {
            console.error(`Account deletion failed - not found or unauthorized: ${id} for user ${userId}`);
            throw new Error("Account not found or unauthorized");
        }

        await prisma.account.delete({
            where: { id },
        });

        console.info(`Account deleted successfully: ${id} for user ${userId}`);
        return { success: true };
    } catch (error) {
        console.error(`Failed to delete account ${id}:`, error);
        throw error;
    }
}

export async function bulkDeleteAccounts(accountIds: number[]) {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Verify all accounts belong to the user
        const userAccounts = await prisma.account.findMany({
            where: {
                id: { in: accountIds },
                userId: userId,
            },
        });

        if (userAccounts.length !== accountIds.length) {
            console.error(`Bulk delete failed - some accounts not found or unauthorized for user ${userId}`);
            throw new Error("Some accounts not found or unauthorized");
        }

        await prisma.account.deleteMany({
            where: {
                id: { in: accountIds },
                userId: userId,
            },
        });

        console.info(`Bulk account deletion successful: ${accountIds.length} accounts for user ${userId}`);
        return { success: true, deletedCount: accountIds.length };
    } catch (error) {
        console.error(`Failed to bulk delete accounts:`, error);
        throw error;
    }
}

export async function bulkCreateAccounts(accounts: Omit<AccountInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]) {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user) {
            console.error(`User not found when creating accounts for user ID: ${userId}`);
            throw new Error("User not found");
        }

        // Use transaction to handle bulk account creation with uniqueness validation
        const result = await prisma.$transaction(async (tx) => {
            const createdAccounts: any[] = [];
            const errors: string[] = [];
            let successCount = 0;

            for (let i = 0; i < accounts.length; i++) {
                const account = accounts[i];
                if (!account) {
                    errors.push(`Account ${i + 1}: Invalid account data`);
                    continue;
                }

                try {
                    // Check for account number uniqueness inside transaction
                    if (account.accountNumber) {
                        const existingAccount = await tx.account.findUnique({
                            where: {
                                accountNumber: account.accountNumber,
                            },
                        });

                        if (existingAccount) {
                            errors.push(`Account ${i + 1}: Account number ${account.accountNumber} is already in use`);
                            continue;
                        }
                    }

                    // Ensure required fields are present
                    if (!account.holderName || !account.bankName) {
                        errors.push(`Account ${i + 1}: Missing required fields (holder name or bank name)`);
                        continue;
                    }

                    // Create the account
                    const newAccount = await tx.account.create({
                        data: {
                            holderName: account.holderName,
                            accountNumber: account.accountNumber || '',
                            branchCode: account.branchCode || '',
                            bankName: account.bankName,
                            branchName: account.branchName || '',
                            bankAddress: account.bankAddress || '',
                            accountType: account.accountType || '',
                            mobileNumbers: account.mobileNumbers || [],
                            branchContacts: account.branchContacts || [],
                            swift: account.swift || '',
                            bankEmail: account.bankEmail || '',
                            accountOpeningDate: account.accountOpeningDate,
                            securityQuestion: account.securityQuestion || [],
                            balance: account.balance || 0,
                            appUsername: account.appUsername || null,
                            appPassword: null, // Not imported for security
                            appPin: null, // Not imported for security
                            notes: account.notes || null,
                            nickname: account.nickname || null,
                            userId: user.id,
                        },
                    });

                    createdAccounts.push({
                        ...newAccount,
                        balance: newAccount.balance ? decimalToNumber(newAccount.balance, 'balance') : undefined,
                        accountOpeningDate: new Date(newAccount.accountOpeningDate),
                        createdAt: new Date(newAccount.createdAt),
                        updatedAt: new Date(newAccount.updatedAt),
                        // Convert null values to undefined for compatibility with AccountInterface
                        appUsername: newAccount.appUsername || undefined,
                        appPassword: newAccount.appPassword || undefined,
                        appPin: newAccount.appPin || undefined,
                        notes: newAccount.notes || undefined,
                        nickname: newAccount.nickname || undefined,
                    });
                    successCount++;
                } catch (error: any) {
                    console.error(`Failed to create account ${i + 1}:`, error);
                    // Handle Prisma unique constraint errors
                    if (error.code === 'P2002' && error.meta?.target?.includes('accountNumber')) {
                        errors.push(`Account ${i + 1}: Account number ${account?.accountNumber || 'unknown'} is already in use`);
                    } else {
                        errors.push(`Account ${i + 1}: ${error.message}`);
                    }
                }
            }

            return { createdAccounts, errors, successCount };
        });
        
        console.info(`Bulk account creation completed for user ${userId}: ${result.successCount} successful, ${result.errors.length} errors`);
        
        return {
            success: result.successCount > 0,
            data: result.createdAccounts as AccountInterface[],
            errors: result.errors,
            successCount: result.successCount,
            totalAttempted: accounts.length
        };
    } catch (error: any) {
        console.error(`Failed to bulk create accounts for user: ${error.message}`);
        throw error;
    }
}