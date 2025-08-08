import { useState, useEffect, useMemo, useCallback } from "react";
import { Category } from "../types/financial";
import { AccountInterface } from "../types/accounts";
import { getCategories, createCategory } from "../actions/categories";
import { getUserAccounts } from "../(dashboard)/accounts/actions/accounts";
import { triggerBalanceRefresh } from "./useTotalBalance";

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

export function useFinancialData<T extends FinancialItem>(
  categoryType: "INCOME" | "EXPENSE",
  actions: FinancialDataActions<T>
) {
  // State
  const [items, setItems] = useState<T[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<AccountInterface[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Load data on mount
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [categoriesData, itemsData, userAccounts] = await Promise.all([
        getCategories(categoryType),
        actions.getItems(),
        getUserAccounts()
      ]);
      
      setCategories(categoriesData);
      setItems(itemsData);
      
      if (userAccounts && !('error' in userAccounts)) {
        setAccounts(userAccounts);
      } else {
        console.error("Error loading accounts:", userAccounts?.error);
        setAccounts([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Failed to load data. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [categoryType, actions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter logic
  const hasActiveFilters = useMemo(() => {
    return !!(searchTerm || selectedCategory || selectedBank || startDate || endDate);
  }, [searchTerm, selectedCategory, selectedBank, startDate, endDate]);
  
  const getBaseFilteredItems = useCallback((applyDefaultDateFilter: boolean) => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
                            
      const matchesCategory = selectedCategory === "" || item.category.name === selectedCategory;
      const matchesBank = selectedBank === "" || (item.account && item.account.bankName === selectedBank);
      
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
      } else if (applyDefaultDateFilter && !hasActiveFilters) {
        const itemDate = new Date(item.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        matchesDateRange = itemDate >= thirtyDaysAgo;
      }
      
      return matchesSearch && matchesCategory && matchesBank && matchesDateRange;
    });
  }, [items, searchTerm, selectedCategory, selectedBank, startDate, endDate, hasActiveFilters]);

  const filteredItems = useMemo(() => getBaseFilteredItems(false), [getBaseFilteredItems]);
  const chartFilteredItems = useMemo(() => getBaseFilteredItems(false), [getBaseFilteredItems]);
  
  const totalAmount = useMemo(() => 
    filteredItems.reduce((sum, item) => sum + item.amount, 0),
    [filteredItems]
  );
  
  const uniqueBankNames = useMemo(() => 
    Array.from(new Set(accounts.map(account => account.bankName))).sort(),
    [accounts]
  );

  // CRUD Handlers
  const handleAddItem = useCallback(async (newItem: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const item = await actions.createItem(newItem);
      setItems(prevItems => [item, ...prevItems]);
      setIsAddModalOpen(false);
      triggerBalanceRefresh();
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Failed to add item. Please try again.");
    }
  }, [actions]);

  const handleEditItem = useCallback(async (id: number, updatedItem: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>) => {
    try {
      const item = await actions.updateItem(id, updatedItem);
      setItems(prevItems => prevItems.map(i => i.id === id ? item : i));
      setIsEditModalOpen(false);
      setItemToEdit(null);
      triggerBalanceRefresh();
    } catch (error) {
      console.error("Error updating item:", error);
      alert("Failed to update item. Please try again.");
    }
  }, [actions]);

  const handleDeleteItem = useCallback(async () => {
    if (!itemToDelete) return;
    
    try {
      await actions.deleteItem(itemToDelete.id);
      setItems(prevItems => prevItems.filter(i => i.id !== itemToDelete.id));
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      triggerBalanceRefresh();
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item. Please try again.");
    }
  }, [itemToDelete, actions]);

  const handleAddCategory = useCallback(async (newCategory: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const category = await createCategory(newCategory);
      setCategories(prevCategories => [...prevCategories, category]);
      setIsAddCategoryModalOpen(false);
    } catch (error) {
      console.error("Error adding category:", error);
      alert("Failed to add category. Please try again.");
    }
  }, []);

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

  const handleBulkDelete = useCallback(async () => {
    if (selectedItems.size === 0) return;
    
    const itemType = categoryType.toLowerCase();
    const confirmMessage = `Are you sure you want to delete ${selectedItems.size} ${itemType}(s)?`;
    if (!confirm(confirmMessage)) return;

    try {
      if (actions.bulkDeleteItems) {
        await actions.bulkDeleteItems(Array.from(selectedItems));
      } else {
        await Promise.all(Array.from(selectedItems).map(id => actions.deleteItem(id)));
      }
      setItems(prevItems => prevItems.filter(item => !selectedItems.has(item.id)));
      setSelectedItems(new Set());
      triggerBalanceRefresh();
    } catch (error) {
      console.error("Error bulk deleting items:", error);
      alert("Failed to delete items. Please try again.");
    }
  }, [selectedItems, categoryType, actions]);

  const handleBulkImportSuccess = useCallback(async () => {
    try {
      const itemsList = await actions.getItems();
      setItems(itemsList);
      triggerBalanceRefresh();
    } catch (error) {
      console.error("Error reloading items:", error);
    }
  }, [actions]);

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
    chartItems: chartFilteredItems,
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
  };
} 