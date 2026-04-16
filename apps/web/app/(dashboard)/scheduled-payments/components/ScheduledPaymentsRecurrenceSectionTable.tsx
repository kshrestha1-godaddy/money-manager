"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { ScheduledPaymentItem } from "../../../types/scheduled-payment";
import { formatCurrency } from "../../../utils/currency";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import {
  accountDisplay,
  formatScheduledPaymentWhenDate,
  isScheduledWithinNextTwoDays,
  recurringDisplay,
  scheduledPaymentStatusLabel,
  sumItemsInDisplayCurrency,
} from "../scheduled-payment-helpers";
import {
  BULK_SELECT_COLUMN_WIDTH_PX,
  TABLE_CELL_X,
  TABLE_CELL_Y,
} from "../scheduled-payments-table-constants";
import type { ScheduledPaymentsSortKey, ScheduledPaymentsTableSortState } from "../scheduled-payments-table-types";
import { ScheduledPaymentsTableColgroup } from "./scheduled-payments-table-colgroup";
import { ScheduledPaymentsTableHeadRow } from "./scheduled-payments-table-head";

export interface ScheduledPaymentsGroupedSection {
  label: string;
  items: ScheduledPaymentItem[];
}

interface ScheduledPaymentsRecurrenceSectionTableProps {
  section: ScheduledPaymentsGroupedSection;
  tableDisplayCurrency: string;
  userTimezone: string;
  now: Date;
  showCheckboxes: boolean;
  selectedPaymentIds: Set<number>;
  onToggleRowSelection: (id: number) => void;
  onView: (item: ScheduledPaymentItem) => void;
  onEdit: (item: ScheduledPaymentItem) => void;
  onCancel: (item: ScheduledPaymentItem) => void;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
  onPostponeDays: (item: ScheduledPaymentItem, days: 1 | 3 | 7) => void | Promise<void>;
  sort: ScheduledPaymentsTableSortState;
  onSort: (key: ScheduledPaymentsSortKey) => void;
  bulkSelectHeaderCell: ReactNode;
}

