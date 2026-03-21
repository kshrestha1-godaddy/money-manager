"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
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
    selectedCategories: string[];
    onCategoriesChange: (categories: string[]) => void;
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

const filtersContainer = CONTAINER_COLORS.whiteWithPadding;
const labelText = TEXT_COLORS.label;
const clearFilterButton = BUTTON_COLORS.clearFilter;
const standardInput = INPUT_COLORS.standard;

function categoryFilterSummary(names: string[]): string {
    if (names.length === 0) return "All categories";
    if (names.length === 1) return names[0];
    return `${names.length} categories`;
}

export function FinancialFilters({
    searchTerm,
    onSearchChange,
    selectedCategories,
    onCategoriesChange,
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
    const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
    const categoryMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!categoryMenuOpen) return;
        function handlePointerDown(event: MouseEvent) {
            if (
                categoryMenuRef.current &&
                !categoryMenuRef.current.contains(event.target as Node)
            ) {
                setCategoryMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [categoryMenuOpen]);

    function toggleCategory(name: string) {
        if (selectedCategories.includes(name)) {
            onCategoriesChange(selectedCategories.filter((c) => c !== name));
        } else {
            onCategoriesChange([...selectedCategories, name]);
        }
    }

    function clearCategorySelection() {
        onCategoriesChange([]);
    }

    function selectAllCategories() {
        onCategoriesChange(categories.map((c) => c.name));
    }

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
                <div
                    className="relative flex-1 min-w-[180px]"
                    ref={categoryMenuRef}
                >
                    <label className={labelText} id="category-filter-label">
                        Filter by Category
                    </label>
                    <button
                        type="button"
                        aria-expanded={categoryMenuOpen}
                        aria-haspopup="listbox"
                        aria-labelledby="category-filter-label"
                        onClick={() => setCategoryMenuOpen((o) => !o)}
                        className={`${standardInput} flex h-10 w-full items-center justify-between gap-2 text-left`}
                    >
                        <span className="min-w-0 truncate">
                            {categoryFilterSummary(selectedCategories)}
                        </span>
                        <ChevronDown
                            className={`h-4 w-4 shrink-0 opacity-60 transition-transform ${categoryMenuOpen ? "rotate-180" : ""}`}
                            aria-hidden
                        />
                    </button>
                    {categoryMenuOpen ? (
                        <div
                            role="listbox"
                            aria-multiselectable
                            className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                        >
                            <div className="flex flex-wrap gap-2 border-b border-gray-100 px-2 py-2">
                                <button
                                    type="button"
                                    onClick={clearCategorySelection}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                                >
                                    All (no filter)
                                </button>
                                <button
                                    type="button"
                                    onClick={selectAllCategories}
                                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                                >
                                    Select all
                                </button>
                            </div>
                            {categories.map((category) => {
                                const checked = selectedCategories.includes(
                                    category.name
                                );
                                return (
                                    <label
                                        key={category.id}
                                        className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50"
                                    >
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={checked}
                                            onChange={() =>
                                                toggleCategory(category.name)
                                            }
                                        />
                                        <span
                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{
                                                backgroundColor: category.color,
                                            }}
                                            aria-hidden
                                        />
                                        <span className="text-sm text-gray-900">
                                            {category.name}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
                <div className="flex-1 min-w-[140px]">
                    <label className={labelText}>Filter by Bank</label>
                    <select
                        value={selectedBank}
                        onChange={(e) => onBankChange(e.target.value)}
                        className={`${standardInput} h-10`}
                    >
                        <option value="">All Banks</option>
                        {uniqueBankNames.map((bankName) => (
                            <option key={bankName} value={bankName}>
                                {bankName}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="min-w-[120px]">
                    <label className={labelText}>Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => onStartDateChange(e.target.value)}
                        className={`${standardInput} h-10`}
                    />
                </div>
                <div className="min-w-[120px]">
                    <label className={labelText}>End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => onEndDateChange(e.target.value)}
                        className={`${standardInput} h-10`}
                    />
                </div>
                <div className="min-w-[120px]">
                    <label className={labelText}>Bookmarked</label>
                    <button
                        type="button"
                        onClick={() =>
                            onShowBookmarkedOnlyChange(!showBookmarkedOnly)
                        }
                        className={`w-full h-10 px-3 py-2 text-left text-sm border rounded-md transition-colors ${
                            showBookmarkedOnly
                                ? "bg-yellow-50 border-yellow-300 text-yellow-800"
                                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                        {showBookmarkedOnly ? "Bookmarked Only" : "All Records"}
                    </button>
                </div>
                <div className="min-w-[100px]">
                    <label className={`${labelText} invisible`}>Clear</label>
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
