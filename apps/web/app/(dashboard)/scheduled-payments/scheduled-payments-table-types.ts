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
