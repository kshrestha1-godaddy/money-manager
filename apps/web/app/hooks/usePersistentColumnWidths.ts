"use client";

import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";

import { useSession } from "next-auth/react";

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

    const saveColumnWidths = useCallback((widths: Widths) => {
        if (!storageKey) return;
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(widths));
        } catch {
            // Resizing remains available when browser storage is unavailable.
        }
    }, [storageKey]);

    return { columnWidths, setColumnWidths, saveColumnWidths };
}

export function useResizableColumnWidths<Widths extends Record<string, number>>(
    page: string,
    table: string,
    defaults: Widths,
    minWidth: number
) {
    const { data: session } = useSession();
    const user = session?.user;
    const userId = user && "id" in user && typeof user.id === "string" ? user.id : user?.email ?? undefined;
    const storageKey = getColumnWidthsStorageKey(page, table, userId);
    const { columnWidths, setColumnWidths, saveColumnWidths } = usePersistentColumnWidths(storageKey, defaults, minWidth);
    const [drag, setDrag] = useState<{
        column: keyof Widths;
        startX: number;
        startWidth: number;
        widths: Widths;
        storageKey: string | undefined;
    } | null>(null);

    function handleMouseDown(event: ReactMouseEvent, column: keyof Widths) {
        if (event.button !== 0) return;
        event.preventDefault();
        const startWidth = columnWidths[column];
        if (startWidth === undefined) return;
        setDrag({ column, startX: event.pageX, startWidth, widths: columnWidths, storageKey });
    }

    useEffect(() => {
        if (!drag || drag.storageKey !== storageKey) return;
        const { column, startX, startWidth, widths } = drag;
        const resizedWidths = (event: MouseEvent) => ({
            ...widths,
            [column]: event.pageX === startX
                ? startWidth
                : Math.max(minWidth, startWidth + event.pageX - startX),
        });

        function handleMouseMove(event: MouseEvent) {
            setColumnWidths(resizedWidths(event));
        }

        function handleMouseUp(event: MouseEvent) {
            const nextWidths = resizedWidths(event);
            setColumnWidths(nextWidths);
            if (nextWidths[column] !== startWidth) saveColumnWidths(nextWidths);
            setDrag(null);
        }

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [drag, minWidth, saveColumnWidths, setColumnWidths, storageKey]);

    return { columnWidths, handleMouseDown };
}
