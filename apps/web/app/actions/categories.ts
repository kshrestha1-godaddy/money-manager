"use server";

import { revalidatePath } from "next/cache";
import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { Category } from "../types/financial";

// Helper function to get user ID from session
function getUserIdFromSession(sessionUserId: string): number {
    // If it's a very large number (OAuth provider), take last 5 digits
    if (sessionUserId.length > 5) {
        return parseInt(sessionUserId.slice(-5));
    }
    // Otherwise parse normally
    return parseInt(sessionUserId);
}

export async function getCategories(type?: "EXPENSE" | "INCOME") {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);
        const where = type ? { type, userId } : { userId };
        
        const categories = await prisma.category.findMany({
            where,
            orderBy: {
                name: 'asc'
            }
        });

        // Transform Prisma result to match our Category type
        return categories.map(category => ({
            ...category,
            createdAt: new Date(category.createdAt),
            updatedAt: new Date(category.updatedAt)
        })) as Category[];
    } catch (error) {
        console.error("Error fetching categories:", error);
        throw new Error("Failed to fetch categories");
    }
}

export async function createCategory(data: {
    name: string;
    type: "EXPENSE" | "INCOME";
    color: string;
    icon?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        const category = await prisma.category.create({
            data: {
                name: data.name,
                type: data.type,
                color: data.color,
                icon: data.icon,
                userId: userId
            }
        });

        revalidatePath("/(dashboard)/expenses");
        revalidatePath("/(dashboard)/incomes");

        return {
            ...category,
            createdAt: new Date(category.createdAt),
            updatedAt: new Date(category.updatedAt)
        } as Category;
    } catch (error) {
        console.error("Error creating category:", error);
        throw new Error("Failed to create category");
    }
}

export async function updateCategory(id: number, data: {
    name?: string;
    color?: string;
    icon?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Verify the category belongs to the user
        const existingCategory = await prisma.category.findFirst({
            where: {
                id,
                userId: userId,
            },
        });

        if (!existingCategory) {
            throw new Error("Category not found or unauthorized");
        }

        const category = await prisma.category.update({
            where: { id },
            data: data
        });

        revalidatePath("/(dashboard)/expenses");
        revalidatePath("/(dashboard)/incomes");

        return {
            ...category,
            createdAt: new Date(category.createdAt),
            updatedAt: new Date(category.updatedAt)
        } as Category;
    } catch (error) {
        console.error("Error updating category:", error);
        throw new Error("Failed to update category");
    }
}

export async function deleteCategory(id: number) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Verify the category belongs to the user
        const existingCategory = await prisma.category.findFirst({
            where: {
                id,
                userId: userId,
            },
        });

        if (!existingCategory) {
            throw new Error("Category not found or unauthorized");
        }

        await prisma.category.delete({
            where: { id }
        });

        revalidatePath("/(dashboard)/expenses");
        revalidatePath("/(dashboard)/incomes");
        
        return { success: true };
    } catch (error) {
        console.error("Error deleting category:", error);
        throw new Error("Failed to delete category");
    }
} 