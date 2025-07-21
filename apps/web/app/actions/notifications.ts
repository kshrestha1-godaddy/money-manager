"use server";

import prisma from "@repo/db/client";
import { revalidatePath } from "next/cache";
import { 
    getUserIdFromSession, 
    getAuthenticatedSession,
    decimalToNumber 
} from "../utils/auth";
import { getUserCurrency } from "../actions/currency";
import { formatCurrency } from "../utils/currency";

// Types for notifications
export interface NotificationData {
    id: number;
    title: string;
    message: string;
    type: string;
    priority: string;
    isRead: boolean;
    actionUrl?: string | null;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationSettingsData {
    lowBalanceEnabled: boolean;
    lowBalanceThreshold: number;
    dueDateEnabled: boolean;
    dueDateDaysBefore: number;
    spendingAlertsEnabled: boolean;
    monthlySpendingLimit: number;
    investmentAlertsEnabled: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
}

/**
 * Get all notifications for the current user
 */
export async function getNotifications(): Promise<NotificationData[]> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: [
                { isRead: 'asc' },
                { priority: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        return notifications.map(notification => ({
            ...notification,
            createdAt: new Date(notification.createdAt),
            updatedAt: new Date(notification.updatedAt)
        }));
    } catch (error) {
        console.error("Failed to fetch notifications:", error);
        throw new Error("Failed to fetch notifications");
    }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(): Promise<number> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        return await prisma.notification.count({
            where: { 
                userId,
                isRead: false 
            }
        });
    } catch (error) {
        console.error("Failed to fetch unread notification count:", error);
        return 0;
    }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: number): Promise<void> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Update the notification to mark it as read
        await prisma.notification.update({
            where: { 
                id: notificationId,
                userId // Ensure user can only update their own notifications
            },
            data: { isRead: true }
        });

        revalidatePath("/(dashboard)");
    } catch (error) {
        console.error("Failed to mark notification as read:", error);
        throw new Error("Failed to mark notification as read");
    }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<void> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Mark all notifications as read
        await prisma.notification.updateMany({
            where: { 
                userId,
                isRead: false 
            },
            data: { isRead: true }
        });

        revalidatePath("/(dashboard)");
    } catch (error) {
        console.error("Failed to mark all notifications as read:", error);
        throw new Error("Failed to mark all notifications as read");
    }
}

/**
 * Delete a specific notification
 */
export async function deleteNotification(id: number): Promise<void> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        await prisma.notification.delete({
            where: { 
                id,
                userId // Ensure user can only delete their own notifications
            }
        });

        revalidatePath("/(dashboard)");
    } catch (error) {
        console.error("Failed to delete notification:", error);
        throw new Error("Failed to delete notification");
    }
}

/**
 * Clear all notifications for the current user
 */
export async function clearAllNotifications(): Promise<{ deletedCount: number }> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        const result = await prisma.notification.deleteMany({
            where: { userId }
        });

        revalidatePath("/(dashboard)");
        return { deletedCount: result.count };
    } catch (error) {
        console.error("Failed to clear all notifications:", error);
        throw new Error("Failed to clear all notifications");
    }
}

/**
 * Create a new notification
 */
export async function createNotification(
    userId: number,
    title: string,
    message: string,
    type: string,
    priority: string = 'NORMAL',
    actionUrl?: string,
    metadata?: any
): Promise<void> {
    try {
        // Create a time window to check for duplicates (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Build where condition for duplicate detection - check both read and unread
        let whereCondition: any = {
            userId,
            type,
            createdAt: {
                gte: thirtyDaysAgo // Check notifications from the last 30 days
            }
        };

        // If we have an entityId in metadata, check for that specific entity
        if (metadata?.entityId) {
            whereCondition.metadata = {
                path: ["entityId"],
                equals: metadata.entityId
            };
        } else {
            // For notifications without entityId, check by title and message similarity
            whereCondition.title = title;
            whereCondition.message = message;
        }

        // Check if similar notification already exists (both read and unread)
        const existingNotification = await prisma.notification.findFirst({
            where: whereCondition
        });

        // Don't create duplicate notifications if one exists in the last 30 days
        if (existingNotification) {
            return;
        }

        await prisma.notification.create({
            data: {
                title,
                message,
                type: type as any,
                priority: priority as any,
                actionUrl,
                metadata,
                userId
            }
        });

        revalidatePath("/(dashboard)");
    } catch (error) {
        console.error("Failed to create notification:", error);
        // Don't throw here to avoid breaking the main operation
    }
}

