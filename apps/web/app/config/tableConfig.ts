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
    checkbox: 48,
    accountDetails: 180,
    bankBranch: 260,
    openingDate: 120,
    accountNumber: 160,
    balance: 100,
    freeBalance: 100,
    actions: 248,
  },

  // Debt table column widths
  debts: {
    checkbox: 48,
    borrowerDetails: 180,
    amountStatus: 130,
    interestProgress: 280,
    dates: 160,
    remaining: 100,
    actions: 248,
  },

  // Investment table column widths
  investments: {
    checkbox: 48,
    investment: 220,
    target: 200,
    type: 130,
    bank: 160,
    quantityInterest: 180,
    purchasePrincipal: 140,
    currentValue: 110,
    totalValue: 100,
    isWithheld: 100,
    gainLoss: 110,
    purchaseDate: 180,
    actions: 248,
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
  freeBalance: number;
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
  target: number;
  type: number;
  bank: number;
  quantityInterest: number;
  purchasePrincipal: number;
  currentValue: number;
  totalValue: number;
  isWithheld: number;
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