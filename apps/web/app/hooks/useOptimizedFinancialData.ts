import { financialItemsKey, financialItemsQuery } from "./financial-items-query";
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Category, FinancialItem, FinancialDataActions } from "../types/financial";
import { AccountInterface } from "../types/accounts";
import { getCategories, createCategory, updateCategory, deleteCategory, setCategoryTab } from "../actions/categories";
import { getUserAccounts } from "../(dashboard)/accounts/actions/accounts";
import { triggerBalanceRefresh } from "./useTotalBalance";
import { exportCategoriesByType } from "../utils/csvExportCategories";
import { NotificationData } from "../components/DisappearingNotification";
import { createTransactionDayFormatter } from "../utils/transaction-calendar";
import { getUserThresholds } from "../actions/notifications";
import { useDisplayCurrency } from "./useDisplayCurrency";


const EMPTY_ITEMS: [] = [];

export interface UseOptimizedFinancialDataOptions {
  fetchCategories?: boolean;
  fetchAccounts?: boolean;
  onNotification?: (notification: NotificationData) => void;
  userCurrency?: string;
  userTimezone?: string;
}

export function useOptimizedFinancialData<T extends FinancialItem>(
  categoryType: "INCOME" | "EXPENSE",
  actions: FinancialDataActions<T>,
  options: UseOptimizedFinancialDataOptions = {}
) {
  const queryClient = useQueryClient();
  const { accountCurrency, formatDisplayAmount } = useDisplayCurrency();
  
  // Query keys for caching - memoize to prevent unnecessary re-renders
  const QUERY_KEYS = useMemo(() => ({
    items: financialItemsKey(categoryType),
    categories: ['categories', categoryType] as const,
    accounts: ['accounts'] as const,
    thresholds: ['user-thresholds'] as const,
  }), [categoryType]);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);

  // Filter states
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState<boolean>(false);

  // Selected item states
  const [itemToEdit, setItemToEdit] = useState<T | null>(null);
  const [itemToView, setItemToView] = useState<T | null>(null);

  // Cached data queries
  const { data: itemData, isLoading: itemsLoading, error: itemsError, refetch: retryItems, isFetching: itemsFetching } = useQuery(
    financialItemsQuery(categoryType, actions.getItems)
  );

  const items = itemData ?? EMPTY_ITEMS;

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: QUERY_KEYS.categories,
    queryFn: () => getCategories(categoryType),
    staleTime: 5 * 60 * 1000, // 5 minutes (categories change less frequently)
    gcTime: 15 * 60 * 1000, // 15 minutes
    enabled: options.fetchCategories !== false,
  });

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: QUERY_KEYS.accounts,
    queryFn: async () => {
      const result = await getUserAccounts();
      return ('error' in result) ? [] : result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    enabled: options.fetchAccounts !== false,
  });

  // Fetch user thresholds alongside other data to prevent multiple renders
  const { data: userThresholds = { autoBookmarkEnabled: true, incomeThreshold: 50000, expenseThreshold: 10000 }, isLoading: thresholdsLoading } = useQuery({
    queryKey: QUERY_KEYS.thresholds,
    queryFn: getUserThresholds,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  const loading = itemsLoading || categoriesLoading || accountsLoading || thresholdsLoading;

  // Optimized mutations with cache updates
  const createItemMutation = useMutation({
    mutationFn: actions.createItem,
    onSuccess: (newItem: T) => {
      // Show success notification if callback provided
      if (options.onNotification) {
        const isExpense = categoryType === "EXPENSE";
        const formattedAmount = formatDisplayAmount(
          newItem.amount,
          newItem.currency || accountCurrency
        );
        
        options.onNotification({
          title: `${isExpense ? 'Expense' : 'Income'} Added Successfully!`,
          message: `${newItem.title} - ${formattedAmount} has been recorded`,
          type: isExpense ? "warning" : "success",
          duration: 3000
        });
      }
      
      // Optimistically update the cache
      queryClient.setQueryData(QUERY_KEYS.items, (oldItems: T[] = []) => {
        return [newItem, ...oldItems];
      });
      // Refresh accounts cache for balance updates
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      if (categoryType === "EXPENSE") queryClient.invalidateQueries({ queryKey: ["investments"] });
      triggerBalanceRefresh();
      setIsAddModalOpen(false);
    },

  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>> }) => 
      actions.updateItem(id, data),
    onSuccess: (updatedItem: T) => {
      // Optimistically update the cache
      queryClient.setQueryData(QUERY_KEYS.items, (oldItems: T[] = []) => {
        return oldItems.map(item => item.id === updatedItem.id ? updatedItem : item);
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      if (categoryType === "EXPENSE") queryClient.invalidateQueries({ queryKey: ["investments"] });
      triggerBalanceRefresh();
      setIsEditModalOpen(false);
      setItemToEdit(null);
    },

  });

  const deleteItemMutation = useMutation({
    mutationFn: ({ id, appLockPassword }: { id: number; appLockPassword: string }) =>
      actions.deleteItem(id, appLockPassword),
    onSuccess: (_: any, { id: deletedId }) => {
      // Optimistically update the cache
      queryClient.setQueryData(QUERY_KEYS.items, (oldItems: T[] = []) => {
        return oldItems.filter(item => item.id !== deletedId);
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      if (categoryType === "EXPENSE") queryClient.invalidateQueries({ queryKey: ["investments"] });
      triggerBalanceRefresh();
    },
    onError: (error: Error) => {
      console.error("Error deleting item:", error);
      alert("Failed to delete item. Please try again.");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: ({ ids, appLockPassword }: { ids: number[]; appLockPassword: string }) => {
      if (actions.bulkDeleteItems) {
        return actions.bulkDeleteItems(ids, appLockPassword);
      }
      return Promise.all(ids.map(id => actions.deleteItem(id, appLockPassword)));
    },
    onSuccess: (_: any, { ids: deletedIds }) => {
      // Optimistically update the cache
      queryClient.setQueryData(QUERY_KEYS.items, (oldItems: T[] = []) => {
        return oldItems.filter(item => !deletedIds.includes(item.id));
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      if (categoryType === "EXPENSE") queryClient.invalidateQueries({ queryKey: ["investments"] });
      triggerBalanceRefresh();
      setSelectedItems(new Set());
    },
    onError: (error: Error) => {
      console.error("Error bulk deleting items:", error);
      alert("Failed to delete items. Please try again.");
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: (newCategory) => {
      // Optimistically update categories cache
      queryClient.setQueryData(QUERY_KEYS.categories, (oldCategories: Category[] = []) => {
        return [...oldCategories, newCategory];
      });
      setIsAddCategoryModalOpen(false);
    },
    onError: (error) => {
      console.error("Error adding category:", error);
      alert("Failed to add category. Please try again.");
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { name: string; color: string; icon?: string };
    }) => updateCategory(id, data),
    onSuccess: (updated) => {
      const previousName = queryClient
        .getQueryData<Category[]>(QUERY_KEYS.categories)
        ?.find((category) => category.id === updated.id)?.name;
      queryClient.setQueryData(QUERY_KEYS.categories, (oldCategories: Category[] = []) => {
        return oldCategories.map((category) =>
          category.id === updated.id ? updated : category,
        );
      });
      queryClient.setQueryData(QUERY_KEYS.items, (oldItems: T[] = []) => {
        return oldItems.map((item) =>
          item.category.id === updated.id ? { ...item, category: updated } : item,
        );
      });
      if (previousName && previousName !== updated.name) {
        setSelectedCategories((current) =>
          current.map((name) => (name === previousName ? updated.name : name)),
        );
      }
    },
    onError: (error) => {
      console.error("Error updating category:", error);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: (_: any, deletedId: number) => {
      // Optimistically update categories cache
      queryClient.setQueryData(QUERY_KEYS.categories, (oldCategories: Category[] = []) => {
        return oldCategories.filter(category => category.id !== deletedId);
      });
    },
    onError: (error) => {
      // Don't show alert here - let the modal handle it
      console.error("Error deleting category:", error);
    },
  });

  const categoryTabMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      setCategoryTab(id, categoryType, enabled),
    onSuccess: (_, { id, enabled }) => {
      queryClient.setQueryData<Category[]>(QUERY_KEYS.categories, (current) =>
        current?.map((category) => category.id === id
          ? { ...category, showAsTransactionTab: enabled }
          : category)
      );
    },
    onError: (error) => {
      console.error("Error updating category tab:", error);
      alert("Failed to update the category tab. Please try again.");
    },
  });

  // Filter logic (memoized for performance)
  const hasActiveFilters = useMemo(() => {
    return !!(
      searchTerm.trim() ||
      selectedCategories.length > 0 ||
      selectedBanks.length > 0 ||
      startDate ||
      endDate ||
      showBookmarkedOnly
    );
  }, [searchTerm, selectedCategories, selectedBanks, startDate, endDate, showBookmarkedOnly]);
  
  const getTransactionDay = useMemo(
    () => createTransactionDayFormatter(options.userTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone),
    [options.userTimezone]
  );
  const itemsWithoutDateFilter = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q && !selectedCategories.length && !selectedBanks.length && !showBookmarkedOnly) return items;

    return items.filter(item => {
      // Search term filtering (includes location strings from expense/income rows)
      const matchesSearch = !q ||
        item.title.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q) ||
        item.category.name.toLowerCase().includes(q) ||
        (item.tags && item.tags.some((tag) => tag.toLowerCase().includes(q))) ||
        (item.location?.some((loc) => loc.toLowerCase().includes(q)) ?? false);
                          
      // Category filtering (empty = all categories)
      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(item.category.name);
      
      // Bank filtering
      const matchesBank = selectedBanks.length === 0 || (item.account && selectedBanks.includes(item.account.bankName));
      
      // Bookmark filtering
      const matchesBookmark = !showBookmarkedOnly || (item as any).isBookmarked;

      return matchesSearch && matchesCategory && matchesBank && matchesBookmark;
    });
  }, [items, searchTerm, selectedCategories, selectedBanks, showBookmarkedOnly]);

  const filteredItems = useMemo(() => {
    if (!startDate && !endDate) return itemsWithoutDateFilter;

    return itemsWithoutDateFilter.filter(item => {
      const day = getTransactionDay(item.date);
      return day && (!startDate || day >= startDate) && (!endDate || day <= endDate);
    });
  }, [itemsWithoutDateFilter, startDate, endDate, getTransactionDay]);

  const uniqueBankNames = useMemo(() => 
    Array.from(new Set(accounts.map(account => account.bankName))).sort(), 
    [accounts]
  );

  // CRUD Handlers
  const handleAddItem = useCallback((newItem: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => {
    return createItemMutation.mutateAsync(newItem);
  }, [createItemMutation]);

  const handleEditItem = useCallback((id: number, updatedItem: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>) => {
    return updateItemMutation.mutateAsync({ id, data: updatedItem });
  }, [updateItemMutation]);

  const handleDeleteItem = useCallback((appLockPassword: string, itemId: number) => {
    deleteItemMutation.mutate({ id: itemId, appLockPassword });
  }, [deleteItemMutation]);

  const handleAddCategory = useCallback((newCategory: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    createCategoryMutation.mutate(newCategory);
  }, [createCategoryMutation]);

  const handleDeleteCategory = useCallback(async (categoryId: number) => {
    // Return a promise that the modal can handle
    return deleteCategoryMutation.mutateAsync(categoryId);
  }, [deleteCategoryMutation]);

  const handleUpdateCategory = useCallback(
    async (categoryId: number, data: { name: string; color: string; icon?: string }) => {
      return updateCategoryMutation.mutateAsync({ id: categoryId, data });
    },
    [updateCategoryMutation],
  );

  // Modal handlers
  const openEditModal = useCallback((item: T) => {
    setItemToEdit(item);
    setIsEditModalOpen(true);
  }, []);

  const openViewModal = useCallback((item: T) => {
    setItemToView(item);
    setIsViewModalOpen(true);
  }, []);

  // Selection handlers
  const handleItemSelect = useCallback((itemId: number, selected: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean, visibleItems: T[] = filteredItems) => {
    if (selected) {
      setSelectedItems(new Set(visibleItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  }, [filteredItems]);

  // The password prompt carries the confirmation, so no native confirm here.
  const handleBulkDelete = useCallback((appLockPassword: string, visibleIds: number[]) => {
    const itemIds = visibleIds.filter((id) => selectedItems.has(id));
    if (itemIds.length === 0 || bulkDeleteMutation.isPending) return;

    bulkDeleteMutation.mutate({ ids: itemIds, appLockPassword });
  }, [selectedItems, bulkDeleteMutation]);

  const invalidateFinancialQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.items }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.thresholds }),
      ...(categoryType === "EXPENSE" ? [queryClient.invalidateQueries({ queryKey: ["investments"] })] : []),
    ]);
  }, [queryClient, QUERY_KEYS, categoryType]);

  const handleBulkImportSuccess = useCallback(async () => {
    await invalidateFinancialQueries();
    triggerBalanceRefresh();
  }, [invalidateFinancialQueries]);

  const handleExportToCSV = useCallback((visibleItems: T[] = filteredItems) => {
    if (visibleItems.length === 0) {
      alert(`No ${categoryType.toLowerCase()}s to export`);
      return;
    }
    
    try {
      // Export the main financial data
      actions.exportToCSV(visibleItems);
      
      // Also export categories for this type in a separate file
      if (categories && categories.length > 0) {
        // Filter categories by the current type (EXPENSE or INCOME)
        const relevantCategories = categories.filter(category => category.type === categoryType);
        if (relevantCategories.length > 0) {
          exportCategoriesByType(categories, categoryType);
        }
      }
    } catch (error) {
      console.error(`Error exporting ${categoryType.toLowerCase()}s:`, error);
      alert(`Failed to export ${categoryType.toLowerCase()}s. Please try again.`);
    }
  }, [filteredItems, categoryType, categories, actions]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedCategories([]);
    setSelectedBanks([]);
    setStartDate("");
    setEndDate("");
    setShowBookmarkedOnly(false);
  }, []);

  return {
    // Data
    items: filteredItems,
    itemsWithoutDateFilter,
    allItems: items,
    itemsError: itemData ? null : itemsError,
    retryItems,
    itemsFetching,
    isBulkDeleting: bulkDeleteMutation.isPending,
    categories,
    accounts,
    loading,
    uniqueBankNames,
    hasActiveFilters,

    // Modal states
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    isViewModalOpen,
    setIsViewModalOpen,
    isAddCategoryModalOpen,
    setIsAddCategoryModalOpen,
    isBulkImportModalOpen,
    setIsBulkImportModalOpen,

    // Filter states
    selectedItems,
    selectedCategories,
    setSelectedCategories,
    selectedBanks,
    setSelectedBanks,
    searchTerm,
    setSearchTerm,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    showBookmarkedOnly,
    setShowBookmarkedOnly,

    // Selected items
    itemToEdit,
    setItemToEdit,
    itemToView,
    setItemToView,

    // Handlers
    handleAddItem,
    handleEditItem,
    handleDeleteItem,
    handleAddCategory,
    handleDeleteCategory,
    handleUpdateCategory,
    openEditModal,
    openViewModal,
    handleItemSelect,
    handleSelectAll,
    handleBulkDelete,
    handleBulkImportSuccess,
    handleExportToCSV,
    clearFilters,
    
    // Mutations
    createItemMutation,
    updateItemMutation,
    deleteItemMutation,
    bulkDeleteMutation,
    createCategoryMutation,
    updateCategoryMutation,
    deleteCategoryMutation,
    categoryTabMutation,
    
    // User thresholds
    userThresholds,
    thresholdsLoading,
    
    invalidateQueries: invalidateFinancialQueries,
  };
}
