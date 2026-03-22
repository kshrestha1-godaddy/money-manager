/** No "use server" — Next.js only allows async functions in server action modules. */

export const SUPPLEMENTAL_EXPORT_PIECES = [
  "user_profile",
  "transaction_locations",
  "saved_locations",
  "budget_targets",
  "bookmarks",
  "loans",
  "loan_repayments",
  "notifications",
  "dismissed_notifications",
  "notification_settings",
  "account_thresholds",
  "transaction_bookmarks",
  "user_checkins",
  "emergency_emails",
  "password_shares",
  "net_worth_inclusions",
  "activity_logs",
  "notes",
  "chat_threads",
  "chat_conversations",
  "networth_history",
  "transaction_images",
  "goals",
  "goal_phases",
  "goal_progress",
  "investment_target_records",
] as const;

export const SUPPLEMENTAL_EXPORT_PIECE_SET: ReadonlySet<string> = new Set(
  SUPPLEMENTAL_EXPORT_PIECES
);

export type SupplementalExportPiece = (typeof SUPPLEMENTAL_EXPORT_PIECES)[number];

export type SupplementalExportPieceResult =
  | { csv: string; filename: string }
  | { error: string };
