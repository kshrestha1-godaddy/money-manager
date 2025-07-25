import React from "react";
import { Bookmark } from "lucide-react";
import { Category } from "../../types/financial";
import { 
    BUTTON_COLORS,
    TEXT_COLORS,
    CONTAINER_COLORS,
    INPUT_COLORS,
    UI_STYLES,
} from "../../config/colorConfig";

interface FinancialFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedBank: string;
  onBankChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  categories: Category[];
  uniqueBankNames: string[];
  onClearFilters: () => void;
  itemType: "income" | "expense";
  hasActiveFilters: boolean;
  showBookmarkedOnly: boolean;
  onShowBookmarkedOnlyChange: (value: boolean) => void;
}

// Extract color variables for better readability
const filtersContainer = CONTAINER_COLORS.whiteWithPadding;
const labelText = TEXT_COLORS.label;
const clearFilterButton = BUTTON_COLORS.clearFilter;
const standardInput = INPUT_COLORS.standard;

export function FinancialFilters({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedBank,
  onBankChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  categories,
  uniqueBankNames,
  onClearFilters,
  itemType,
  hasActiveFilters,
  showBookmarkedOnly,
  onShowBookmarkedOnlyChange,
}: FinancialFiltersProps) {
  return (
    <div className={filtersContainer}>
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className={labelText}>
            Search {itemType === "income" ? "Incomes" : "Expenses"}
          </label>
          <input
            type="text"
            placeholder="Search by title, description, or notes..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`${standardInput} h-10`}
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className={labelText}>
            Filter by Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className={`${standardInput} h-10`}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className={labelText}>
            Filter by Bank
          </label>
          <select
            value={selectedBank}
            onChange={(e) => onBankChange(e.target.value)}
            className={`${standardInput} h-10`}
          >
            <option value="">All Banks</option>
            {uniqueBankNames.map(bankName => (
              <option key={bankName} value={bankName}>
                {bankName}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[120px]">
          <label className={labelText}>
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className={`${standardInput} h-10`}
          />
        </div>
        <div className="min-w-[120px]">
          <label className={labelText}>
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className={`${standardInput} h-10`}
          />
        </div>
        <div className="min-w-[120px]">
          <label className={labelText}>
            {/* <Bookmark className="w-4 h-4 inline mr-1" /> */}
            Bookmarked
          </label>
          <button
            type="button"
            onClick={() => onShowBookmarkedOnlyChange(!showBookmarkedOnly)}
            className={`w-full h-10 px-3 py-2 text-left text-sm border rounded-md transition-colors ${
              showBookmarkedOnly
                ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {showBookmarkedOnly ? 'Bookmarked Only' : 'All Records'}
          </button>
        </div>
        <div className="min-w-[100px]">
          <label className={`${labelText} invisible`}>
            Clear
          </label>
          <button
            onClick={onClearFilters}
            className={`${clearFilterButton} h-10`}
            disabled={!hasActiveFilters}
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
} 