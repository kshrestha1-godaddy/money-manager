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