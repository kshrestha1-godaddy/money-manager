import React from "react";
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
}: FinancialFiltersProps) {
  return (
    <div className={filtersContainer}>
      <div className={UI_STYLES.filters.gridSix}>
        <div>
          <label className={labelText}>
            Search {itemType === "income" ? "Incomes" : "Expenses"}
          </label>
          <input
            type="text"
            placeholder="Search by title, description, or notes..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className={standardInput}
          />
        </div>
        <div>
          <label className={labelText}>
            Filter by Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className={standardInput}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelText}>
            Filter by Bank
          </label>
          <select
            value={selectedBank}
            onChange={(e) => onBankChange(e.target.value)}
            className={standardInput}
          >
            <option value="">All Banks</option>
            {uniqueBankNames.map(bankName => (
              <option key={bankName} value={bankName}>
                {bankName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelText}>
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className={standardInput}
          />
        </div>
        <div>
          <label className={labelText}>
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className={standardInput}
          />
        </div>
        <div className={UI_STYLES.filters.clearButtonContainer}>
          <button
            onClick={onClearFilters}
            className={clearFilterButton}
            disabled={!hasActiveFilters}
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
} 