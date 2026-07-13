/** No "use server" — safe to import from client components. */

import { PRIMARY_EXPORT_SHEETS, type PrimaryExportSheet } from "./primary-export-sheets.shared";
import { SUPPLEMENTAL_EXPORT_PIECES } from "./supplemental-export-pieces.shared";

export type PrimaryExportTableId = (typeof PRIMARY_EXPORT_SHEETS)[number];
export type SupplementalExportTableId = (typeof SUPPLEMENTAL_EXPORT_PIECES)[number];
export type ExportTableId = PrimaryExportTableId | SupplementalExportTableId;

export type ExportTableGroup = "primary" | "supplemental";

export interface ExportTableCatalogEntry {
  id: ExportTableId;
  label: string;
  group: ExportTableGroup;
}

const PRIMARY_LABELS: Record<PrimaryExportTableId, string> = {
  accounts: "Accounts",
  debts: "Debts",
  debt_repayments: "Debt Repayments",
  expenses: "Expenses",
  incomes: "Incomes",
  investments: "Investments",
  investment_targets: "Investment Targets",
  passwords: "Passwords",
  all_categories: "All Categories",
  income_categories: "Income Categories",
  expense_categories: "Expense Categories",
};

const SUPPLEMENTAL_LABELS: Record<SupplementalExportTableId, string> = {
  user_profile: "User Profile",
  budget_targets: "Budget Targets",
  bookmarks: "Bookmarks",
  transaction_bookmarks: "Transaction Bookmarks",
  scheduled_payments: "Scheduled Payments",
  transaction_locations: "Transaction Locations",
  saved_locations: "Saved Locations",
  loans: "Loans",
  loan_repayments: "Loan Repayments",
  notifications: "Notifications",
  dismissed_notifications: "Dismissed Notifications",
  notification_settings: "Notification Settings",
  account_thresholds: "Account Thresholds",
  user_checkins: "User Check-ins",
  emergency_emails: "Emergency Emails",
  password_shares: "Password Shares",
  networth_inclusions: "Net Worth Inclusions",
  activity_logs: "Activity Logs",
  notes: "Notes",
  chat_threads: "Chat Threads",
  chat_conversations: "Chat Conversations",
  networth_history: "Net Worth History",
  transaction_images: "Transaction Images",
  goals: "Goals",
  goal_phases: "Goal Phases",
  goal_progress: "Goal Progress",
  annuity_calculator_presets: "Annuity Calculator Presets",
  life_events: "Life Events",
  user_app_lock_settings: "App Lock Settings",
  blood_pressure_readings: "Blood Pressure Readings",
  investment_target_records: "Investment Target Records",
};

export const EXPORT_TABLE_CATALOG: ExportTableCatalogEntry[] = [
  ...PRIMARY_EXPORT_SHEETS.map((id) => ({
    id,
    label: PRIMARY_LABELS[id],
    group: "primary" as const,
  })),
  ...SUPPLEMENTAL_EXPORT_PIECES.map((id) => ({
    id,
    label: SUPPLEMENTAL_LABELS[id],
    group: "supplemental" as const,
  })),
];

export const PRIMARY_EXPORT_TABLE_IDS: PrimaryExportTableId[] = [...PRIMARY_EXPORT_SHEETS];

export const ALL_EXPORT_TABLE_IDS: ExportTableId[] = EXPORT_TABLE_CATALOG.map((entry) => entry.id);

export const EXPORT_TABLE_ID_SET: ReadonlySet<string> = new Set(ALL_EXPORT_TABLE_IDS);

export function isPrimaryExportTableId(id: string): id is PrimaryExportTableId {
  return (PRIMARY_EXPORT_SHEETS as readonly string[]).includes(id);
}

export function isSupplementalExportTableId(id: string): id is SupplementalExportTableId {
  return (SUPPLEMENTAL_EXPORT_PIECES as readonly string[]).includes(id);
}

export function sortExportTableIds(ids: ExportTableId[]): ExportTableId[] {
  const selected = new Set(ids);
  return EXPORT_TABLE_CATALOG.filter((entry) => selected.has(entry.id)).map(
    (entry) => entry.id
  );
}

export function parseExportTableIds(raw: unknown): ExportTableId[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const ids: ExportTableId[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !EXPORT_TABLE_ID_SET.has(item)) return null;
    ids.push(item as ExportTableId);
  }
  return sortExportTableIds([...new Set(ids)]);
}