/**
 * Get notification settings for the current user
 */
export async function getNotificationSettings(): Promise<NotificationSettingsData | null> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        const settings = await prisma.notificationSettings.findUnique({
            where: { userId }
        });

        if (!settings) {
            return null;
        }

        return {
            lowBalanceEnabled: settings.lowBalanceEnabled,
            lowBalanceThreshold: decimalToNumber(settings.lowBalanceThreshold, 'lowBalanceThreshold'),
            dueDateEnabled: settings.dueDateEnabled,
            dueDateDaysBefore: settings.dueDateDaysBefore,
            spendingAlertsEnabled: settings.spendingAlertsEnabled,
            monthlySpendingLimit: decimalToNumber(settings.monthlySpendingLimit, 'monthlySpendingLimit'),
            investmentAlertsEnabled: settings.investmentAlertsEnabled,
            emailNotifications: settings.emailNotifications,
            pushNotifications: settings.pushNotifications
        };
    } catch (error) {
        console.error("Failed to fetch notification settings:", error);
        throw new Error("Failed to fetch notification settings");
    }
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(settings: Partial<NotificationSettingsData>): Promise<void> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        await prisma.notificationSettings.upsert({
            where: { userId },
            update: settings,
            create: {
                userId,
                ...settings
            }
        });

        revalidatePath("/notifications");
    } catch (error) {
        console.error("Failed to update notification settings:", error);
        throw new Error("Failed to update notification settings");
    }
}
/**
 * Check for low balance alerts
 */
export async function checkLowBalanceAlerts(userId: number): Promise<void> {
    try {
        const settings = await prisma.notificationSettings.findUnique({
            where: { userId }
        });

        if (!settings?.lowBalanceEnabled) return;

        const threshold = decimalToNumber(settings.lowBalanceThreshold, 'threshold');
        const userCurrency = await getUserCurrency();
        const accounts = await prisma.account.findMany({
            where: { userId }
        });

        for (const account of accounts) {
            const accountBalance = decimalToNumber(account.balance, 'balance');
            
            // Simple comparison: both balance and threshold are in user's currency
            if (accountBalance < threshold) {
                const recentNotification = await prisma.notification.findFirst({
                    where: {
                        userId,
                        type: 'LOW_BALANCE',
                        metadata: {
                            path: ["entityId"],
                            equals: `low-balance-${account.id}`
                        },
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                    }
                });
                if (!recentNotification) {
                    await createNotification(
                        userId,
                        'Low Account Balance',
                        `Your <strong>${account.bankName}</strong> account balance <strong>${formatCurrency(accountBalance, userCurrency)}</strong> is below your threshold of <strong>${formatCurrency(threshold, userCurrency)}</strong>.`,
                        'LOW_BALANCE',
                        'HIGH',
                        '/accounts',
                        {
                            accountId: account.id,
                            balance: accountBalance,
                            threshold,
                            entityId: `low-balance-${account.id}`
                        }
                    );
                }
            }
        }
    } catch (error) {
        console.error("Failed to check low balance alerts:", error);
    }
}

/**
 * Check for due date alerts (debts and loans)
 */
