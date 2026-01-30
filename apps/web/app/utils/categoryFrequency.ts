import { Category } from "../types/financial";

// Define a generic transaction interface that covers both Income and Expense types
interface Transaction {
  id: number;
  category: {
    id: number;
    name: string;
    color?: string;
  };
  createdAt?: Date;
  date: Date;
}

// Interface for category with usage frequency
interface CategoryWithFrequency extends Category {
  frequency: number;
  lastUsed?: Date;
}

// Interface for category with frequency data for display
export interface CategoryWithFrequencyData extends Category {
  frequency: number;
}

// Helper function to get date 6 months ago
function getSixMonthsAgo(): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - 6);
  return date;
}

// Helper function to filter transactions by date range
function filterTransactionsByDateRange<T extends Transaction>(
  transactions: T[],
  fromDate?: Date,
  toDate?: Date
): T[] {
  if (!fromDate && !toDate) return transactions;
  
  return transactions.filter(transaction => {
    const transactionDate = transaction.date || transaction.createdAt || new Date();
    
    if (fromDate && transactionDate < fromDate) return false;
    if (toDate && transactionDate > toDate) return false;
    
    return true;
  });
}

/**
 * Calculates the frequency of category usage from a list of transactions
 * and returns categories sorted by usage frequency (most used first)
 * Only considers transactions from the last 6 months by default
 */
export function sortCategoriesByFrequency<T extends Transaction>(
  categories: Category[],
  transactions: T[],
  options?: {
    fromDate?: Date;
    toDate?: Date;
    useLastSixMonths?: boolean;
  }
): Category[] {
  const { fromDate, toDate, useLastSixMonths = true } = options || {};
  
  // Filter transactions to last 6 months if enabled
  let filteredTransactions = transactions;
  if (useLastSixMonths && !fromDate) {
    const sixMonthsAgo = getSixMonthsAgo();
    filteredTransactions = filterTransactionsByDateRange(transactions, sixMonthsAgo);
  } else if (fromDate || toDate) {
    filteredTransactions = filterTransactionsByDateRange(transactions, fromDate, toDate);
  }
  
  // Create a frequency map to count category usage
  const frequencyMap = new Map<number, { count: number; lastUsed: Date }>();
  
  // Initialize all categories with zero frequency
  categories.forEach(category => {
    frequencyMap.set(category.id, { count: 0, lastUsed: new Date(0) });
  });
  
  // Count frequency and track last usage for each category
  filteredTransactions.forEach(transaction => {
    const categoryId = transaction.category.id;
    const existing = frequencyMap.get(categoryId);
    
    if (existing) {
      existing.count += 1;
      // Use the transaction date as last used, fallback to createdAt or current date
      const transactionDate = transaction.date || transaction.createdAt || new Date();
      if (transactionDate > existing.lastUsed) {
        existing.lastUsed = transactionDate;
      }
    }
  });
  
  // Convert categories to include frequency data
  const categoriesWithFrequency: CategoryWithFrequency[] = categories.map(category => {
    const usage = frequencyMap.get(category.id) || { count: 0, lastUsed: new Date(0) };
    return {
      ...category,
      frequency: usage.count,
      lastUsed: usage.lastUsed
    };
  });
  
  // Sort categories by:
  // 1. Frequency (descending) - most used first
  // 2. Last used date (descending) - more recently used first among categories with same frequency
  // 3. Name (ascending) - alphabetical for categories with same frequency and no usage
  const sortedCategories = categoriesWithFrequency.sort((a, b) => {
    // Primary sort: by frequency (higher first)
    if (a.frequency !== b.frequency) {
      return b.frequency - a.frequency;
    }
    
    // Secondary sort: by last used date (more recent first)
    if (a.lastUsed && b.lastUsed && a.lastUsed.getTime() !== b.lastUsed.getTime()) {
      return b.lastUsed.getTime() - a.lastUsed.getTime();
    }
    
    // Tertiary sort: alphabetical by name
    return a.name.localeCompare(b.name);
  });
  
  // Return categories without the frequency metadata
  return sortedCategories.map(({ frequency, lastUsed, ...category }) => category);
}

