/** No "use server" — Next.js only allows async functions in server action modules. */

export const SUPPLEMENTAL_EXPORT_PIECES = [
  "budget_targets",
  "bookmarks",
  "transaction_bookmarks",
  "activity_logs",
  "networth_history",
  "investment_target_records",
] as const;

export const SUPPLEMENTAL_EXPORT_PIECE_SET: ReadonlySet<string> = new Set(
  SUPPLEMENTAL_EXPORT_PIECES
);

export type SupplementalExportPiece = (typeof SUPPLEMENTAL_EXPORT_PIECES)[number];

export type SupplementalExportPieceResult =
  | { csv: string; filename: string }
  | { error: string };
