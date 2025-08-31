"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { AddExpenseModal } from "../(dashboard)/expenses/components/AddExpenseModal";
import { AddIncomeModal } from "../(dashboard)/incomes/components";
import { useModals } from "../providers/ModalsProvider";
import { useRouter, usePathname } from "next/navigation";
import { getCategories } from "../actions/categories";
import { getUserAccounts } from "../(dashboard)/accounts/actions/accounts";
import { createExpense } from "../(dashboard)/expenses/actions/expenses";
import { createIncome } from "../(dashboard)/incomes/actions/incomes";
import { Expense, Income, Category } from "../types/financial";
import { AccountInterface } from "../types/accounts";
import { triggerBalanceRefresh } from "../hooks/useTotalBalance";
import { DisappearingNotification, NotificationData } from "./DisappearingNotification";
import { formatCurrency } from "../utils/currency";
import { useCurrency } from "../providers/CurrencyProvider";

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
  const { currency } = useCurrency();
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<AccountInterface[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationData | null>(null);

  // Fetch categories and accounts for the modals
  useEffect(() => {
    async function fetchData() {
      try {
        const [expenseCategoriesData, incomeCategoriesData, accountsData] = await Promise.all([
          getCategories("EXPENSE"),
          getCategories("INCOME"),
          getUserAccounts()
        ]);
        setExpenseCategories(expenseCategoriesData);
        setIncomeCategories(incomeCategoriesData);
        
        if (accountsData && !('error' in accountsData)) {
          setAccounts(accountsData);
        } else {
          console.error("Error loading accounts for quick actions:", accountsData?.error);
          setAccounts([]);
        }
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
      
      // Show success notification
      setNotification({
        title: "Expense Added Successfully!",
        message: `${expense.title} - ${formatCurrency(expense.amount, currency)} has been recorded`,
        type: "warning",
        duration: 3000,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        )
      });
      
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
      
      // Show error notification
      setNotification({
        title: "Failed to Add Expense",
        message: "Please try again or contact support if the issue persists",
        type: "error",
        duration: 4000
      });
    }
  };

  // Handle adding a new income
  const handleAddIncome = async (income: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newIncome = await createIncome(income);
      closeIncomeModal();
      
      // Show success notification
      setNotification({
        title: "Income Added Successfully!",
        message: `${income.title} - ${formatCurrency(income.amount, currency)} has been recorded`,
        type: "success",
        duration: 3000,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )
      });
      
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
      
      // Show error notification
      setNotification({
        title: "Failed to Add Income",
        message: "Please try again or contact support if the issue persists",
        type: "error",
        duration: 4000
      });
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
      
      {/* Disappearing Notification */}
      <DisappearingNotification 
        notification={notification} 
        onHide={() => setNotification(null)} 
      />
    </>
  );
} 