/**
 * Returns categories with their frequency data for display purposes
 * Only considers transactions from the last 6 months by default
 */
export function getCategoriesWithFrequency<T extends Transaction>(
  categories: Category[],
  transactions: T[],
  options?: {
    fromDate?: Date;
    toDate?: Date;
    useLastSixMonths?: boolean;
  }
): CategoryWithFrequencyData[] {
  const { fromDate, toDate, useLastSixMonths = true } = options || {};
  
  // Filter transactions to last 6 months if enabled
  let filteredTransactions = transactions;
  if (useLastSixMonths && !fromDate) {
    const sixMonthsAgo = getSixMonthsAgo();
    filteredTransactions = filterTransactionsByDateRange(transactions, sixMonthsAgo);
  } else if (fromDate || toDate) {
    filteredTransactions = filterTransactionsByDateRange(transactions, fromDate, toDate);
  }
  
  // Create a frequency map to count category usage
  const frequencyMap = new Map<number, number>();
  
  // Initialize all categories with zero frequency
  categories.forEach(category => {
    frequencyMap.set(category.id, 0);
  });
  
  // Count frequency for each category
  filteredTransactions.forEach(transaction => {
    const categoryId = transaction.category.id;
    const currentCount = frequencyMap.get(categoryId) || 0;
    frequencyMap.set(categoryId, currentCount + 1);
  });
  
  // Convert categories to include frequency data and sort
  const categoriesWithFrequency: CategoryWithFrequencyData[] = categories.map(category => ({
    ...category,
    frequency: frequencyMap.get(category.id) || 0
  }));
  
  // Sort by frequency (descending) then by name (ascending)
  return categoriesWithFrequency.sort((a, b) => {
    if (a.frequency !== b.frequency) {
      return b.frequency - a.frequency;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Gets the top N most frequently used categories
 */
export function getTopFrequentCategories<T extends Transaction>(
  categories: Category[],
  transactions: T[],
  limit: number = 5
): Category[] {
  const sortedCategories = sortCategoriesByFrequency(categories, transactions);
  return sortedCategories.slice(0, limit);
}

/**
 * Gets category usage statistics for debugging or analytics
 * Only considers transactions from the last 6 months by default
 */
export function getCategoryUsageStats<T extends Transaction>(
  categories: Category[],
  transactions: T[],
  options?: {
    fromDate?: Date;
    toDate?: Date;
    useLastSixMonths?: boolean;
  }
): Array<{ category: Category; frequency: number; lastUsed?: Date }> {
  const { fromDate, toDate, useLastSixMonths = true } = options || {};
  
  // Filter transactions to last 6 months if enabled
  let filteredTransactions = transactions;
  if (useLastSixMonths && !fromDate) {
    const sixMonthsAgo = getSixMonthsAgo();
    filteredTransactions = filterTransactionsByDateRange(transactions, sixMonthsAgo);
  } else if (fromDate || toDate) {
    filteredTransactions = filterTransactionsByDateRange(transactions, fromDate, toDate);
  }
  
  const frequencyMap = new Map<number, { count: number; lastUsed: Date }>();
  
  // Initialize all categories
  categories.forEach(category => {
    frequencyMap.set(category.id, { count: 0, lastUsed: new Date(0) });
  });
  
  // Count usage
  filteredTransactions.forEach(transaction => {
    const categoryId = transaction.category.id;
    const existing = frequencyMap.get(categoryId);
    
    if (existing) {
      existing.count += 1;
      const transactionDate = transaction.date || transaction.createdAt || new Date();
      if (transactionDate > existing.lastUsed) {
        existing.lastUsed = transactionDate;
      }
    }
  });
  
  // Return stats sorted by frequency
  return categories
    .map(category => {
      const usage = frequencyMap.get(category.id) || { count: 0, lastUsed: new Date(0) };
      return {
        category,
        frequency: usage.count,
        lastUsed: usage.count > 0 ? usage.lastUsed : undefined
      };
    })
    .sort((a, b) => b.frequency - a.frequency);
}