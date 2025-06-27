import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Category, FinancialItem, FinancialDataActions } from "../types/financial";
import { AccountInterface } from "../types/accounts";
import { getCategories, createCategory } from "../actions/categories";
import { getUserAccounts } from "../actions/accounts";
import { triggerBalanceRefresh } from "./useTotalBalance";


export function useOptimizedFinancialData<T extends FinancialItem>(
  categoryType: "INCOME" | "EXPENSE",
  actions: FinancialDataActions<T>
) {
  const queryClient = useQueryClient();
  
  // Query keys for caching - memoize to prevent unnecessary re-renders
  const QUERY_KEYS = useMemo(() => ({
    items: [`${categoryType.toLowerCase()}s`] as const,
    categories: ['categories', categoryType] as const,
    accounts: ['accounts'] as const,
  }), [categoryType]);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);

  // Filter states
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Selected item states
  const [itemToEdit, setItemToEdit] = useState<T | null>(null);
  const [itemToView, setItemToView] = useState<T | null>(null);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);

  // Cached data queries
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: QUERY_KEYS.items,
    queryFn: actions.getItems,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: QUERY_KEYS.categories,
    queryFn: () => getCategories(categoryType),
    staleTime: 5 * 60 * 1000, // 5 minutes (categories change less frequently)
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: QUERY_KEYS.accounts,
    queryFn: async () => {
      const result = await getUserAccounts();
      return ('error' in result) ? [] : result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  const loading = itemsLoading || categoriesLoading || accountsLoading;

  // Optimized mutations with cache updates
  const createItemMutation = useMutation({
    mutationFn: actions.createItem,
    onSuccess: (newItem: T) => {
      // Optimistically update the cache
      queryClient.setQueryData(QUERY_KEYS.items, (oldItems: T[] = []) => {
        return [newItem, ...oldItems];
      });
      // Refresh accounts cache for balance updates
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      triggerBalanceRefresh();
      setIsAddModalOpen(false);
    },
    onError: (error: Error) => {
      console.error("Error adding item:", error);
      alert("Failed to add item. Please try again.");
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
      triggerBalanceRefresh();
      setIsEditModalOpen(false);
      setItemToEdit(null);
    },
    onError: (error: Error) => {
      console.error("Error updating item:", error);
      alert("Failed to update item. Please try again.");
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: actions.deleteItem,
    onSuccess: (_: any, deletedId: number) => {
      // Optimistically update the cache
      queryClient.setQueryData(QUERY_KEYS.items, (oldItems: T[] = []) => {
        return oldItems.filter(item => item.id !== deletedId);
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      triggerBalanceRefresh();
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    },
    onError: (error: Error) => {
      console.error("Error deleting item:", error);
      alert("Failed to delete item. Please try again.");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => {
      if (actions.bulkDeleteItems) {
        return actions.bulkDeleteItems(ids);
      }
      return Promise.all(ids.map(id => actions.deleteItem(id)));
    },
    onSuccess: (_: any, deletedIds: number[]) => {
      // Optimistically update the cache
      queryClient.setQueryData(QUERY_KEYS.items, (oldItems: T[] = []) => {
        return oldItems.filter(item => !deletedIds.includes(item.id));
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
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

  // Filter logic (memoized for performance)
  const hasActiveFilters = useMemo(() => {
    return !!(searchTerm || selectedCategory || selectedBank || startDate || endDate);
  }, [searchTerm, selectedCategory, selectedBank, startDate, endDate]);
  
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search term filtering
      const matchesSearch = !searchTerm || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
                          
      // Category filtering
      const matchesCategory = !selectedCategory || item.category.name === selectedCategory;
      
      // Bank filtering
      const matchesBank = !selectedBank || (item.account && item.account.bankName === selectedBank);
      
      // Date filtering
      let matchesDateRange = true;
      if (startDate && endDate) {
        const itemDate = new Date(item.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDateRange = itemDate >= start && itemDate <= end;
      } else if (startDate) {
        const itemDate = new Date(item.date);
        const start = new Date(startDate);
        matchesDateRange = itemDate >= start;
      } else if (endDate) {
        const itemDate = new Date(item.date);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDateRange = itemDate <= end;
      }
      
      return matchesSearch && matchesCategory && matchesBank && matchesDateRange;
    });
  }, [items, searchTerm, selectedCategory, selectedBank, startDate, endDate]);

  // Memoized calculations
  const totalAmount = useMemo(() => 
    filteredItems.reduce((sum, item) => sum + item.amount, 0), 
    [filteredItems]
  );

  const uniqueBankNames = useMemo(() => 
    Array.from(new Set(accounts.map(account => account.bankName))).sort(), 
    [accounts]
  );

  // CRUD Handlers
  const handleAddItem = useCallback((newItem: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => {
    createItemMutation.mutate(newItem);
  }, [createItemMutation]);

  const handleEditItem = useCallback((id: number, updatedItem: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>) => {
    updateItemMutation.mutate({ id, data: updatedItem });
  }, [updateItemMutation]);

  const handleDeleteItem = useCallback(() => {
    if (!itemToDelete) return;
    deleteItemMutation.mutate(itemToDelete.id);
  }, [itemToDelete, deleteItemMutation]);

  const handleAddCategory = useCallback((newCategory: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    createCategoryMutation.mutate(newCategory);
  }, [createCategoryMutation]);

  // Modal handlers
  const openEditModal = useCallback((item: T) => {
    setItemToEdit(item);
    setIsEditModalOpen(true);
  }, []);

  const openViewModal = useCallback((item: T) => {
    setItemToView(item);
    setIsViewModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((item: T) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
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

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  }, [filteredItems]);

  const handleBulkDelete = useCallback(() => {
    if (selectedItems.size === 0) return;
    
    const itemIds = Array.from(selectedItems);
    if (confirm(`Are you sure you want to delete ${itemIds.length} items?`)) {
      bulkDeleteMutation.mutate(itemIds);
    }
  }, [selectedItems, bulkDeleteMutation]);

  const handleBulkImportSuccess = useCallback(async () => {
    // Invalidate and refetch items data
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.items });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
    triggerBalanceRefresh();
  }, [queryClient, QUERY_KEYS]);

  const handleExportToCSV = useCallback(() => {
    if (filteredItems.length === 0) {
      alert(`No ${categoryType.toLowerCase()}s to export`);
      return;
    }
    actions.exportToCSV(filteredItems);
  }, [filteredItems, categoryType, actions]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedBank("");
    setStartDate("");
    setEndDate("");
  }, []);

  return {
    // Data
    items: filteredItems,
    allItems: items,
    chartItems: items,
    categories,
    accounts,
    loading,
    totalAmount,
    uniqueBankNames,
    hasActiveFilters,

    // Modal states
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    isViewModalOpen,
    setIsViewModalOpen,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isAddCategoryModalOpen,
    setIsAddCategoryModalOpen,
    isBulkImportModalOpen,
    setIsBulkImportModalOpen,

    // Filter states
    selectedItems,
    selectedCategory,
    setSelectedCategory,
    selectedBank,
    setSelectedBank,
    searchTerm,
    setSearchTerm,
    startDate,
    setStartDate,
    endDate,
    setEndDate,

    // Selected items
    itemToEdit,
    setItemToEdit,
    itemToView,
    setItemToView,
    itemToDelete,
    setItemToDelete,

    // Handlers
    handleAddItem,
    handleEditItem,
    handleDeleteItem,
    handleAddCategory,
    openEditModal,
    openViewModal,
    openDeleteModal,
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
    
    // Query invalidation helper
    invalidateQueries: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.items });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
    }
  };
} 