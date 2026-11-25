import type { MouseEvent } from "react";
import type { DEFAULT_SCHEDULED_COLUMN_WIDTHS } from "./scheduled-payments-table-constants";

export type ScheduledColumnWidths = typeof DEFAULT_SCHEDULED_COLUMN_WIDTHS;
export type ResizeScheduledColumn = (event: MouseEvent, column: keyof ScheduledColumnWidths) => void;

export type ScheduledPaymentsSortKey =
  | "title"
  | "when"
  | "amount"
  | "category"
  | "account"
  | "notes"
  | "recurrence"
  | "status";

export interface ScheduledPaymentsTableSortState {
  key: ScheduledPaymentsSortKey;
  dir: "asc" | "desc";
}
