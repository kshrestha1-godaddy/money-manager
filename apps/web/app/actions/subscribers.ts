"use server";

import { revalidatePath } from "next/cache";
import prisma from "@repo/db/client";
import { Subscriber } from "../types/financial";
import { sendWelcomeEmail } from "../services/email";
import { validateEmail } from "../utils/auth";

export async function getSubscribers() {
    try {
        const subscribers = await prisma.subscriber.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Transform Prisma result to match our Subscriber type
        return subscribers.map(subscriber => ({
            ...subscriber,
            subscribedAt: new Date(subscriber.subscribedAt),
            unsubscribedAt: subscriber.unsubscribedAt ? new Date(subscriber.unsubscribedAt) : undefined,
            lastEngagementAt: subscriber.lastEngagementAt ? new Date(subscriber.lastEngagementAt) : undefined,
            createdAt: new Date(subscriber.createdAt),
            updatedAt: new Date(subscriber.updatedAt)
        })) as Subscriber[];
    } catch (error) {
        console.error("Failed to fetch subscribers:", error);
        throw new Error("Failed to fetch subscribers");
    }
}

export async function addSubscriber(data: {
    email: string;
    name?: string;
    phone?: string;
    newsletterEnabled?: boolean;
    marketingEnabled?: boolean;
    productUpdatesEnabled?: boolean;
    weeklyDigestEnabled?: boolean;
    source?: string;
    tags?: string[];
}) {
    try {
        // Validate email format
        if (!validateEmail(data.email)) {
            return {
                success: false,
                error: "Please enter a valid email address"
            };
        }

        // Check if subscriber already exists
        const existingSubscriber = await prisma.subscriber.findUnique({
            where: { email: data.email.toLowerCase().trim() }
        });

        if (existingSubscriber) {
            // If they exist but are unsubscribed, reactivate them
            if (existingSubscriber.status === 'UNSUBSCRIBED' || existingSubscriber.status === 'INACTIVE') {
                const reactivatedSubscriber = await prisma.subscriber.update({
                    where: { email: data.email.toLowerCase().trim() },
                    data: {
                        status: 'ACTIVE',
                        unsubscribedAt: null,
                        name: data.name || existingSubscriber.name,
                        phone: data.phone || existingSubscriber.phone,
                        newsletterEnabled: data.newsletterEnabled ?? existingSubscriber.newsletterEnabled,
                        marketingEnabled: data.marketingEnabled ?? existingSubscriber.marketingEnabled,
                        productUpdatesEnabled: data.productUpdatesEnabled ?? existingSubscriber.productUpdatesEnabled,
                        weeklyDigestEnabled: data.weeklyDigestEnabled ?? existingSubscriber.weeklyDigestEnabled,
                        source: data.source || existingSubscriber.source,
                        tags: data.tags || existingSubscriber.tags,
                    }
                });

                // Send welcome back email to reactivated subscriber
                try {
                    const emailResult = await sendWelcomeEmail(data.email, data.name || reactivatedSubscriber.name || undefined);
                    if (!emailResult.success) {
                        console.warn(`Failed to send welcome back email to ${data.email}:`, emailResult.error);
                    }
                } catch (error) {
                    console.warn(`Error sending welcome back email to ${data.email}:`, error);
                    // Don't fail the reactivation if email fails
                }

                revalidatePath("/subscribers");

                console.info(`Subscriber reactivated: ${data.email}`);
                return {
                    success: true,
                    message: "Welcome back! Your subscription has been reactivated.",
                    subscriber: {
                        ...reactivatedSubscriber,
                        subscribedAt: new Date(reactivatedSubscriber.subscribedAt),
                        unsubscribedAt: reactivatedSubscriber.unsubscribedAt ? new Date(reactivatedSubscriber.unsubscribedAt) : undefined,
                        lastEngagementAt: reactivatedSubscriber.lastEngagementAt ? new Date(reactivatedSubscriber.lastEngagementAt) : undefined,
                        createdAt: new Date(reactivatedSubscriber.createdAt),
                        updatedAt: new Date(reactivatedSubscriber.updatedAt)
                    }
                };
            } else {
                return {
                    success: false,
                    error: "This email is already subscribed."
                };
            }
        }

        const subscriber = await prisma.subscriber.create({
            data: {
                email: data.email.toLowerCase().trim(),
                name: data.name,
                phone: data.phone,
                status: 'ACTIVE',
                newsletterEnabled: data.newsletterEnabled ?? true,
                marketingEnabled: data.marketingEnabled ?? false,
                productUpdatesEnabled: data.productUpdatesEnabled ?? true,
                weeklyDigestEnabled: data.weeklyDigestEnabled ?? true,
                source: data.source || 'manual',
                tags: data.tags || [],
            }
        });

        // Send welcome email to new subscriber
        try {
            const emailResult = await sendWelcomeEmail(data.email, data.name);
            if (!emailResult.success) {
                console.warn(`Failed to send welcome email to ${data.email}:`, emailResult.error);
            }
        } catch (error) {
            console.warn(`Error sending welcome email to ${data.email}:`, error);
            // Don't fail the subscription if email fails
        }

        revalidatePath("/subscribers");

        console.info(`New subscriber added: ${data.email}`);
        return {
            success: true,
            message: "Thank you for subscribing! You'll receive updates according to your preferences. Check your email for a welcome message!",
            subscriber: {
                ...subscriber,
                subscribedAt: new Date(subscriber.subscribedAt),
                unsubscribedAt: subscriber.unsubscribedAt ? new Date(subscriber.unsubscribedAt) : undefined,
                lastEngagementAt: subscriber.lastEngagementAt ? new Date(subscriber.lastEngagementAt) : undefined,
                createdAt: new Date(subscriber.createdAt),
                updatedAt: new Date(subscriber.updatedAt)
            }
        };
    } catch (error) {
        console.error(`Failed to add subscriber ${data.email}:`, error);
        return {
            success: false,
            error: "Failed to subscribe. Please try again later."
        };
    }
}