export async function checkDueDateAlerts(userId: number): Promise<void> {
    try {
        let settings = await prisma.notificationSettings.findUnique({
            where: { userId }
        });

        // Create default notification settings if they don't exist
        if (!settings) {
            settings = await prisma.notificationSettings.create({
                data: {
                    userId,
                    lowBalanceEnabled: true,
                    lowBalanceThreshold: 500,
                    dueDateEnabled: true,
                    dueDateDaysBefore: 7,
                    spendingAlertsEnabled: true,
                    monthlySpendingLimit: 5000,
                    investmentAlertsEnabled: true,
                    emailNotifications: false,
                    pushNotifications: true
                }
            });
        }

        if (!settings?.dueDateEnabled) return;

        const daysBefore = settings.dueDateDaysBefore;
        const alertDate = new Date();
        alertDate.setDate(alertDate.getDate() + daysBefore);
        const currency = await getUserCurrency();
        // Check debts (both ACTIVE and PARTIALLY_PAID debts can have due dates)
        const debts = await prisma.debt.findMany({
            where: {
                userId,
                status: {
                    in: ['ACTIVE', 'PARTIALLY_PAID']
                },
                dueDate: {
                    lte: alertDate,
                    gte: new Date()
                }
            }
        });
        for (const debt of debts) {
            if (debt.dueDate) {
                const daysUntilDue = Math.ceil((debt.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                await createNotification(
                    userId,
                    'Debt Due Soon',
                    `Debt from <strong>${debt.borrowerName}</strong> (<strong>${formatCurrency(decimalToNumber(debt.amount, 'amount'), currency)}</strong>) is due in <strong>${daysUntilDue} day(s)</strong>.`,
                    'DEBT_REMINDER',
                    daysUntilDue <= 1 ? 'URGENT' : 'HIGH',
                    '/debts',
                    { debtId: debt.id, entityId: `debt-${debt.id}` }
                );
            }
        }
        // Check loans (both ACTIVE and PARTIALLY_PAID loans can have due dates)
        const loans = await prisma.loan.findMany({
            where: {
                userId,
                status: {
                    in: ['ACTIVE', 'PARTIALLY_PAID']
                },
                dueDate: {
                    lte: alertDate,
                    gte: new Date()
                }
            }
        });
        for (const loan of loans) {
            if (loan.dueDate) {
                const daysUntilDue = Math.ceil((loan.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                await createNotification(
                    userId,
                    'Loan Due Soon',
                    `Loan from <strong>${loan.lenderName}</strong> (<strong>${formatCurrency(decimalToNumber(loan.amount, 'amount'), currency)}</strong>) is due in <strong>${daysUntilDue} day(s)</strong>.`,
                    'LOAN_REMINDER',
                    daysUntilDue <= 1 ? 'URGENT' : 'HIGH',
                    '/loans',
                    { loanId: loan.id, entityId: `loan-${loan.id}` }
                );
            }
        }
    } catch (error) {
        console.error("Failed to check due date alerts:", error);
    }
}

/**
 * Check for investment maturity alerts
 */
export async function checkInvestmentMaturityAlerts(userId: number): Promise<void> {
    try {
        const settings = await prisma.notificationSettings.findUnique({
            where: { userId }
        });
        if (!settings?.investmentAlertsEnabled) return;
        const alertDate = new Date();
        alertDate.setDate(alertDate.getDate() + 30);
        const currency = await getUserCurrency();
        const investments = await prisma.investment.findMany({
            where: {
                userId,
                type: 'FIXED_DEPOSIT',
                maturityDate: {
                    lte: alertDate,
                    gte: new Date()
                }
            }
        });
        for (const investment of investments) {
            if (investment.maturityDate) {
                const daysUntilMaturity = Math.ceil((investment.maturityDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                await createNotification(
                    userId,
                    'Investment Maturing Soon',
                    `Your fixed deposit "<strong>${investment.name}</strong>" (<strong>${formatCurrency(decimalToNumber(investment.purchasePrice, 'amount'), currency)}</strong>) matures in <strong>${daysUntilMaturity} day(s)</strong>.`,
                    'INVESTMENT_MATURITY',
                    daysUntilMaturity <= 7 ? 'HIGH' : 'NORMAL',
                    '/investments',
                    { investmentId: investment.id, entityId: `investment-${investment.id}` }
                );
            }
        }
    } catch (error) {
        console.error("Failed to check investment maturity alerts:", error);
    }
}

/**
 * Check for monthly spending alerts
 */
export async function checkSpendingAlerts(userId: number): Promise<void> {
    try {
        const settings = await prisma.notificationSettings.findUnique({
            where: { userId }
        });
        if (!settings?.spendingAlertsEnabled) return;
        const monthlyLimit = decimalToNumber(settings.monthlySpendingLimit, 'limit');
        const currency = await getUserCurrency();
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const expenses = await prisma.expense.aggregate({
            where: {
                userId,
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            },
            _sum: {
                amount: true
            }
        });
        const totalSpent = expenses._sum.amount ? decimalToNumber(expenses._sum.amount, 'totalSpent') : 0;
        const percentageSpent = (totalSpent / monthlyLimit) * 100;
        if (percentageSpent >= 90) {
            const thresholdType = percentageSpent >= 100 ? 'exceeded' : 'approaching';
            await createNotification(
                userId,
                'Monthly Spending Limit Alert',
                `You've spent <strong>${formatCurrency(totalSpent, currency)}</strong> (<strong>${percentageSpent.toFixed(1)}%</strong>) of your monthly limit of <strong>${formatCurrency(monthlyLimit, currency)}</strong>.`,
                'SPENDING_ALERT',
                percentageSpent >= 100 ? 'URGENT' : 'HIGH',
                '/expenses',
                {
                    totalSpent,
                    monthlyLimit,
                    percentageSpent,
                    entityId: `spending-${thresholdType}-${now.getMonth()}-${now.getFullYear()}`
                }
            );
        }
    } catch (error) {
        console.error("Failed to check spending alerts:", error);
    }
}

/**
 * Check for password expiry alerts
 */
export async function checkPasswordExpiryAlerts(userId: number): Promise<void> {
    try {
        const alertDate = new Date();
        alertDate.setDate(alertDate.getDate() + 30); // 30 days before expiry

        const passwords = await prisma.password.findMany({
            where: {
                userId,
                validity: {
                    lte: alertDate,
                    gte: new Date()
                }
            }
        });

        for (const password of passwords) {
            if (password.validity) {
                const daysUntilExpiry = Math.ceil((password.validity.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                
                await createNotification(
                    userId,
                    'Password Expiring Soon',
                    `Your password for <strong>${password.websiteName}</strong> expires in <strong>${daysUntilExpiry} day(s)</strong>.`,
                    'PASSWORD_EXPIRY',
                    daysUntilExpiry <= 7 ? 'HIGH' : 'NORMAL',
                    '/passwords',
                    { passwordId: password.id, entityId: `password-${password.id}` }
                );
            }
        }
    } catch (error) {
        console.error("Failed to check password expiry alerts:", error);
    }
}



/**
 * Generate all notifications for a user
 */
export async function generateNotificationsForUser(userId: number): Promise<void> {
    await Promise.all([
        checkLowBalanceAlerts(userId),
        checkDueDateAlerts(userId),
        checkInvestmentMaturityAlerts(userId),
        checkSpendingAlerts(userId),
        checkPasswordExpiryAlerts(userId),
        cleanupOldNotifications(userId) // Clean up old notifications periodically
    ]);
}

/**
 * Clean up old notifications (older than 60 days)
 * This helps keep the database size manageable
 */
async function cleanupOldNotifications(userId: number): Promise<void> {
    try {
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const result = await prisma.notification.deleteMany({
            where: {
                userId,
                createdAt: {
                    lt: sixtyDaysAgo
                },
                isRead: true // Only delete read notifications
            }
        });

        if (result.count > 0) {
            // console.log(`Cleaned up ${result.count} old notifications for user ${userId}`);
        }
    } catch (error) {
        console.error("Failed to clean up old notifications:", error);
        // Don't throw here to avoid breaking the main operation
    }
}


