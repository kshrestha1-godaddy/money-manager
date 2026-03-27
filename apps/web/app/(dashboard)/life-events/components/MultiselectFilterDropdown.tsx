"use client";

import { ChevronDown } from "lucide-react";

interface MultiselectFilterDropdownProps {
  label: string;
  summaryText: string;
  onClearFilter: () => void;
  onSelectAllInList: () => void;
  children: React.ReactNode;
}

export function MultiselectFilterDropdown({
  label,
  summaryText,
  onClearFilter,
  onSelectAllInList,
  children,
}: MultiselectFilterDropdownProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <details className="group relative">
        <summary className="inline-flex w-full cursor-pointer list-none items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 marker:content-none focus:outline-none focus:ring-1 focus:ring-brand-500 group-open:border-brand-500 group-open:ring-1 group-open:ring-brand-500 [&::-webkit-details-marker]:hidden">
          <span className="truncate">{summaryText}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="absolute z-30 mt-1 w-full min-w-[12rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-2 py-2">
            <button
              type="button"
              className="text-sm font-medium text-brand-600 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                onClearFilter();
              }}
            >
              All (no filter)
            </button>
            <button
              type="button"
              className="text-sm font-medium text-gray-900 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                onSelectAllInList();
              }}
            >
              Select all
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">{children}</div>
        </div>
      </details>
    </div>
  );
}

interface MultiselectFilterRowProps {
  checked: boolean;
  onToggle: () => void;
  dotColor: string;
  label: string;
}

export function MultiselectFilterRow({ checked, onToggle, dotColor, label }: MultiselectFilterRowProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-800 hover:bg-gray-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
      />
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/5"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      <span className="min-w-0 flex-1">{label}</span>
    </label>
  );
}
