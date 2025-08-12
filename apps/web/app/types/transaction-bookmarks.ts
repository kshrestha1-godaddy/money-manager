export interface TransactionBookmark {
  id: number;
  transactionType: 'INCOME' | 'EXPENSE';
  transactionId: number;
  title: string;
  description?: string | null;
  notes?: string | null;
  tags: string[];
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionBookmarkFormData = {
  transactionType: 'INCOME' | 'EXPENSE';
  transactionId: number;
  title: string;
  description?: string;
  notes?: string;
  tags?: string[];
};

export type TransactionBookmarkUpdateData = Partial<Omit<TransactionBookmarkFormData, 'transactionType' | 'transactionId'>> & {
  id: number;
};

export type BookmarkedTransaction = {
  bookmark: TransactionBookmark;
  transaction: {
    id: number;
    title: string;
    amount: number;
    date: Date;
    category: {
      id: number;
      name: string;
      color: string;
    };
    account?: {
      id: number;
      bankName: string;
      holderName: string;
      accountType: string;
    } | null;
  };
};

export interface CalendarBookmarkEvent {
  id: string;
  date: string; // Human-readable format like "January 15, 2024" (same as ExpenseList)
  title: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  category: string;
  notes?: string;
  transactionId: number;
  bookmarkId: number;
}

export interface CalendarDebtEvent {
  id: string;
  date: string; // YYYY-MM-DD in local timezone
  title: string;
  type: "DEBT_DUE";
  borrowerName: string;
  amount: number;
  status: string;
  debtId: number;
  isOverdue: boolean;
} 