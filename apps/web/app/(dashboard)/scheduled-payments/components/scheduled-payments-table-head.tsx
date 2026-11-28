import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import {
  BULK_SELECT_COLUMN_WIDTH_PX,
  TABLE_CELL_X,
  TABLE_HEAD_Y,
} from "../../constants/scheduled-payments-constants";
import type { ResizeScheduledColumn, ScheduledPaymentsSortKey, ScheduledPaymentsTableSortState } from "../scheduled-payments-table-types";

interface SortableThProps {
  label: string;
  columnKey: ScheduledPaymentsSortKey;
  onResizeColumn: ResizeScheduledColumn;
  sort: ScheduledPaymentsTableSortState;
  onSort: (key: ScheduledPaymentsSortKey) => void;
  className?: string;
}

const resizeHandleClass = "absolute inset-y-0 right-0 z-10 w-1 cursor-col-resize hover:bg-blue-500/50";

function SortableTh({ label, columnKey, sort, onSort, onResizeColumn, className = "" }: SortableThProps) {
  const active = sort.key === columnKey;
  return (
    <th className={`relative ${TABLE_CELL_X} ${TABLE_HEAD_Y} align-middle text-sm font-medium text-gray-700 ${className}`}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className="-mx-1 inline-flex max-w-full items-center gap-1 rounded px-1 py-0.5 text-left text-gray-700 hover:bg-gray-100/80 hover:text-gray-900"
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span className="min-w-0 truncate">{label}</span>
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-35" aria-hidden />
        )}
      </button>
      <div aria-hidden className={resizeHandleClass} onMouseDown={(event) => onResizeColumn(event, columnKey)} />
    </th>
  );
}

interface ScheduledPaymentsTableHeadRowProps {
  tableDisplayCurrency: string;
  sort: ScheduledPaymentsTableSortState;
  onSort: (key: ScheduledPaymentsSortKey) => void;
  bulkSelectHeaderCell: ReactNode;
  onResizeColumn: ResizeScheduledColumn;
}

export function ScheduledPaymentsTableHeadRow({
  tableDisplayCurrency,
  sort,
  onSort,
  bulkSelectHeaderCell,
  onResizeColumn,
}: ScheduledPaymentsTableHeadRowProps) {
  return (
    <tr className="bg-gray-50 text-left text-gray-600">
      {bulkSelectHeaderCell}
      <SortableTh label="Title" columnKey="title" sort={sort} onSort={onSort} onResizeColumn={onResizeColumn} />
      <SortableTh
        label="Scheduled at"
        columnKey="when"
        sort={sort}
        onSort={onSort}
        onResizeColumn={onResizeColumn}
        className="whitespace-nowrap"
      />
      <th scope="col" className={`relative ${TABLE_CELL_X} ${TABLE_HEAD_Y} align-middle text-sm font-medium text-gray-700`}>
        Accepted at
        <div aria-hidden className={resizeHandleClass} onMouseDown={(event) => onResizeColumn(event, "acceptedAt")} />
      </th>
      <SortableTh
        label={`Amount (${tableDisplayCurrency.toUpperCase()})`}
        columnKey="amount"
        sort={sort}
        onSort={onSort}
        onResizeColumn={onResizeColumn}
        className="tabular-nums"
      />
      <SortableTh label="Category" columnKey="category" sort={sort} onSort={onSort} onResizeColumn={onResizeColumn} />
      <SortableTh label="Account" columnKey="account" sort={sort} onSort={onSort} onResizeColumn={onResizeColumn} />
      <SortableTh label="Notes" columnKey="notes" sort={sort} onSort={onSort} onResizeColumn={onResizeColumn} />
      <SortableTh label="Recurrence" columnKey="recurrence" sort={sort} onSort={onSort} onResizeColumn={onResizeColumn} />
      <SortableTh label="Status" columnKey="status" sort={sort} onSort={onSort} onResizeColumn={onResizeColumn} />
      <th
        className={`relative ${TABLE_CELL_X} ${TABLE_HEAD_Y} text-center text-xs font-semibold uppercase tracking-wider text-gray-500`}
      >
        Postpone
        <div aria-hidden className={resizeHandleClass} onMouseDown={(event) => onResizeColumn(event, "postpone")} />
      </th>
      <th
        className={`sticky right-0 z-20 min-w-[11rem] border-l border-gray-200 bg-gray-50 ${TABLE_CELL_X} ${TABLE_HEAD_Y} text-center text-xs font-semibold uppercase tracking-wider text-gray-500 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.08)] sm:min-w-[12rem]`}
      >
        Actions
      </th>
    </tr>
  );
}

export function ScheduledPaymentsBulkSelectHeaderEmptyTh() {
  return (
    <th
      className={`relative border-r border-gray-100 ${TABLE_HEAD_Y} px-3 text-center align-middle`}
      style={{
        width: BULK_SELECT_COLUMN_WIDTH_PX,
        minWidth: BULK_SELECT_COLUMN_WIDTH_PX,
        maxWidth: BULK_SELECT_COLUMN_WIDTH_PX,
        boxSizing: "border-box",
      }}
      aria-hidden
    />
  );
}
