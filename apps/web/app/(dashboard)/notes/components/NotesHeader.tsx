"use client";

import { useState } from "react";

interface NotesHeaderProps {
  showArchived: boolean;
  onToggleArchived: () => void;
  onCreateNote: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  selectedColor: string | null;
  onColorChange: (color: string | null) => void;
  allTags: string[];
  allColors: string[];
  notesCount: number;
  archivedCount: number;
  showFilters: boolean;
  onToggleFilters: () => void;
}

const NOTE_COLORS = [
  { name: "Yellow", value: "#fbbf24", bg: "bg-yellow-400" },
  { name: "Blue", value: "#3b82f6", bg: "bg-blue-500" },
  { name: "Green", value: "#10b981", bg: "bg-emerald-500" },
  { name: "Pink", value: "#ec4899", bg: "bg-pink-500" },
  { name: "Purple", value: "#8b5cf6", bg: "bg-violet-500" },
  { name: "Orange", value: "#f97316", bg: "bg-orange-500" },
  { name: "Red", value: "#ef4444", bg: "bg-red-500" },
  { name: "Gray", value: "#6b7280", bg: "bg-gray-500" },
];

export function NotesHeader({
  showArchived,
  onToggleArchived,
  onCreateNote,
  searchQuery,
  onSearchChange,
  selectedTags,
  onTagsChange,
  selectedColor,
  onColorChange,
  allTags,
  allColors,
  notesCount,
  archivedCount,
  showFilters,
  onToggleFilters,
}: NotesHeaderProps) {

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearFilters = () => {
    onTagsChange([]);
    onColorChange(null);
  };

  const hasActiveFilters = selectedTags.length > 0 || selectedColor;

  return (
    <div className="mb-6">
      {/* Action Buttons Row */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onCreateNote}
          className="inline-flex items-center px-4 py-2 bg-[#705ba0] text-white text-sm font-medium rounded-md hover:bg-[#5d4a87] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#705ba0] transition-colors min-w-[120px] justify-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Note
        </button>
        
        <button
          onClick={onToggleArchived}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 bg-white text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#705ba0] transition-colors min-w-[120px] justify-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
          </svg>
          {showArchived ? `Active (${notesCount})` : `Archived (${archivedCount})`}
        </button>
      </div>

      {/* Search Bar and Filters Row */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search Bar */}
        <div className="flex-1 relative max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-[#705ba0] focus:border-[#705ba0] text-sm"
            placeholder="Search notes by title, content, or tags..."
          />
          {searchQuery && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                onClick={() => onSearchChange("")}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Filters Button */}
        <button
          onClick={onToggleFilters}
          className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md transition-colors min-w-[120px] justify-center ${
            showFilters || hasActiveFilters
              ? "border-[#705ba0] text-[#705ba0] bg-purple-50"
              : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
          }`}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-[#705ba0] rounded-full">
              {selectedTags.length + (selectedColor ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {searchQuery && (
        <div className="mb-4 text-sm text-gray-600">
          Searching in titles, content, and tags for "{searchQuery}"
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex flex-col space-y-4">

            {/* Tags Filter */}
            {allTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? "bg-[#705ba0] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {tag}
                      {selectedTags.includes(tag) && (
                        <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by color
              </label>
              <div className="flex flex-wrap gap-2">
                {NOTE_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => onColorChange(selectedColor === color.value ? null : color.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === color.value
                        ? "border-gray-800 scale-110"
                        : "border-gray-300 hover:border-gray-400"
                    } ${color.bg}`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
