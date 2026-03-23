"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { INPUT_COLORS, TEXT_COLORS } from "../../../config/colorConfig";

const labelText = TEXT_COLORS.label;
const standardInput = INPUT_COLORS.standard;

interface Option {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  summaryEmpty?: string;
}

function summary(selected: string[], options: Option[], emptyLabel: string): string {
  if (selected.length === 0) return emptyLabel;
  if (selected.length === 1) {
    const only = selected[0]!;
    const o = options.find((x) => x.value === only);
    return o?.label ?? only;
  }
  return `${selected.length} selected`;
}

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  summaryEmpty = "All",
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function clear() {
    onChange([]);
  }

  function selectAll() {
    onChange(options.map((o) => o.value));
  }

  return (
    <div className="relative flex-1 min-w-[160px]" ref={ref}>
      <label className={labelText}>{label}</label>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className={`${standardInput} flex h-10 w-full items-center justify-between gap-2 text-left`}
      >
        <span className="min-w-0 truncate">
          {summary(selected, options, summaryEmpty)}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          <div className="flex flex-wrap gap-2 border-b border-gray-100 px-2 py-2">
            <button
              type="button"
              onClick={clear}
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              Select all
            </button>
          </div>
          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={checked}
                  onChange={() => toggle(opt.value)}
                />
                <span className="text-sm text-gray-900">{opt.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
