"use client";

import { useEffect, useState } from "react";

export function getColumnWidthsStorageKey(page: string, table: string, userId?: string) {
    if (!userId) return undefined;
    return `column-widths:${[page, table, userId].map(encodeURIComponent).join(":")}`;
}

export function usePersistentColumnWidths<Widths extends Record<string, number>>(
    storageKey: string | undefined,
    defaults: Widths,
    minWidth: number
) {
    const [columnWidths, setColumnWidths] = useState(defaults);

    useEffect(() => {
        const widths = { ...defaults };
        if (storageKey) {
            try {
                const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
                if (saved && typeof saved === "object") {
                    for (const column of Object.keys(defaults) as (keyof Widths)[]) {
                        const width = saved[column];
                        if (typeof width === "number" && Number.isFinite(width) && width >= minWidth) {
                            Object.assign(widths, { [column]: width });
                        }
                    }
                }
            } catch {
                // Use defaults when browser storage is unavailable or invalid.
            }
        }
        setColumnWidths(widths);
    }, [storageKey, defaults, minWidth]);

    function saveColumnWidths(widths: Widths) {
        if (!storageKey) return;
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(widths));
        } catch {
            // Resizing remains available when browser storage is unavailable.
        }
    }

    return { columnWidths, setColumnWidths, saveColumnWidths };
}
