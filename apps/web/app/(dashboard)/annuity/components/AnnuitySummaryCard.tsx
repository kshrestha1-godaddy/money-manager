import type { ReactNode } from "react";

interface AnnuitySummaryCardProps {
  title: string;
  value: ReactNode;
  /** Short hint or multi-line detail (use a fragment for several lines). */
  subtitle?: ReactNode;
}

export function AnnuitySummaryCard({ title, value, subtitle }: AnnuitySummaryCardProps) {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-100 px-5 py-4">
      <div className="flex h-full flex-col">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="mt-2 text-2xl font-semibold text-gray-900 tabular-nums">{value}</div>
        {subtitle != null ? (
          <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-gray-500">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
