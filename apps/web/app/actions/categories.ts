"use server";

import { revalidatePath } from "next/cache";
import prisma from "@repo/db/client";
import { Category } from "../types/financial";
import { 
    getUserIdFromSession, 
    getAuthenticatedSession 
} from "../utils/auth";

export async function getCategories(type?: "EXPENSE" | "INCOME") {
    try {
        const session = await getAuthenticatedSession();
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
        console.error("Failed to fetch categories:", error);
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
        const session = await getAuthenticatedSession();
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

        console.info(`Category created successfully: ${data.name} (${data.type}) for user ${userId}`);

        return {
            ...category,
            createdAt: new Date(category.createdAt),
            updatedAt: new Date(category.updatedAt)
        } as Category;
    } catch (error) {
        console.error(`Failed to create category: ${data.name}`, error);
        throw new Error("Failed to create category");
    }
}

export async function updateCategory(id: number, data: {
    name?: string;
    color?: string;
    icon?: string;
}) {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Verify the category belongs to the user
        const existingCategory = await prisma.category.findFirst({
            where: {
                id,
                userId: userId,
            },
        });

        if (!existingCategory) {
            console.error(`Category update failed - not found or unauthorized: ${id} for user ${userId}`);
            throw new Error("Category not found or unauthorized");
        }

        const category = await prisma.category.update({
            where: { id },
            data: data
        });

        revalidatePath("/(dashboard)/expenses");
        revalidatePath("/(dashboard)/incomes");

        console.info(`Category updated successfully: ${id} for user ${userId}`);

        return {
            ...category,
            createdAt: new Date(category.createdAt),
            updatedAt: new Date(category.updatedAt)
        } as Category;
    } catch (error) {
        console.error(`Failed to update category ${id}:`, error);
        throw new Error("Failed to update category");
    }
}

export async function deleteCategory(id: number) {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Verify the category belongs to the user
        const existingCategory = await prisma.category.findFirst({
            where: {
                id,
                userId: userId,
            },
        });

        if (!existingCategory) {
            console.error(`Category deletion failed - not found or unauthorized: ${id} for user ${userId}`);
            throw new Error("Category not found or unauthorized");
        }

        await prisma.category.delete({
            where: { id }
        });

        revalidatePath("/(dashboard)/expenses");
        revalidatePath("/(dashboard)/incomes");
        
        console.info(`Category deleted successfully: ${id} for user ${userId}`);
        return { success: true };
    } catch (error) {
        console.error(`Failed to delete category ${id}:`, error);
        throw new Error("Failed to delete category");
    }
} 