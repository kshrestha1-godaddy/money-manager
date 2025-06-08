import { AccountInterface } from './accounts';

export interface Category {
  id: number;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  color: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: number;
  title: string;
  description?: string;
  amount: number;
  date: Date;
  category: Category;
  categoryId: number;
  account: AccountInterface;
  accountId: number;
  userId: number;
  tags: string[];
  receipt?: string;
  notes?: string;
  isRecurring: boolean;
  recurringFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  createdAt: Date;
  updatedAt: Date;
}

export interface Income {
  id: number;
  title: string;
  description?: string;
  amount: number;
  date: Date;
  category: Category;
  categoryId: number;
  account: AccountInterface;
  accountId: number;
  userId: number;
  tags: string[];
  notes?: string;
  isRecurring: boolean;
  recurringFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  createdAt: Date;
  updatedAt: Date;
}

export interface Investment {
  id: number;
  name: string;
  type: 'STOCKS' | 'CRYPTO' | 'MUTUAL_FUNDS' | 'BONDS' | 'REAL_ESTATE' | 'GOLD' | 'OTHER';
  symbol?: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: Date;
  accountId: number;
  userId: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetTarget {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  startDate: Date;
  endDate: Date;
  userId: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string | number;
  type: 'EXPENSE' | 'INCOME';
  title: string;
  amount: number;
  date: Date;
  category: string;
  account: string;
}

export interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  totalInvestments: number;
  recentTransactions: Transaction[];
} 