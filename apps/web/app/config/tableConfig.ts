// Table column width configurations
// All values are in pixels and represent default widths for table columns

export const TABLE_COLUMN_WIDTHS = {
  // Common column widths
  common: {
    checkbox: 30,
    actions: 240,
    minColumnWidth: 80, // Minimum width for any column during resize
  },

  // Account table column widths
  accounts: {
    checkbox: 30,
    accountDetails: 180,
    bankBranch: 260,
    accountNumber: 180,
    openingDate: 140,
    balance: 160,
    actions: 280,
  },

  // Debt table column widths
  debts: {
    checkbox: 30,
    borrowerDetails: 180,
    amountStatus: 140,
    interestProgress: 300,
    dates: 200,
    remaining: 160,
    actions: 240,
  },

  // Investment table column widths
  investments: {
    checkbox: 40,
    investment: 280,
    type: 140,
    quantityInterest: 200,
    purchasePrincipal: 180,
    currentValue: 160,
    totalValue: 140,
    gainLoss: 160,
    purchaseDate: 140,
    actions: 240,
  },
};

// Type definitions for better type safety
export type AccountColumnWidths = {
  checkbox: number;
  accountDetails: number;
  bankBranch: number;
  accountNumber: number;
  openingDate: number;
  balance: number;
  actions: number;
};

export type DebtColumnWidths = {
  checkbox: number;
  borrowerDetails: number;
  amountStatus: number;
  interestProgress: number;
  dates: number;
  remaining: number;
  actions: number;
};

export type InvestmentColumnWidths = {
  checkbox: number;
  investment: number;
  type: number;
  quantityInterest: number;
  purchasePrincipal: number;
  currentValue: number;
  totalValue: number;
  gainLoss: number;
  purchaseDate: number;
  actions: number;
};

// Helper function to get default column widths for a specific table
export function getDefaultColumnWidths(tableType: 'accounts'): AccountColumnWidths;
export function getDefaultColumnWidths(tableType: 'debts'): DebtColumnWidths;
export function getDefaultColumnWidths(tableType: 'investments'): InvestmentColumnWidths;
export function getDefaultColumnWidths(tableType: 'accounts' | 'debts' | 'investments') {
  return { ...TABLE_COLUMN_WIDTHS[tableType] };
}

// Helper function to get minimum column width
export const getMinColumnWidth = () => TABLE_COLUMN_WIDTHS.common.minColumnWidth; 