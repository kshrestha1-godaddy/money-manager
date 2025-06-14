"use server";

import { revalidatePath } from "next/cache";
import prisma from "@repo/db/client";
import { Subscriber } from "../types/financial";
import { sendWelcomeEmail } from "../lib/email";

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
        console.error("Error fetching subscribers:", error);
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
        // Check if subscriber already exists
        const existingSubscriber = await prisma.subscriber.findUnique({
            where: { email: data.email }
        });

        console.log("Existing subscriber:", existingSubscriber);

        if (existingSubscriber) {
            // If they exist but are unsubscribed, reactivate them
            if (existingSubscriber.status === 'UNSUBSCRIBED' || existingSubscriber.status === 'INACTIVE') {
                const reactivatedSubscriber = await prisma.subscriber.update({
                    where: { email: data.email },
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
                    if (emailResult.success) {
                        console.log("Welcome back email sent successfully to:", data.email);
                    } else {
                        console.error("Failed to send welcome back email:", emailResult.error);
                    }
                } catch (error) {
                    console.error("Error sending welcome back email:", error);
                    // Don't fail the reactivation if email fails
                }

                revalidatePath("/subscribers");

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
                    message: "This email is already subscribed."
                };
            }
        }

        const subscriber = await prisma.subscriber.create({
            data: {
                email: data.email,
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
            if (emailResult.success) {
                console.log("Welcome email sent successfully to:", data.email);
            } else {
                console.error("Failed to send welcome email:", emailResult.error);
            }
        } catch (error) {
            console.error("Error sending welcome email:", error);
            // Don't fail the subscription if email fails
        }

        revalidatePath("/subscribers");

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
        console.error("Error adding subscriber:", error);
        return {
            success: false,
            message: "Failed to subscribe. Please try again later."
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

        return {
            ...subscriber,
            subscribedAt: new Date(subscriber.subscribedAt),
            unsubscribedAt: subscriber.unsubscribedAt ? new Date(subscriber.unsubscribedAt) : undefined,
            lastEngagementAt: subscriber.lastEngagementAt ? new Date(subscriber.lastEngagementAt) : undefined,
            createdAt: new Date(subscriber.createdAt),
            updatedAt: new Date(subscriber.updatedAt)
        } as Subscriber;
    } catch (error) {
        console.error("Error updating subscriber:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to update subscriber");
    }
}

export async function deleteSubscriber(id: number) {
    try {
        const existingSubscriber = await prisma.subscriber.findUnique({
            where: { id },
        });

        if (!existingSubscriber) {
            throw new Error("Subscriber not found");
        }

        await prisma.subscriber.delete({
            where: { id }
        });

        revalidatePath("/subscribers");
        
        return { success: true };
    } catch (error) {
        console.error("Error deleting subscriber:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to delete subscriber");
    }
}

export async function getSubscriberById(id: number) {
    try {
        const subscriber = await prisma.subscriber.findUnique({
            where: { id },
        });

        if (!subscriber) {
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
        console.error("Error fetching subscriber:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to fetch subscriber");
    }
}

export async function getSubscriberByEmail(email: string) {
    try {
        const subscriber = await prisma.subscriber.findUnique({
            where: { email },
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
        console.error("Error fetching subscriber by email:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to fetch subscriber");
    }
}

export async function bulkUnsubscribe(subscriberIds: number[]) {
    try {
        // Verify all subscribers exist
        const subscribers = await prisma.subscriber.findMany({
            where: {
                id: { in: subscriberIds },
            },
        });

        if (subscribers.length !== subscriberIds.length) {
            throw new Error("Some subscribers not found");
        }

        await prisma.subscriber.updateMany({
            where: {
                id: { in: subscriberIds },
            },
            data: {
                status: 'UNSUBSCRIBED',
                unsubscribedAt: new Date(),
            }
        });

        revalidatePath("/subscribers");
        
        return { success: true, count: subscribers.length };
    } catch (error) {
        console.error("Error bulk unsubscribing:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to bulk unsubscribe");
    }
}

export async function getSubscriberStats() {
    try {
        const [total, active, unsubscribed, bounced] = await Promise.all([
            prisma.subscriber.count(),
            prisma.subscriber.count({ where: { status: 'ACTIVE' } }),
            prisma.subscriber.count({ where: { status: 'UNSUBSCRIBED' } }),
            prisma.subscriber.count({ where: { status: 'BOUNCED' } }),
        ]);

        return {
            total,
            active,
            unsubscribed,
            bounced,
            inactive: total - active - unsubscribed - bounced
        };
    } catch (error) {
        console.error("Error fetching subscriber stats:", error);
        throw new Error("Failed to fetch subscriber stats");
    }
} 