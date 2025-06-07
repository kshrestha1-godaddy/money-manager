"use server";

import { revalidatePath } from "next/cache";
import { Income } from "../types/financial";

// Mock database operations - replace with actual Prisma calls
let incomes: Income[] = [];

export async function getIncomes() {
    return incomes;
}

export async function createIncome(data: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) {
    const newIncome: Income = {
        ...data,
        id: Math.max(0, ...incomes.map(i => i.id)) + 1,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    incomes.unshift(newIncome);
    revalidatePath("/incomes");
    
    return newIncome;
}

export async function updateIncome(id: number, data: Partial<Omit<Income, 'id' | 'createdAt' | 'updatedAt'>>) {
    const incomeIndex = incomes.findIndex(i => i.id === id);
    if (incomeIndex === -1) {
        throw new Error("Income not found");
    }
    
    const originalIncome = incomes[incomeIndex];
    if (!originalIncome) {
        throw new Error("Income not found");
    }
    
    const updatedIncome: Income = {
        ...originalIncome,
        ...data,
        id: originalIncome.id,
        createdAt: originalIncome.createdAt,
        updatedAt: new Date()
    } as Income;
    
    incomes[incomeIndex] = updatedIncome;
    revalidatePath("/incomes");
    
    return updatedIncome;
}

export async function deleteIncome(id: number) {
    const incomeIndex = incomes.findIndex(i => i.id === id);
    if (incomeIndex === -1) {
        throw new Error("Income not found");
    }
    
    incomes.splice(incomeIndex, 1);
    revalidatePath("/incomes");
    
    return { success: true };
}

export async function getIncomesByCategory(categoryId: number) {
    return incomes.filter(income => income.categoryId === categoryId);
}

export async function getIncomesByDateRange(startDate: Date, endDate: Date) {
    return incomes.filter(income => 
        income.date >= startDate && income.date <= endDate
    );
} 