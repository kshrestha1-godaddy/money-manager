"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { INPUT_COLORS, TEXT_COLORS } from "../../config/colorConfig";

interface FilterMultiselectProps {
    label: string;
    itemNamePlural: string;
    options: { label: string; value?: string; color?: string }[];
    selected: string[];
    onChange: (selection: string[]) => void;
}

export function FilterMultiselect({ label, itemNamePlural, options, selected, onChange }: FilterMultiselectProps) {
    const id = useId();
    const labelText = TEXT_COLORS.label;
    const standardInput = INPUT_COLORS.standard;
    const summary = selected.length === 0 ? `All ${itemNamePlural}`
        : selected.length === 1 ? options.find(option => (option.value ?? option.label) === selected[0])?.label ?? selected[0]
        : `${selected.length} ${itemNamePlural}`;

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        function handlePointerDown(event: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [menuOpen]);

    function toggleOption(label: string) {
        onChange(selected.includes(label)
            ? selected.filter(value => value !== label)
            : [...selected, label]);
    }

    return (
        <div
            className="relative"
            ref={menuRef}
        >
            <label className={labelText} htmlFor={id}>
                {label}
            </label>
            <button
                type="button"
                aria-expanded={menuOpen}
                id={id}
                onClick={() => setMenuOpen((o) => !o)}
                className={`${standardInput} flex h-10 w-full items-center justify-between gap-2 text-left`}
            >
                <span className="min-w-0 truncate">
                    {summary}
                </span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 opacity-60 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                    aria-hidden
                />
            </button>
            {menuOpen ? (
                <div
                    role="group"
                    aria-label={label}
                    className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                >
                    <div className="flex flex-wrap gap-2 border-b border-gray-100 px-2 py-2">
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                            All (no filter)
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange(options.map(option => option.value ?? option.label))}
                            className="text-xs font-medium text-gray-600 hover:text-gray-900"
                        >
                            Select all
                        </button>
                    </div>
                    {options.map((option) => {
                        const value = option.value ?? option.label;
                        const checked = selected.includes(value);
                        return (
                            <label
                                key={value}
                                className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50"
                            >
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={checked}
                                    onChange={() =>
                                        toggleOption(value)
                                    }
                                />
                                {option.color && (
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{
                                            backgroundColor: option.color,
                                        }}
                                        aria-hidden
                                    />
                                )}
                                <span className="text-sm text-gray-900">
                                    {option.label}
                                </span>
                            </label>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
