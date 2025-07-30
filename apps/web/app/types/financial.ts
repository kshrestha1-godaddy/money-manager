import { AccountInterface } from './accounts';


export type FinancialItem = {
  id: number;
  title: string;
  description?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  amount: number;
  date: Date;
  category: Category;
  account?: AccountInterface | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FinancialDataActions<T extends FinancialItem> = {
  getItems: () => Promise<T[]>;
  createItem: (item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<T>;
  updateItem: (id: number, item: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<T>;
  deleteItem: (id: number) => Promise<any>;
  bulkDeleteItems?: (ids: number[]) => Promise<any>;
  exportToCSV: (items: T[]) => void;
};
export interface Category {
  id: number;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  color: string;
  icon?: string;
  userId: number;
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
  account?: AccountInterface | null;
  accountId?: number | null;
  userId: number;
  tags: string[];
  receipt?: string;
  notes?: string;
  isRecurring: boolean;
  recurringFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  isBookmarked?: boolean;
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
  account?: AccountInterface | null;
  accountId?: number | null;
  userId: number;
  tags: string[];
  notes?: string;
  isRecurring: boolean;
  recurringFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  isBookmarked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Investment {
  id: number;
  name: string;
  type: 'STOCKS' | 'CRYPTO' | 'MUTUAL_FUNDS' | 'BONDS' | 'REAL_ESTATE' | 'GOLD' | 'FIXED_DEPOSIT' | 'PROVIDENT_FUNDS' | 'SAFE_KEEPINGS' | 'OTHER';
  symbol?: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: Date;
  accountId?: number;
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

export interface Subscriber {
  id: number;
  email: string;
  name?: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'UNSUBSCRIBED' | 'BOUNCED';
  subscribedAt: Date;
  unsubscribedAt?: Date;
  newsletterEnabled: boolean;
  marketingEnabled: boolean;
  productUpdatesEnabled: boolean;
  weeklyDigestEnabled: boolean;
  source?: string;
  tags: string[];
  lastEngagementAt?: Date;
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