export function ScheduledPaymentsRecurrenceSectionTable({
  section,
  tableDisplayCurrency,
  userTimezone,
  now,
  showCheckboxes,
  selectedPaymentIds,
  onToggleRowSelection,
  onView,
  onEdit,
  onCancel,
  onAccept,
  onReject,
  onPostponeDays,
  sort,
  onSort,
  bulkSelectHeaderCell,
}: ScheduledPaymentsRecurrenceSectionTableProps) {
  return (
    <div className="mb-6 overflow-x-auto overscroll-x-contain last:mb-3 rounded-lg border border-gray-200/90 bg-white shadow-sm">
      <table className="w-full min-w-[1200px] table-fixed text-sm leading-relaxed">
        <caption className="caption-top w-full border-b border-gray-200 bg-slate-50/95 px-5 py-4 text-left sm:px-6 sm:py-5">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">{section.label}</span>
          <span className="text-xs font-normal text-gray-500">
            {" "}
            · {section.items.length} {section.items.length === 1 ? "payment" : "payments"}
          </span>
        </caption>
        <ScheduledPaymentsTableColgroup />
        <thead className="bg-gray-50 text-left text-gray-600">
          <ScheduledPaymentsTableHeadRow
            tableDisplayCurrency={tableDisplayCurrency}
            sort={sort}
            onSort={onSort}
            bulkSelectHeaderCell={bulkSelectHeaderCell}
          />
        </thead>
        <tbody className="divide-y divide-gray-200/80">
          {section.items.map((item) => {
            const displayAmount = convertForDisplaySync(
              item.amount,
              item.currency,
              tableDisplayCurrency
            );
            const statusLabel = scheduledPaymentStatusLabel(item, now);
            const canDecide = !item.resolution && item.scheduledAt <= now;
            const canDelete = !item.resolution;
            const canEdit = !item.resolution;
            const canPostpone = item.resolution === null;
            const isDueSoon = isScheduledWithinNextTwoDays(item, now);
            const rowTint = isDueSoon
              ? "bg-amber-50/90 hover:bg-amber-100/80"
              : "hover:bg-gray-50/80";

            return (
              <tr key={item.id} className={cn("group align-middle", rowTint)}>
                <td
                  className={`border-r border-gray-100/80 px-3 text-center align-middle ${TABLE_CELL_Y} ${rowTint}`}
                  style={{
                    width: BULK_SELECT_COLUMN_WIDTH_PX,
                    minWidth: BULK_SELECT_COLUMN_WIDTH_PX,
                    maxWidth: BULK_SELECT_COLUMN_WIDTH_PX,
                    boxSizing: "border-box",
                  }}
                >
                  {showCheckboxes && canDelete ? (
                    <input
                      type="checkbox"
                      checked={selectedPaymentIds.has(item.id)}
                      onChange={() => onToggleRowSelection(item.id)}
                      className="mx-auto block h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label={`Select “${item.title}”`}
                    />
                  ) : null}
                </td>
                <td
                  className={`min-w-0 ${TABLE_CELL_X} ${TABLE_CELL_Y} align-middle font-medium text-gray-900 ${rowTint}`}
                >
                  <span className="block break-words leading-snug" title={item.title}>
                    {item.title}
                  </span>
                </td>
                <td
                  className={`${TABLE_CELL_X} ${TABLE_CELL_Y} align-middle whitespace-nowrap text-gray-700 ${rowTint}`}
                >
                  {formatScheduledPaymentWhenDate(item.scheduledAt, userTimezone)}
                </td>
                <td
                  className={`${TABLE_CELL_X} ${TABLE_CELL_Y} align-middle whitespace-nowrap tabular-nums text-gray-900 ${rowTint}`}
                >
                  {formatCurrency(displayAmount, tableDisplayCurrency)}
                </td>
                <td
                  className={`max-w-0 min-w-0 ${TABLE_CELL_X} ${TABLE_CELL_Y} align-middle text-gray-700 ${rowTint}`}
                >
                  <span className="block truncate" title={item.category.name}>
                    {item.category.name}
                  </span>
                </td>
                <td
                  className={`max-w-0 min-w-0 ${TABLE_CELL_X} ${TABLE_CELL_Y} align-middle text-gray-700 ${rowTint}`}
                >
                  <span className="block truncate" title={accountDisplay(item)}>
                    {accountDisplay(item)}
                  </span>
                </td>
                <td
                  className={`max-w-0 min-w-0 ${TABLE_CELL_X} ${TABLE_CELL_Y} align-middle text-gray-600 ${rowTint}`}
                >
                  {item.notes?.trim() ? (
                    <span className="block truncate" title={item.notes}>
                      {item.notes}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td
                  className={`${TABLE_CELL_X} ${TABLE_CELL_Y} align-middle whitespace-nowrap text-gray-700 ${rowTint}`}
                >
                  {recurringDisplay(item)}
                </td>
                <td
                  className={`max-w-0 min-w-0 ${TABLE_CELL_X} ${TABLE_CELL_Y} align-middle ${rowTint}`}
                >
                  <span
                    className={`block truncate ${
                      statusLabel === "Accepted"
                        ? "text-green-700"
                        : statusLabel === "Rejected"
                          ? "text-red-700"
                          : statusLabel === "Awaiting confirmation"
                            ? "text-amber-700"
                            : "text-gray-700"
                    }`}
                    title={statusLabel}
                  >
                    {statusLabel}
                  </span>
                </td>
                <td
                  className={`${TABLE_CELL_X} ${TABLE_CELL_Y} text-center align-middle ${rowTint}`}
                >
                  {renderPostponeColumnContent(item, canPostpone, onPostponeDays)}
                </td>
                <td
                  className={`sticky right-0 z-10 min-w-[11rem] border-l border-gray-100 ${TABLE_CELL_X} ${TABLE_CELL_Y} text-center align-middle shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] sm:min-w-[12rem] ${
                    isDueSoon
                      ? "border-amber-100/80 bg-amber-50/90 group-hover:bg-amber-100/80"
                      : "border-gray-100 bg-white group-hover:bg-gray-50/80"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-center gap-x-0.5 gap-y-1.5">
                    {renderActionCells(
                      item,
                      canDecide,
                      canEdit,
                      canDelete,
                      onView,
                      onEdit,
                      onCancel,
                      onAccept,
                      onReject
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t-2 border-slate-300/70 bg-slate-100/95">
          <tr aria-label={`Subtotal for ${section.label}`}>
            <td
              className={`border-r border-gray-100/80 bg-slate-100/95 ${TABLE_CELL_X} ${TABLE_CELL_Y}`}
              style={{
                width: BULK_SELECT_COLUMN_WIDTH_PX,
                minWidth: BULK_SELECT_COLUMN_WIDTH_PX,
                maxWidth: BULK_SELECT_COLUMN_WIDTH_PX,
                boxSizing: "border-box",
              }}
              aria-hidden
            />
            <td
              colSpan={2}
              className={`${TABLE_CELL_X} ${TABLE_CELL_Y} text-left text-sm font-medium text-gray-800`}
            >
              <span className="text-gray-600">Subtotal</span>
              <span className="mx-1.5 text-gray-400" aria-hidden>
                ·
              </span>
              <span>{section.label}</span>
              <span className="ml-2 font-normal text-gray-500">
                ({section.items.length} {section.items.length === 1 ? "payment" : "payments"})
              </span>
            </td>
            <td
              className={`${TABLE_CELL_X} ${TABLE_CELL_Y} text-sm font-semibold tabular-nums text-gray-900`}
            >
              {formatCurrency(
                sumItemsInDisplayCurrency(section.items, tableDisplayCurrency),
                tableDisplayCurrency
              )}
            </td>
            <td
              colSpan={6}
              className={`${TABLE_CELL_X} ${TABLE_CELL_Y} bg-slate-100/95`}
              aria-hidden
            />
            <td
              className={`sticky right-0 z-10 min-w-[11rem] border-l border-slate-200/90 bg-slate-100/95 ${TABLE_CELL_X} ${TABLE_CELL_Y} shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] sm:min-w-[12rem]`}
              aria-hidden
            />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function renderPostponeColumnContent(
  item: ScheduledPaymentItem,
  canPostpone: boolean,
  onPostponeDays: (item: ScheduledPaymentItem, days: 1 | 3 | 7) => void | Promise<void>
): ReactNode {
  if (!canPostpone) {
    return <span className="text-gray-400">—</span>;
  }
  const postponeQuickClass =
    "inline-flex shrink-0 items-center rounded-md bg-violet-50 px-2 py-1.5 text-xs font-semibold tabular-nums text-violet-700 transition-colors hover:bg-violet-100 hover:text-violet-900";
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      <button
        type="button"
        className={postponeQuickClass}
        aria-label="Postpone 1 day"
        onClick={() => void onPostponeDays(item, 1)}
      >
        1D
      </button>
      <button
        type="button"
        className={postponeQuickClass}
        aria-label="Postpone 3 days"
        onClick={() => void onPostponeDays(item, 3)}
      >
        3D
      </button>
      <button
        type="button"
        className={postponeQuickClass}
        aria-label="Postpone 1 week"
        onClick={() => void onPostponeDays(item, 7)}
      >
        1W
      </button>
    </div>
  );
}

function renderActionCells(
  item: ScheduledPaymentItem,
  canDecide: boolean,
  canEdit: boolean,
  canDelete: boolean,
  onView: (item: ScheduledPaymentItem) => void,
  onEdit: (item: ScheduledPaymentItem) => void,
  onCancel: (item: ScheduledPaymentItem) => void,
  onAccept: (id: number) => void,
  onReject: (id: number) => void
): ReactNode[] {
  const pipeClass = "inline-block shrink-0 select-none px-2 text-xs text-gray-300";
  const nodes: ReactNode[] = [];
  let p = 0;
  const pushPipe = () => {
    nodes.push(
      <span key={`${item.id}-pipe-${p++}`} className={pipeClass} aria-hidden>
        |
      </span>
    );
  };
  nodes.push(
    <button
      key="view"
      type="button"
      onClick={() => onView(item)}
      className="inline-flex shrink-0 items-center rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100 hover:text-indigo-800"
    >
      View
    </button>
  );
  if (canDecide) {
    pushPipe();
    nodes.push(
      <button
        key="accept"
        type="button"
        onClick={() => onAccept(item.id)}
        className="inline-flex shrink-0 items-center rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100 hover:text-indigo-800"
      >
        Accept
      </button>
    );
    pushPipe();
    nodes.push(
      <button
        key="reject"
        type="button"
        onClick={() => onReject(item.id)}
        className="inline-flex shrink-0 items-center rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 hover:text-amber-900"
      >
        Reject
      </button>
    );
  }
  if (canEdit) {
    pushPipe();
    nodes.push(
      <button
        key="edit"
        type="button"
        onClick={() => onEdit(item)}
        className="inline-flex shrink-0 items-center rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800"
      >
        Edit
      </button>
    );
  }
  if (canDelete) {
    pushPipe();
    nodes.push(
      <button
        key="cancel"
        type="button"
        onClick={() => onCancel(item)}
        className="inline-flex shrink-0 items-center rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 hover:text-red-800"
      >
        Cancel
      </button>
    );
  }
  return nodes;
}
