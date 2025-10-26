"use client";

import React, { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useCurrency } from "../../providers/CurrencyProvider";
import { formatCurrency } from "../../utils/currency";
import { TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle, Plus, Edit, Trash2, Check, X, ChevronUp, ChevronDown, EyeOff, Eye, Settings, Download, Upload, Trash } from "lucide-react";
import { LOADING_COLORS, UI_STYLES, getSummaryCardClasses, BUTTON_COLORS } from "../../config/colorConfig";
import { useBudgetTracking, useAllCategories } from "../../hooks/useBudgetTracking";
import { BudgetTarget } from "../../types/financial";
import { getAllBudgetTargetsForExport, bulkDeleteAllBudgetTargets } from "../../actions/budget-targets";
import { exportBudgetTargetsToCSV } from "../../utils/csvExportBudgetTargets";
import { UnifiedBulkImportModal } from "../../components/shared/UnifiedBulkImportModal";
import { budgetTargetsImportConfig } from "../../config/bulkImportConfig";
import { BulkDeleteBudgetTargetsModal } from "./components/BulkDeleteBudgetTargetsModal";
import { BudgetActionSuccessModal } from "./components/BudgetActionSuccessModal";
import { CategoryPerformanceGauge } from "./components/CategoryPerformanceGauge";

type SortField = 'category' | 'actual' | 'budget' | 'variance';
type SortDirection = 'asc' | 'desc';

const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

// UI Style constants
const cardLargeContainer = UI_STYLES.summaryCard.containerLarge;
const cardTitle = UI_STYLES.summaryCard.title;
const cardValue = UI_STYLES.summaryCard.value;
const cardSubtitle = UI_STYLES.summaryCard.subtitle;

// Button styles
const primaryButton = BUTTON_COLORS.primary;

interface BudgetComparisonData {
  categoryName: string;
  categoryType: 'EXPENSE' | 'INCOME';
  actualSpending: {
    monthlyAverage: number;
    totalAmount: number;
    transactionCount: number;
  };
  budgetTarget: {
    monthlySpend: number;
    impliedAnnualSpend: number;
  };
  variance: {
    amount: number;
    percentage: number;
    status: 'over' | 'under' | 'on-track';
  };
}

