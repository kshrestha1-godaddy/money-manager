"use client";

import { RefreshCw } from "lucide-react";

export function PageRefreshButton({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <button
      type="button"
      aria-label="Refresh page"
      title="Refresh page"
      onClick={onRefresh ?? (() => window.location.reload())}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <RefreshCw className="size-5" aria-hidden="true" />
    </button>
  );
}
