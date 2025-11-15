"use server";

import prisma from "@repo/db/client";
import { AccountInterface } from "../../../types/accounts";
import { 
    getUserIdFromSession, 
    getAuthenticatedSession, 
    createErrorResponse,
    decimalToNumber 
} from "../../../utils/auth";

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
        const formattedAccounts = accounts.map(account => ({
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

        return formattedAccounts;
    } catch (error) {
        console.error("Failed to fetch user accounts:", error);
        return createErrorResponse("Failed to load accounts. Please try again.");
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

/**
 * Get withheld amounts from investments grouped by bank name
 * Withheld amounts are from ALL investment types EXCEPT: GOLD, BONDS, MUTUAL_FUNDS, CRYPTO, REAL_ESTATE
 * These categories represent amounts physically stored in bank accounts
 */
export async function getWithheldAmountsByBank(): Promise<Record<string, number>> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Fetch investments that represent withheld amounts in banks
        // Exclude investment types that are NOT stored in banks (external investments)
        const withheldInvestments = await prisma.investment.findMany({
            where: {
                userId: userId,
                type: {
                    notIn: ['GOLD', 'BONDS', 'MUTUAL_FUNDS', 'CRYPTO', 'REAL_ESTATE']
                },
                accountId: {
                    not: null // Only include investments linked to accounts
                }
            },
            include: {
                account: {
                    select: {
                        bankName: true
                    }
                }
            }
        });

        // Group withheld amounts by bank name
        const withheldByBank: Record<string, number> = {};
        
        withheldInvestments.forEach(investment => {
            if (investment.account) {
                const bankName = investment.account.bankName;
                
                // Calculate amount based on investment type
                // For stocks, use quantity * purchasePrice
                // For fixed deposits and other bank-stored investments, use purchasePrice only
                let amount: number;
                if (investment.type === 'STOCKS') {
                    amount = parseFloat(investment.quantity.toString()) * parseFloat(investment.purchasePrice.toString());
                } else {
                    // FIXED_DEPOSIT, PROVIDENT_FUNDS, SAFE_KEEPINGS, EMERGENCY_FUND, MARRIAGE, VACATION, OTHER
                    amount = parseFloat(investment.purchasePrice.toString());
                }
                
                if (withheldByBank[bankName]) {
                    withheldByBank[bankName] += amount;
                } else {
                    withheldByBank[bankName] = amount;
                }
            }
        });

        return withheldByBank;
    } catch (error) {
        console.error("Failed to fetch withheld amounts by bank:", error);
        return {};
    }
}

export async function transferMoney(fromAccountId: number, toAccountId: number, amount: number, notes?: string) {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Validate input
        if (fromAccountId === toAccountId) {
            throw new Error("Source and destination accounts cannot be the same");
        }

        if (amount <= 0) {
            throw new Error("Transfer amount must be greater than 0");
        }

        // Get user's preferred currency
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { currency: true }
        });

        const userCurrency = user?.currency || 'USD';

        // Find existing Self Transfer of Money category
        let transferCategory = await prisma.category.findFirst({
            where: {
                userId: userId,
                OR: [
                    { name: "Transfer" },
                    { name: "Self Transfer of Money" },
                    { name: "SToM (Self Transfer of Money)" }
                ],
                type: "EXPENSE"
            }
        });

        if (!transferCategory) {
            // Create the category if it doesn't exist
            transferCategory = await prisma.category.create({
                data: {
                    name: "SToM (Self Transfer of Money)",
                    type: "EXPENSE",
                    color: "#8B5CF6", // Purple color for transfers
                    icon: "↔️",
                    includedInBudget: false, // Transfers shouldn't be included in budget calculations
                    userId: userId
                }
            });
        }

        // Use transaction to ensure all operations succeed or fail together
        const result = await prisma.$transaction(async (tx) => {
            // Verify both accounts belong to the user
            const fromAccount = await tx.account.findFirst({
                where: {
                    id: fromAccountId,
                    userId: userId,
                },
            });

            const toAccount = await tx.account.findFirst({
                where: {
                    id: toAccountId,
                    userId: userId,
                },
            });

            if (!fromAccount) {
                throw new Error("Source account not found or unauthorized");
            }

            if (!toAccount) {
                throw new Error("Destination account not found or unauthorized");
            }

            // Check if source account has sufficient balance
            const sourceBalance = fromAccount.balance ? decimalToNumber(fromAccount.balance, 'balance') : 0;
            if (sourceBalance < amount) {
                throw new Error(`Insufficient balance. Available: ${sourceBalance} ${userCurrency}`);
            }

            // Update account balances
            const updatedFromAccount = await tx.account.update({
                where: { id: fromAccountId },
                data: { 
                    balance: {
                        decrement: amount
                    }
                },
            });

            const updatedToAccount = await tx.account.update({
                where: { id: toAccountId },
                data: { 
                    balance: {
                        increment: amount
                    }
                },
            });

            // Create a single expense entry for tracking with zero amount (doesn't affect expense calculations)
            const transferExpense = await tx.expense.create({
                data: {
                    title: `Transfer: ${fromAccount.bankName} → ${toAccount.bankName}`,
                    description: `Money transfer between accounts`,
                    amount: 0, // Zero amount so it doesn't affect expense calculations
                    currency: userCurrency,
                    date: new Date(),
                    category: {
                        connect: { id: transferCategory!.id }
                    },
                    account: {
                        connect: { id: fromAccountId }
                    },
                    user: {
                        connect: { id: userId }
                    },
                    tags: ["Transfer", "Self-Transfer"],
                    location: [],
                    notes: `Transfer Amount: ${amount} ${userCurrency} | From: ${fromAccount.bankName} (${fromAccount.accountNumber}) | To: ${toAccount.bankName} (${toAccount.accountNumber})${notes ? ` | Notes: ${notes}` : ''}`,
                    isRecurring: false
                }
            });

            return {
                fromAccount: {
                    ...updatedFromAccount,
                    balance: updatedFromAccount.balance ? decimalToNumber(updatedFromAccount.balance, 'balance') : 0,
                    accountOpeningDate: new Date(updatedFromAccount.accountOpeningDate),
                    createdAt: new Date(updatedFromAccount.createdAt),
                    updatedAt: new Date(updatedFromAccount.updatedAt),
                    appUsername: updatedFromAccount.appUsername || undefined,
                    appPassword: updatedFromAccount.appPassword || undefined,
                    appPin: updatedFromAccount.appPin || undefined,
                    notes: updatedFromAccount.notes || undefined,
                    nickname: updatedFromAccount.nickname || undefined,
                },
                toAccount: {
                    ...updatedToAccount,
                    balance: updatedToAccount.balance ? decimalToNumber(updatedToAccount.balance, 'balance') : 0,
                    accountOpeningDate: new Date(updatedToAccount.accountOpeningDate),
                    createdAt: new Date(updatedToAccount.createdAt),
                    updatedAt: new Date(updatedToAccount.updatedAt),
                    appUsername: updatedToAccount.appUsername || undefined,
                    appPassword: updatedToAccount.appPassword || undefined,
                    appPin: updatedToAccount.appPin || undefined,
                    notes: updatedToAccount.notes || undefined,
                    nickname: updatedToAccount.nickname || undefined,
                },
                transferExpense,
                transferAmount: amount
            };
        });

        console.info(`Transfer completed successfully: ${amount} ${userCurrency} from account ${fromAccountId} to account ${toAccountId} for user ${userId}`);

        return {
            success: true,
            message: `Successfully transferred ${amount} ${userCurrency} from ${result.fromAccount.bankName} to ${result.toAccount.bankName}`,
            data: {
                fromAccount: result.fromAccount as AccountInterface,
                toAccount: result.toAccount as AccountInterface,
                transferAmount: result.transferAmount
            }
        };
    } catch (error: any) {
        console.error(`Failed to transfer money:`, error);
        throw error;
    }
}