/** No "use server" — Next.js only allows async functions in server action modules. */

export const SUPPLEMENTAL_EXPORT_PIECES = [
  "user_profile",
  "budget_targets",
  "bookmarks",
  "transaction_bookmarks",
  "scheduled_payments",
  "transaction_locations",
  "saved_locations",
  "loans",
  "loan_repayments",
  "notifications",
  "dismissed_notifications",
  "notification_settings",
  "account_thresholds",
  "user_checkins",
  "emergency_emails",
  "password_shares",
  "networth_inclusions",
  "activity_logs",
  "notes",
  "chat_threads",
  "chat_conversations",
  "networth_history",
  "transaction_images",
  "goals",
  "goal_phases",
  "goal_progress",
  "annuity_calculator_presets",
  "life_events",
  "user_app_lock_settings",
  "blood_pressure_readings",
  "investment_target_records",
] as const;

export const SUPPLEMENTAL_EXPORT_PIECE_SET: ReadonlySet<string> = new Set(
  SUPPLEMENTAL_EXPORT_PIECES
);

export type SupplementalExportPiece = (typeof SUPPLEMENTAL_EXPORT_PIECES)[number];

export type SupplementalExportPieceResult =
  | { csv: string; filename: string }
  | { error: string };
