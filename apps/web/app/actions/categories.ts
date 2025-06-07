"use server";

import { revalidatePath } from "next/cache";
import { PrismaClient } from "@prisma/client";
import { Category } from "../types/financial";

const prisma = new PrismaClient();

export async function getCategories(type?: "EXPENSE" | "INCOME") {
    try {
        const where = type ? { type } : {};
        
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
        const category = await prisma.category.create({
            data: {
                name: data.name,
                type: data.type,
                color: data.color,
                icon: data.icon
            }
        });

        revalidatePath("/expenses");
        revalidatePath("/incomes");

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
        const category = await prisma.category.update({
            where: { id },
            data: data
        });

        revalidatePath("/expenses");
        revalidatePath("/incomes");

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
        await prisma.category.delete({
            where: { id }
        });

        revalidatePath("/expenses");
        revalidatePath("/incomes");
        
        return { success: true };
    } catch (error) {
        console.error("Error deleting category:", error);
        throw new Error("Failed to delete category");
    }
} 