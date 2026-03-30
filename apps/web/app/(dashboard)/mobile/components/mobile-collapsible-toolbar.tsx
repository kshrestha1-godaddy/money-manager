"use client";

import { useCallback, type ReactNode, type RefObject } from "react";

function useCollapsibleDetails(rootRef: RefObject<HTMLDivElement | null>) {
  const expandAll = useCallback(() => {
    rootRef.current?.querySelectorAll("details").forEach((el) => {
      (el as HTMLDetailsElement).open = true;
    });
  }, [rootRef]);

  const collapseAll = useCallback(() => {
    rootRef.current?.querySelectorAll("details").forEach((el) => {
      (el as HTMLDetailsElement).open = false;
    });
  }, [rootRef]);

  return { expandAll, collapseAll };
}

export interface MobileCollapsibleToolbarProps {
  rootRef: RefObject<HTMLDivElement | null>;
  /** e.g. Add income on the left; expand/collapse stay on the right. */
  leading?: ReactNode;
}

/**
 * Expand / collapse all nested `<details>` under `rootRef`.
 * Visual style: light filled pills (no border), right-aligned, section divider lines (matches mobile hub income/expense).
 */
export function MobileCollapsibleToolbar({ rootRef, leading }: MobileCollapsibleToolbarProps) {
  const { expandAll, collapseAll } = useCollapsibleDetails(rootRef);

  return (
    <div
      className="mb-3 w-full border-y border-gray-200 bg-white py-2.5"
      role="toolbar"
      aria-label="List actions and expand or collapse grouped sections"
    >
      <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
        {leading ? <div className="min-w-0 shrink">{leading}</div> : null}
        <div className="ml-auto flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="rounded-md bg-gray-50 px-3 py-1.5 text-sm font-medium text-slate-700 min-h-[40px] hover:bg-gray-100 active:bg-gray-200/80"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded-md bg-gray-50 px-3 py-1.5 text-sm font-medium text-slate-700 min-h-[40px] hover:bg-gray-100 active:bg-gray-200/80"
          >
            Collapse all
          </button>
        </div>
      </div>
    </div>
  );
}