export async function updateSubscriber(id: number, data: {
    name?: string;
    phone?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'UNSUBSCRIBED' | 'BOUNCED';
    newsletterEnabled?: boolean;
    marketingEnabled?: boolean;
    productUpdatesEnabled?: boolean;
    weeklyDigestEnabled?: boolean;
    source?: string;
    tags?: string[];
    lastEngagementAt?: Date;
}) {
    try {
        const existingSubscriber = await prisma.subscriber.findUnique({
            where: { id },
        });

        if (!existingSubscriber) {
            console.error(`Subscriber update failed - not found: ${id}`);
            throw new Error("Subscriber not found");
        }

        // If unsubscribing, set unsubscribedAt timestamp
        const updateData: any = { ...data };
        if (data.status === 'UNSUBSCRIBED' && !existingSubscriber.unsubscribedAt) {
            updateData.unsubscribedAt = new Date();
        } else if (data.status === 'ACTIVE' && existingSubscriber.unsubscribedAt) {
            updateData.unsubscribedAt = null;
        }

        const subscriber = await prisma.subscriber.update({
            where: { id },
            data: updateData
        });

        revalidatePath("/subscribers");

        console.info(`Subscriber updated: ${existingSubscriber.email} (ID: ${id})`);
        return {
            ...subscriber,
            subscribedAt: new Date(subscriber.subscribedAt),
            unsubscribedAt: subscriber.unsubscribedAt ? new Date(subscriber.unsubscribedAt) : undefined,
            lastEngagementAt: subscriber.lastEngagementAt ? new Date(subscriber.lastEngagementAt) : undefined,
            createdAt: new Date(subscriber.createdAt),
            updatedAt: new Date(subscriber.updatedAt)
        } as Subscriber;
    } catch (error) {
        console.error(`Failed to update subscriber ${id}:`, error);
        throw new Error("Failed to update subscriber");
    }
}

export async function deleteSubscriber(id: number) {
    try {
        const existingSubscriber = await prisma.subscriber.findUnique({
            where: { id },
        });

        if (!existingSubscriber) {
            console.error(`Subscriber deletion failed - not found: ${id}`);
            throw new Error("Subscriber not found");
        }

        await prisma.subscriber.delete({
            where: { id }
        });

        revalidatePath("/subscribers");
        
        console.info(`Subscriber deleted: ${existingSubscriber.email} (ID: ${id})`);
        return { success: true };
    } catch (error) {
        console.error(`Failed to delete subscriber ${id}:`, error);
        throw new Error("Failed to delete subscriber");
    }
}

export async function getSubscriberById(id: number) {
    try {
        const subscriber = await prisma.subscriber.findUnique({
            where: { id }
        });

        if (!subscriber) {
            console.error(`Subscriber not found: ${id}`);
            throw new Error("Subscriber not found");
        }

        return {
            ...subscriber,
            subscribedAt: new Date(subscriber.subscribedAt),
            unsubscribedAt: subscriber.unsubscribedAt ? new Date(subscriber.unsubscribedAt) : undefined,
            lastEngagementAt: subscriber.lastEngagementAt ? new Date(subscriber.lastEngagementAt) : undefined,
            createdAt: new Date(subscriber.createdAt),
            updatedAt: new Date(subscriber.updatedAt)
        } as Subscriber;
    } catch (error) {
        console.error(`Failed to fetch subscriber by ID ${id}:`, error);
        throw new Error("Failed to fetch subscriber");
    }
}

export async function getSubscriberByEmail(email: string) {
    try {
        const subscriber = await prisma.subscriber.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        if (!subscriber) {
            return null;
        }

        return {
            ...subscriber,
            subscribedAt: new Date(subscriber.subscribedAt),
            unsubscribedAt: subscriber.unsubscribedAt ? new Date(subscriber.unsubscribedAt) : undefined,
            lastEngagementAt: subscriber.lastEngagementAt ? new Date(subscriber.lastEngagementAt) : undefined,
            createdAt: new Date(subscriber.createdAt),
            updatedAt: new Date(subscriber.updatedAt)
        } as Subscriber;
    } catch (error) {
        console.error(`Failed to fetch subscriber by email ${email}:`, error);
        throw new Error("Failed to fetch subscriber");
    }
}

export async function bulkUnsubscribe(subscriberIds: number[]) {
    try {
        const result = await prisma.subscriber.updateMany({
            where: {
                id: { in: subscriberIds }
            },
            data: {
                status: 'UNSUBSCRIBED',
                unsubscribedAt: new Date()
            }
        });

        revalidatePath("/subscribers");
        
        console.info(`Bulk unsubscribed ${result.count} subscribers`);
        return { success: true, count: result.count };
    } catch (error) {
        console.error("Failed to bulk unsubscribe subscribers:", error);
        throw new Error("Failed to bulk unsubscribe");
    }
}

export async function getSubscriberStats() {
    try {
        const [total, active, unsubscribed, inactive] = await Promise.all([
            prisma.subscriber.count(),
            prisma.subscriber.count({ where: { status: 'ACTIVE' } }),
            prisma.subscriber.count({ where: { status: 'UNSUBSCRIBED' } }),
            prisma.subscriber.count({ where: { status: 'INACTIVE' } })
        ]);

        return {
            total,
            active,
            unsubscribed,
            inactive
        };
    } catch (error) {
        console.error("Failed to fetch subscriber stats:", error);
        throw new Error("Failed to fetch subscriber stats");
    }
} 