export default function BudgetPage() {
  const session = useSession();
  const { currency } = useCurrency();
  const [selectedPeriod, setSelectedPeriod] = useState<'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  
  // Sorting state for income table
  const [incomeSortField, setIncomeSortField] = useState<SortField>('variance');
  const [incomeSortDirection, setIncomeSortDirection] = useState<SortDirection>('desc');
  
  // Sorting state for expense table
  const [expenseSortField, setExpenseSortField] = useState<SortField>('variance');
  const [expenseSortDirection, setExpenseSortDirection] = useState<SortDirection>('desc');
  
  // Category management state
  const [showManageCategories, setShowManageCategories] = useState(false);
  
  // Import modal state
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  
  // Delete modal states
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  // Success/Error modal states
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    details?: string[];
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
    details: []
  });
  
  const {
    budgetComparison,
    budgetTargets,
    loading,
    error,
    updateOrCreateBudgetTarget,
    updateCategoryBudgetInclusion,
    deleteBudgetTarget,
    isUpdating,
    isDeleting,
    isUpdatingInclusion
  } = useBudgetTracking(selectedPeriod);

  const { allCategories, loading: categoriesLoading } = useAllCategories();

  // Calculate enhanced summary statistics
  const summaryStats = useMemo(() => {
    if (!budgetComparison.length) return {
      totalBudget: 0,
      totalActual: 0,
      totalVariance: 0,
      totalVariancePercentage: 0,
      overBudgetCount: 0,
      underBudgetCount: 0,
      onTrackCount: 0,
      budgetUtilization: 0,
      avgVariancePercentage: 0,
      totalCategories: 0,
      incomeCategories: 0,
      expenseCategories: 0,
      totalTransactions: 0
    };

    const totalBudget = budgetComparison.reduce((sum, item) => sum + item.budgetTarget.monthlySpend, 0);
    const totalActual = budgetComparison.reduce((sum, item) => sum + item.actualSpending.monthlyAverage, 0);
    const totalVariance = totalActual - totalBudget;
    const totalVariancePercentage = totalBudget > 0 ? ((totalVariance / totalBudget) * 100) : 0;
    
    const overBudgetCount = budgetComparison.filter(item => item.variance.status === 'over').length;
    const underBudgetCount = budgetComparison.filter(item => item.variance.status === 'under').length;
    const onTrackCount = budgetComparison.filter(item => item.variance.status === 'on-track').length;
    
    const budgetUtilization = totalBudget > 0 ? ((totalActual / totalBudget) * 100) : 0;
    const avgVariancePercentage = budgetComparison.length > 0 
      ? budgetComparison.reduce((sum, item) => sum + Math.abs(item.variance.percentage), 0) / budgetComparison.length 
      : 0;
    
    const incomeCategories = budgetComparison.filter(item => item.categoryType === 'INCOME').length;
    const expenseCategories = budgetComparison.filter(item => item.categoryType === 'EXPENSE').length;
    const totalTransactions = budgetComparison.reduce((sum, item) => sum + item.actualSpending.transactionCount, 0);

    return {
      totalBudget,
      totalActual,
      totalVariance,
      totalVariancePercentage,
      overBudgetCount,
      underBudgetCount,
      onTrackCount,
      budgetUtilization,
      avgVariancePercentage,
      totalCategories: budgetComparison.length,
      incomeCategories,
      expenseCategories,
      totalTransactions
    };
  }, [budgetComparison]);

  const getVarianceColor = (status: string) => {
    switch (status) {
      case 'over': return 'text-red-600 bg-red-50';
      case 'under': return 'text-green-600 bg-green-50';
      case 'on-track': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getVarianceIcon = (status: string) => {
    switch (status) {
      case 'over': return <TrendingUp className="w-4 h-4" />;
      case 'under': return <TrendingDown className="w-4 h-4" />;
      case 'on-track': return <CheckCircle className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  // Sorting helper functions
  const getSortIcon = (field: SortField, currentField: SortField, direction: SortDirection) => {
    if (field !== currentField) {
      return <ChevronUp className="w-3 h-3 text-gray-400" />;
    }
    return direction === 'asc' ? 
      <ChevronUp className="w-3 h-3 text-gray-600" /> : 
      <ChevronDown className="w-3 h-3 text-gray-600" />;
  };

  const handleIncomeSort = (field: SortField) => {
    if (incomeSortField === field) {
      setIncomeSortDirection(incomeSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setIncomeSortField(field);
      setIncomeSortDirection('desc');
    }
  };

  const handleExpenseSort = (field: SortField) => {
    if (expenseSortField === field) {
      setExpenseSortDirection(expenseSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setExpenseSortField(field);
      setExpenseSortDirection('desc');
    }
  };

  const sortData = (data: BudgetComparisonData[], sortField: SortField, sortDirection: SortDirection) => {
    return [...data].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'category':
          aValue = a.categoryName.toLowerCase();
          bValue = b.categoryName.toLowerCase();
          break;
        case 'actual':
          aValue = a.actualSpending.monthlyAverage;
          bValue = b.actualSpending.monthlyAverage;
          break;
        case 'budget':
          aValue = a.budgetTarget.monthlySpend;
          bValue = b.budgetTarget.monthlySpend;
          break;
        case 'variance':
          aValue = a.variance.amount;
          bValue = b.variance.amount;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        const numA = Number(aValue);
        const numB = Number(bValue);
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }
    });
  };

  // Category management functions
  const hideCategory = (categoryName: string) => {
    updateCategoryBudgetInclusion(categoryName, false);
  };

  const showCategory = (categoryName: string) => {
    updateCategoryBudgetInclusion(categoryName, true);
  };

  const toggleCategoryVisibility = (categoryName: string) => {
    const category = allCategories.find(cat => cat.name === categoryName);
    if (category) {
      updateCategoryBudgetInclusion(categoryName, !category.includedInBudget);
    }
  };

  // Sorted data (filtering is now done at database level)
  const sortedIncomeData = useMemo(() => {
    const incomeData = budgetComparison.filter(item => item.categoryType === 'INCOME');
    return sortData(incomeData, incomeSortField, incomeSortDirection);
  }, [budgetComparison, incomeSortField, incomeSortDirection]);

  const sortedExpenseData = useMemo(() => {
    const expenseData = budgetComparison.filter(item => item.categoryType === 'EXPENSE');
    return sortData(expenseData, expenseSortField, expenseSortDirection);
  }, [budgetComparison, expenseSortField, expenseSortDirection]);

  // Calculate totals for income and expense tables
  const incomeTotals = useMemo(() => {
    if (sortedIncomeData.length === 0) return {
      totalActual: 0,
      totalBudget: 0,
      totalVariance: 0,
      totalTransactions: 0
    };

    const totalActual = sortedIncomeData.reduce((sum, item) => sum + item.actualSpending.monthlyAverage, 0);
    const totalBudget = sortedIncomeData.reduce((sum, item) => sum + item.budgetTarget.monthlySpend, 0);
    const totalVariance = totalActual - totalBudget;
    const totalTransactions = sortedIncomeData.reduce((sum, item) => sum + item.actualSpending.transactionCount, 0);

    return { totalActual, totalBudget, totalVariance, totalTransactions };
  }, [sortedIncomeData]);

  const expenseTotals = useMemo(() => {
    if (sortedExpenseData.length === 0) return {
      totalActual: 0,
      totalBudget: 0,
      totalVariance: 0,
      totalTransactions: 0
    };

    const totalActual = sortedExpenseData.reduce((sum, item) => sum + item.actualSpending.monthlyAverage, 0);
    const totalBudget = sortedExpenseData.reduce((sum, item) => sum + item.budgetTarget.monthlySpend, 0);
    const totalVariance = totalActual - totalBudget;
    const totalTransactions = sortedExpenseData.reduce((sum, item) => sum + item.actualSpending.transactionCount, 0);

    return { totalActual, totalBudget, totalVariance, totalTransactions };
  }, [sortedExpenseData]);

  // Inline editing handlers
  const handleStartEdit = (categoryName: string, currentAmount: number) => {
    setEditingCategory(categoryName);
    setEditingValue(currentAmount.toString());
  };

  const handleSaveEdit = async () => {
    if (editingCategory && editingValue !== '') {
      const amount = parseFloat(editingValue);
      if (!isNaN(amount) && amount >= 0) {
        await updateOrCreateBudgetTarget(editingCategory, amount, selectedPeriod);
      }
    }
    setEditingCategory(null);
    setEditingValue('');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditingValue('');
  };

  const handleDeleteTarget = (categoryName: string) => {
    if (window.confirm(`Are you sure you want to remove the budget target for ${categoryName}?`)) {
      updateOrCreateBudgetTarget(categoryName, 0, selectedPeriod);
    }
  };

  const handleExportBudgetTargets = async () => {
    try {
      const response = await getAllBudgetTargetsForExport();
      if (response.error) {
        setSuccessModal({
          isOpen: true,
          type: 'error',
          title: 'Export Failed',
          message: response.error,
          details: []
        });
        return;
      }
      
      if (!response.data || response.data.length === 0) {
        setSuccessModal({
          isOpen: true,
          type: 'info',
          title: 'No Data to Export',
          message: 'No budget targets found to export.',
          details: []
        });
        return;
      }

      exportBudgetTargetsToCSV(response.data);
      setSuccessModal({
        isOpen: true,
        type: 'success',
        title: 'Export Successful',
        message: `Successfully exported ${response.data.length} budget targets to CSV.`,
        details: []
      });
    } catch (error) {
      console.error('Error exporting budget targets:', error);
      setSuccessModal({
        isOpen: true,
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export budget targets. Please try again.',
        details: []
      });
    }
  };

  const handleBulkImportSuccess = () => {
    setIsBulkImportModalOpen(false);
    // Refresh the budget data
    window.location.reload();
  };

  const handleBulkDeleteAllBudgetTargets = () => {
    setIsBulkDeleteModalOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      const response = await bulkDeleteAllBudgetTargets();
      
      if (response.error) {
        setSuccessModal({
          isOpen: true,
          type: 'error',
          title: 'Delete Failed',
          message: response.error,
          details: []
        });
        setIsBulkDeleteModalOpen(false);
        setIsBulkDeleting(false);
        return;
      }

      if (response.deletedCount === 0) {
        setSuccessModal({
          isOpen: true,
          type: 'info',
          title: 'No Data to Delete',
          message: 'No budget targets found to delete.',
          details: []
        });
        setIsBulkDeleteModalOpen(false);
        setIsBulkDeleting(false);
        return;
      }

      setIsBulkDeleteModalOpen(false);
      setIsBulkDeleting(false);
      setSuccessModal({
        isOpen: true,
        type: 'success',
        title: 'Delete Successful',
        message: `Successfully deleted ${response.deletedCount} budget target(s).`,
        details: [
          'All budget targets have been removed',
          'Categories are now hidden from budget tracking',
          'You can re-import or create new budget targets anytime'
        ]
      });
      
      // Refresh the budget data after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error bulk deleting budget targets:', error);
      setSuccessModal({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete budget targets. Please try again.',
        details: []
      });
      setIsBulkDeleteModalOpen(false);
      setIsBulkDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={loadingContainer}>
        <div className={loadingSpinner}></div>
        <p className={loadingText}>Loading budget data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800">Error Loading Budget Data</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${UI_STYLES.page.container} p-6 w-full min-w-0`}>
      {/* Header */}
      <div className={UI_STYLES.header.container}>
        <div>
          <h1 className={UI_STYLES.page.title}>Budget Tracking</h1>
          <p className={`${UI_STYLES.page.subtitle} mt-2`}>Compare your actual spending against budget targets</p>
        </div>
        <div className={UI_STYLES.header.buttonGroup}>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as 'MONTHLY' | 'QUARTERLY' | 'YEARLY')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="YEARLY">Yearly</option>
          </select>
          <button
            onClick={() => setShowManageCategories(!showManageCategories)}
            className={`${primaryButton} flex items-center gap-2`}
          >
            <Settings className="w-4 h-4" />
            Manage Categories
          </button>
          <button
            onClick={handleBulkDeleteAllBudgetTargets}
            className="px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 rounded-md flex items-center gap-2 disabled:opacity-50"
            disabled={budgetComparison.length === 0}
          >
            <Trash className="w-4 h-4" />
            Delete All
          </button>
          <button
            onClick={handleExportBudgetTargets}
            className={`${BUTTON_COLORS.secondaryGreen} flex items-center gap-2`}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setIsBulkImportModalOpen(true)}
            className={`${BUTTON_COLORS.secondaryBlue} flex items-center gap-2`}
          >
            <Upload className="w-4 h-4" />
            Import
          </button>


        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {/* Total Budget Card */}
        <div className={`${cardLargeContainer} relative`}>
          <div className="absolute top-4 left-4 w-3 h-3 rounded-full bg-blue-500"></div>
          <div className="flex flex-col items-center justify-center h-full text-center pt-6">
            <h3 className={`${cardTitle} mb-2`}>Total Budget</h3>
            <p className="text-2xl font-bold text-blue-600 mb-1">
              {formatCurrency(summaryStats.totalBudget, currency)}
            </p>
            <p className={`${cardSubtitle}`}>
              {selectedPeriod.toLowerCase()} target
            </p>
          </div>
        </div>

        {/* Actual Spending Card */}
        <div className={`${cardLargeContainer} relative`}>
          <div className="absolute top-4 left-4 w-3 h-3 rounded-full bg-gray-500"></div>
          <div className="flex flex-col items-center justify-center h-full text-center pt-6">
            <h3 className={`${cardTitle} mb-2`}>Actual Spending</h3>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {formatCurrency(summaryStats.totalActual, currency)}
            </p>
            <p className={`${cardSubtitle}`}>
              {summaryStats.totalTransactions} transactions
            </p>
          </div>
        </div>

        {/* Budget Utilization Card */}
        <div className={`${cardLargeContainer} relative`}>
          <div className={`absolute top-4 left-4 w-3 h-3 rounded-full ${
            summaryStats.budgetUtilization > 100 ? 'bg-red-500' : 
            summaryStats.budgetUtilization > 90 ? 'bg-yellow-500' : 'bg-green-500'
          }`}></div>
          <div className="flex flex-col items-center justify-center h-full text-center pt-6">
            <h3 className={`${cardTitle} mb-2`}>Budget Utilization</h3>
            <p className={`text-2xl font-bold mb-1 ${
              summaryStats.budgetUtilization > 100 ? 'text-red-600' : 
              summaryStats.budgetUtilization > 90 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {summaryStats.budgetUtilization.toFixed(1)}%
            </p>
            <p className={`${cardSubtitle}`}>
              of budget used
            </p>
          </div>
        </div>

        {/* Variance Card */}
        <div className={`${cardLargeContainer} relative`}>
          <div className={`absolute top-4 left-4 w-3 h-3 rounded-full ${
            summaryStats.totalVariance >= 0 ? 'bg-red-500' : 'bg-green-500'
          }`}></div>
          <div className="flex flex-col items-center justify-center h-full text-center pt-6">
            <h3 className={`${cardTitle} mb-2`}>Variance</h3>
            <p className={`text-2xl font-bold mb-1 ${
              summaryStats.totalVariance >= 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {summaryStats.totalVariance >= 0 ? '+' : ''}{formatCurrency(summaryStats.totalVariance, currency)}
            </p>
            <p className={`${cardSubtitle} ${
              summaryStats.totalVariancePercentage >= 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {summaryStats.totalVariancePercentage >= 0 ? '+' : ''}{summaryStats.totalVariancePercentage.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Categories Status Card */}
        <div className={`${cardLargeContainer} relative`}>
          <div className="absolute top-4 left-4 w-3 h-3 rounded-full bg-purple-500"></div>
          <div className="flex flex-col items-center justify-center h-full text-center pt-6">
            <h3 className={`${cardTitle} mb-2`}>Categories</h3>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {summaryStats.totalCategories}
            </p>
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between">
                <span className="text-red-600">{summaryStats.overBudgetCount} over</span>
                <span className="text-green-600">{summaryStats.underBudgetCount} under</span>
              </div>
              <span className="text-blue-600">{summaryStats.onTrackCount} on-track</span>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Performance Insights */}
      {budgetComparison.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Performance Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {summaryStats.avgVariancePercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Average Variance</div>
              <div className="text-xs text-gray-500 mt-1">
                Across all categories
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {summaryStats.incomeCategories}/{summaryStats.expenseCategories}
              </div>
              <div className="text-sm text-gray-600">Income/Expense Split</div>
              <div className="text-xs text-gray-500 mt-1">
                Category distribution
              </div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold mb-2 ${
                (summaryStats.overBudgetCount / summaryStats.totalCategories) > 0.5 ? 'text-red-600' : 
                (summaryStats.underBudgetCount / summaryStats.totalCategories) > 0.5 ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {summaryStats.totalCategories > 0 ? 
                  Math.round((summaryStats.onTrackCount / summaryStats.totalCategories) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600">On Track</div>
              <div className="text-xs text-gray-500 mt-1">
                Categories meeting targets
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Performance Gauge */}
      {budgetComparison.length > 0 && (
        <CategoryPerformanceGauge 
          budgetData={budgetComparison}
          currency={currency}
          categoryType="ALL"
        />
      )}

      {/* Manage Categories Modal */}
      {showManageCategories && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Manage Budget Categories</h3>
              <button
                onClick={() => setShowManageCategories(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income Categories Management */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Income Categories</h4>
                  <div className="space-y-2">
                    {allCategories
                      .filter(category => category.type === 'INCOME')
                      .map(category => (
                        <div key={category.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-900">{category.name}</span>
                          <button
                            onClick={() => toggleCategoryVisibility(category.name)}
                            disabled={isUpdatingInclusion}
                            className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
                              !category.includedInBudget
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            } ${isUpdatingInclusion ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {!category.includedInBudget ? (
                              <>
                                <EyeOff className="w-4 h-4" />
                                Hidden
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4" />
                                Visible
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Expense Categories Management */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Expense Categories</h4>
                  <div className="space-y-2">
                    {allCategories
                      .filter(category => category.type === 'EXPENSE')
                      .map(category => (
                        <div key={category.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-900">{category.name}</span>
                          <button
                            onClick={() => toggleCategoryVisibility(category.name)}
                            disabled={isUpdatingInclusion}
                            className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
                              !category.includedInBudget
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            } ${isUpdatingInclusion ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {!category.includedInBudget ? (
                              <>
                                <EyeOff className="w-4 h-4" />
                                Hidden
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4" />
                                Visible
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {allCategories.filter(cat => !cat.includedInBudget).length} categories hidden from budget tracking
                </div>
                <button
                  onClick={() => setShowManageCategories(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Comparison Tables - Side by Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Budget Tracking */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Income by Category</h3>
            <p className="text-sm text-gray-600 mt-1">Set budget targets for your income categories</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleIncomeSort('category')}
                  >
                    <div className="flex items-center justify-center">
                      <span>Category</span>
                      {getSortIcon('category', incomeSortField, incomeSortDirection)}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleIncomeSort('actual')}
                  >
                    <div className="flex items-center justify-center">
                      <span>Actual ({selectedPeriod.toLowerCase()})</span>
                      {getSortIcon('actual', incomeSortField, incomeSortDirection)}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleIncomeSort('budget')}
                  >
                    <div className="flex items-center justify-center">
                      <span>Budget Target</span>
                      {getSortIcon('budget', incomeSortField, incomeSortDirection)}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleIncomeSort('variance')}
                  >
                    <div className="flex items-center justify-center">
                      <span>Variance</span>
                      {getSortIcon('variance', incomeSortField, incomeSortDirection)}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedIncomeData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-center">
                      <div className="break-words">{item.categoryName}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-900">
                      {formatCurrency(item.actualSpending.monthlyAverage, currency)}
                      <div className="text-xs text-gray-500">
                        {item.actualSpending.transactionCount} transactions
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      {editingCategory === item.categoryName ? (
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveEdit}
                            className="text-green-600 hover:text-green-800"
                            disabled={isUpdating}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-blue-600 font-semibold">
                          {formatCurrency(item.budgetTarget.monthlySpend, currency)}
                        </div>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-sm text-center font-medium ${
                      item.variance.amount > 0 ? 'text-green-600' : 
                      item.variance.amount < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {item.variance.amount >= 0 ? '+' : ''}{formatCurrency(item.variance.amount, currency)}
                      <div className="text-xs">
                        ({item.variance.percentage >= 0 ? '+' : ''}{item.variance.percentage.toFixed(1)}%)
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleStartEdit(item.categoryName, item.budgetTarget.monthlySpend)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit budget target"
                          disabled={editingCategory !== null}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {item.budgetTarget.monthlySpend > 0 && (
                          <button 
                            onClick={() => handleDeleteTarget(item.categoryName)}
                            className="text-red-600 hover:text-red-900"
                            title="Remove budget target"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => hideCategory(item.categoryName)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Hide category from budget tracking"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Income Totals Summary */}
          {sortedIncomeData.length > 0 && (
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="grid grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-sm font-medium text-gray-600">Total Categories</div>
                  <div className="text-lg font-bold text-gray-900">{sortedIncomeData.length}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Actual Income</div>
                  <div className="text-lg font-bold text-gray-900">{formatCurrency(incomeTotals.totalActual, currency)}</div>
                  <div className="text-xs text-gray-500">{incomeTotals.totalTransactions} transactions</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Budget Target</div>
                  <div className="text-lg font-bold text-blue-600">{formatCurrency(incomeTotals.totalBudget, currency)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Total Variance</div>
                  <div className={`text-lg font-bold ${
                    incomeTotals.totalVariance > 0 ? 'text-green-600' : 
                    incomeTotals.totalVariance < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {incomeTotals.totalVariance >= 0 ? '+' : ''}{formatCurrency(incomeTotals.totalVariance, currency)}
                  </div>
                  <div className={`text-xs ${
                    incomeTotals.totalVariance > 0 ? 'text-green-600' : 
                    incomeTotals.totalVariance < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {incomeTotals.totalBudget > 0 ? 
                      `${incomeTotals.totalVariance >= 0 ? '+' : ''}${((incomeTotals.totalVariance / incomeTotals.totalBudget) * 100).toFixed(1)}%` : 
                      '0.0%'
                    }
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Expense Budget Tracking */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Expenses by Category</h3>
            <p className="text-sm text-gray-600 mt-1">Set budget targets for your expense categories</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleExpenseSort('category')}
                  >
                    <div className="flex items-center justify-center">
                      <span>Category</span>
                      {getSortIcon('category', expenseSortField, expenseSortDirection)}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleExpenseSort('actual')}
                  >
                    <div className="flex items-center justify-center">
                      <span>Actual ({selectedPeriod.toLowerCase()})</span>
                      {getSortIcon('actual', expenseSortField, expenseSortDirection)}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleExpenseSort('budget')}
                  >
                    <div className="flex items-center justify-center">
                      <span>Budget Target</span>
                      {getSortIcon('budget', expenseSortField, expenseSortDirection)}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleExpenseSort('variance')}
                  >
                    <div className="flex items-center justify-center">
                      <span>Variance</span>
                      {getSortIcon('variance', expenseSortField, expenseSortDirection)}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedExpenseData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-center">
                      <div className="break-words">{item.categoryName}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-900">
                      {formatCurrency(item.actualSpending.monthlyAverage, currency)}
                      <div className="text-xs text-gray-500">
                        {item.actualSpending.transactionCount} transactions
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      {editingCategory === item.categoryName ? (
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveEdit}
                            className="text-green-600 hover:text-green-800"
                            disabled={isUpdating}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-blue-600 font-semibold">
                          {formatCurrency(item.budgetTarget.monthlySpend, currency)}
                        </div>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-sm text-center font-medium ${
                      item.variance.amount > 0 ? 'text-red-600' : 
                      item.variance.amount < 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {item.variance.amount >= 0 ? '+' : ''}{formatCurrency(item.variance.amount, currency)}
                      <div className="text-xs">
                        ({item.variance.percentage >= 0 ? '+' : ''}{item.variance.percentage.toFixed(1)}%)
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleStartEdit(item.categoryName, item.budgetTarget.monthlySpend)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit budget target"
                          disabled={editingCategory !== null}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {item.budgetTarget.monthlySpend > 0 && (
                          <button 
                            onClick={() => handleDeleteTarget(item.categoryName)}
                            className="text-red-600 hover:text-red-900"
                            title="Remove budget target"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => hideCategory(item.categoryName)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Hide category from budget tracking"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Expense Totals Summary */}
          {sortedExpenseData.length > 0 && (
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="grid grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-sm font-medium text-gray-600">Total Categories</div>
                  <div className="text-lg font-bold text-gray-900">{sortedExpenseData.length}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Actual Expenses</div>
                  <div className="text-lg font-bold text-gray-900">{formatCurrency(expenseTotals.totalActual, currency)}</div>
                  <div className="text-xs text-gray-500">{expenseTotals.totalTransactions} transactions</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Budget Target</div>
                  <div className="text-lg font-bold text-blue-600">{formatCurrency(expenseTotals.totalBudget, currency)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Total Variance</div>
                  <div className={`text-lg font-bold ${
                    expenseTotals.totalVariance > 0 ? 'text-red-600' : 
                    expenseTotals.totalVariance < 0 ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {expenseTotals.totalVariance >= 0 ? '+' : ''}{formatCurrency(expenseTotals.totalVariance, currency)}
                  </div>
                  <div className={`text-xs ${
                    expenseTotals.totalVariance > 0 ? 'text-red-600' : 
                    expenseTotals.totalVariance < 0 ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {expenseTotals.totalBudget > 0 ? 
                      `${expenseTotals.totalVariance >= 0 ? '+' : ''}${((expenseTotals.totalVariance / expenseTotals.totalBudget) * 100).toFixed(1)}%` : 
                      '0.0%'
                    }
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {budgetComparison.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Categories Available</h3>
          <p className="text-gray-600 mb-4">
            Create some expense or income categories first to start budget tracking
          </p>
        </div>
      )}


      {/* Bulk Import Modal */}
      <UnifiedBulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        onSuccess={handleBulkImportSuccess}
        config={budgetTargetsImportConfig}
      />

      {/* Bulk Delete Modal */}
      <BulkDeleteBudgetTargetsModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={confirmBulkDelete}
        targetCount={budgetComparison.length}
        isDeleting={isBulkDeleting}
      />

      {/* Success/Error Modal */}
      <BudgetActionSuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal(prev => ({ ...prev, isOpen: false }))}
        type={successModal.type}
        title={successModal.title}
        message={successModal.message}
        details={successModal.details}
      />
    </div>
  );
}
