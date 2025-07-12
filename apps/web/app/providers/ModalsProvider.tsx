"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ModalsContextType {
  isExpenseModalOpen: boolean;
  isIncomeModalOpen: boolean;
  openExpenseModal: () => void;
  closeExpenseModal: () => void;
  openIncomeModal: () => void;
  closeIncomeModal: () => void;
}

const ModalsContext = createContext<ModalsContextType | undefined>(undefined);

export function ModalsProvider({ children }: { children: ReactNode }) {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);

  const openExpenseModal = () => setIsExpenseModalOpen(true);
  const closeExpenseModal = () => setIsExpenseModalOpen(false);
  const openIncomeModal = () => setIsIncomeModalOpen(true);
  const closeIncomeModal = () => setIsIncomeModalOpen(false);

  return (
    <ModalsContext.Provider
      value={{
        isExpenseModalOpen,
        isIncomeModalOpen,
        openExpenseModal,
        closeExpenseModal,
        openIncomeModal,
        closeIncomeModal,
      }}
    >
      {children}
    </ModalsContext.Provider>
  );
}

export function useModals() {
  const context = useContext(ModalsContext);
  if (context === undefined) {
    throw new Error('useModals must be used within a ModalsProvider');
  }
  return context;
} 