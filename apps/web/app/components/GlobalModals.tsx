"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { AddExpenseModal } from "./expenses/AddExpenseModal";
import { AddIncomeModal } from "./incomes/AddIncomeModal";
import { useModals } from "../providers/ModalsProvider";
import { useRouter, usePathname } from "next/navigation";
import { getCategories } from "../actions/categories";
import { getAllAccounts } from "../actions/accounts";
import { createExpense } from "../actions/expenses";
import { createIncome } from "../actions/incomes";
import { Expense, Income, Category } from "../types/financial";
import { AccountInterface } from "../types/accounts";
import { triggerBalanceRefresh } from "../hooks/useTotalBalance";

export function GlobalModals() {
  const { 
    isExpenseModalOpen, 
    closeExpenseModal, 
    isIncomeModalOpen, 
    closeIncomeModal 
  } = useModals();
  
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<AccountInterface[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch categories and accounts for the modals
  useEffect(() => {
    async function fetchData() {
      try {
        const [expenseCategoriesData, incomeCategoriesData, accountsData] = await Promise.all([
          getCategories("EXPENSE"),
          getCategories("INCOME"),
          getAllAccounts()
        ]);
        setExpenseCategories(expenseCategoriesData);
        setIncomeCategories(incomeCategoriesData);
        setAccounts(accountsData);
      } catch (error) {
        console.error("Error fetching data for modals:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (isExpenseModalOpen || isIncomeModalOpen) {
      fetchData();
    }
  }, [isExpenseModalOpen, isIncomeModalOpen]);

  // Handle adding a new expense
  const handleAddExpense = async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newExpense = await createExpense(expense);
      closeExpenseModal();
      
      // Optimistically update the cache
      queryClient.setQueryData(['expenses'], (oldExpenses: Expense[] = []) => {
        return [newExpense, ...oldExpenses];
      });
      
      // Invalidate related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      
      // Trigger balance refresh
      triggerBalanceRefresh();
    } catch (error) {
      console.error("Error creating expense:", error);
      alert("Failed to create expense. Please try again.");
    }
  };

  // Handle adding a new income
  const handleAddIncome = async (income: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newIncome = await createIncome(income);
      closeIncomeModal();
      
      // Optimistically update the cache
      queryClient.setQueryData(['incomes'], (oldIncomes: Income[] = []) => {
        return [newIncome, ...oldIncomes];
      });
      
      // Invalidate related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      
      // Trigger balance refresh
      triggerBalanceRefresh();
    } catch (error) {
      console.error("Error creating income:", error);
      alert("Failed to create income. Please try again.");
    }
  };

  if (isLoading) {
    return null; // Don't render modals until data is loaded
  }

  return (
    <>
      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={closeExpenseModal}
        onAdd={handleAddExpense}
        categories={expenseCategories}
        accounts={accounts}
      />
      
      <AddIncomeModal
        isOpen={isIncomeModalOpen}
        onClose={closeIncomeModal}
        onAdd={handleAddIncome}
        categories={incomeCategories}
        accounts={accounts}
      />
    </>
  );
} 