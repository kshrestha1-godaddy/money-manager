import type { Prisma } from "@prisma/client";
import { ActivityAction, ActivityCategory, ActivityEntityType } from "@prisma/client";
import type { Expense } from "../types/financial";
import { convertForDisplayWithDbRates } from "./currencyDisplayServer";
import { logAccountBalanceFromTransaction } from "./accountActivityLog";

function serializeTransactionLocation(location: any) {
    if (!location) return null;
    return {
        ...location,
        latitude: location.latitude ? Number(location.latitude) : null,
        longitude: location.longitude ? Number(location.longitude) : null,
    };
}

/** Keep expense creation and its balance change inside the caller's transaction. */
export async function createExpenseInTransaction(
    tx: Prisma.TransactionClient,
    data: Omit<Expense, "id" | "createdAt" | "updatedAt">,
    userId: number,
    user: { currency: string } | null
) {
    // Create the expense
    const createData: any = {
        title: data.title,
        description: data.description,
        amount: data.amount,
        currency: data.currency || user?.currency || 'USD',
        date: data.date,
        category: {
            connect: { id: data.categoryId }
        },
        user: {
            connect: { id: userId }
        },
        tags: data.tags,
        location: data.location,
        receipt: data.receipt,
        notes: data.notes,
        isRecurring: data.isRecurring,
        recurringFrequency: data.recurringFrequency
    };

    // Handle transaction location
    if ((data as any).transactionLocationId && (data as any).transactionLocationId !== -1) {
        createData.transactionLocation = {
            connect: { id: (data as any).transactionLocationId }
        };
    } else if ((data as any).transactionLocation && (data as any).transactionLocation.id === -1) {
        // Create new transaction location
        const newLocationData = (data as any).transactionLocation;
        const newLocation = await tx.transactionLocation.create({
            data: {
                latitude: newLocationData.latitude,
                longitude: newLocationData.longitude,
                userId: userId
            }
        });
        createData.transactionLocation = {
            connect: { id: newLocation.id }
        };
    }

    if (data.accountId) {
        createData.account = {
            connect: { id: data.accountId }
        };
    }

    const expense = await tx.expense.create({
        data: createData,
        include: {
            category: true,
            account: true,
            user: true,
            transactionLocation: true
        }
    });

    // Serialize the transaction location to avoid Decimal serialization issues
    if (expense.transactionLocation) {
        expense.transactionLocation = serializeTransactionLocation(expense.transactionLocation);
    }

    // Create TransactionImage record if receipt URL is provided
    if (data.receipt) {
        try {
            await tx.transactionImage.create({
                data: {
                    imageUrl: data.receipt,
                    fileName: `expense-receipt-${expense.id}`,
                    transactionType: 'EXPENSE',
                    transactionId: expense.id,
                    description: `Receipt for ${data.title}`,
                    userId: userId
                }
            });
        } catch (imageError) {
            console.error('Failed to create transaction image record:', imageError);
            // Don't fail the entire transaction if image record creation fails
        }
    }

    // Update the account balance (decrease by expense amount, convert to user's currency)
    if (data.accountId) {
        const userCurrency = user?.currency || 'USD';
        const transactionCurrency = data.currency || userCurrency;
        const convertedAmount = await convertForDisplayWithDbRates(data.amount, transactionCurrency, userCurrency);
        
        await tx.account.update({
            where: { id: data.accountId },
            data: {
                balance: {
                    decrement: convertedAmount
                }
            }
        });

        if (expense.account) {
            await logAccountBalanceFromTransaction(tx, {
                userId,
                action: ActivityAction.CREATE,
                entityType: ActivityEntityType.EXPENSE,
                entityId: expense.id,
                category: ActivityCategory.TRANSACTION,
                accountId: data.accountId,
                accountBankName: expense.account.bankName,
                holderName: expense.account.holderName,
                balanceDeltaUserCurrency: -convertedAmount,
                userCurrency,
                transactionTitle: data.title,
                transactionAmountOriginal: data.amount,
                transactionCurrency,
                reason: "expense_create",
            });
        }
    }

    return expense;
}
