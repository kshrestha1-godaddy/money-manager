interface AnnuitySummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
}

export function AnnuitySummaryCard({ title, value, subtitle }: AnnuitySummaryCardProps) {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-100 px-5 py-4">
      <div className="flex h-full flex-col">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="mt-2 text-2xl font-semibold text-gray-900 tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}
