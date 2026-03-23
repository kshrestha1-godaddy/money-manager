"use client";

import { MultiSelectDropdown } from "./MultiSelectDropdown";
import {
  BUTTON_COLORS,
  CONTAINER_COLORS,
  INPUT_COLORS,
  TEXT_COLORS,
} from "../../../config/colorConfig";

const filtersContainer = CONTAINER_COLORS.filtersWithMargin;
const labelText = TEXT_COLORS.label;
const clearFilterButton = BUTTON_COLORS.clearFilter;
const standardInput = INPUT_COLORS.standard;

const STATUS_OPTIONS = [
  { value: "Upcoming", label: "Upcoming" },
  { value: "Awaiting confirmation", label: "Awaiting confirmation" },
  { value: "Accepted", label: "Accepted" },
  { value: "Rejected", label: "Rejected" },
];

interface ScheduledPaymentsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryOptions: { value: string; label: string }[];
  selectedCategories: string[];
  onCategoriesChange: (value: string[]) => void;
  accountOptions: { value: string; label: string }[];
  selectedAccounts: string[];
  onAccountsChange: (value: string[]) => void;
  selectedStatuses: string[];
  onStatusesChange: (value: string[]) => void;
  currencyOptions: { value: string; label: string }[];
  selectedCurrencies: string[];
  onCurrenciesChange: (value: string[]) => void;
  recurringOptions: { value: string; label: string }[];
  selectedRecurring: string[];
  onRecurringChange: (value: string[]) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function ScheduledPaymentsFilters({
  searchQuery,
  onSearchChange,
  categoryOptions,
  selectedCategories,
  onCategoriesChange,
  accountOptions,
  selectedAccounts,
  onAccountsChange,
  selectedStatuses,
  onStatusesChange,
  currencyOptions,
  selectedCurrencies,
  onCurrenciesChange,
  recurringOptions,
  selectedRecurring,
  onRecurringChange,
  onClearFilters,
  hasActiveFilters,
}: ScheduledPaymentsFiltersProps) {
  return (
    <div className={filtersContainer}>
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className={labelText}>Search</label>
          <input
            type="text"
            placeholder="Title, description, notes, tags…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`${standardInput} h-10`}
          />
        </div>
        <MultiSelectDropdown
          label="Category"
          options={categoryOptions}
          selected={selectedCategories}
          onChange={onCategoriesChange}
        />
        <MultiSelectDropdown
          label="Account"
          options={accountOptions}
          selected={selectedAccounts}
          onChange={onAccountsChange}
        />
        <MultiSelectDropdown
          label="Status"
          options={STATUS_OPTIONS}
          selected={selectedStatuses}
          onChange={onStatusesChange}
        />
        <MultiSelectDropdown
          label="Currency"
          options={currencyOptions}
          selected={selectedCurrencies}
          onChange={onCurrenciesChange}
        />
        <MultiSelectDropdown
          label="Recurrence"
          options={recurringOptions}
          selected={selectedRecurring}
          onChange={onRecurringChange}
        />
        {hasActiveFilters && (
          <button type="button" onClick={onClearFilters} className={clearFilterButton}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
