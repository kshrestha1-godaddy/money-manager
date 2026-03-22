"use server";

import { getVerifiedUserIdForDataAccess } from "../utils/auth";
import { sanitizeExportDateStrForFilename } from "../utils/exportFilename";
import { buildSupplementalExportCsvForUser } from "../services/supplemental-export-csv-for-user";
import {
  SUPPLEMENTAL_EXPORT_PIECE_SET,
  type SupplementalExportPiece,
  type SupplementalExportPieceResult,
} from "./supplemental-export-pieces.shared";

/**
 * One table per server action so the payload stays under Next.js server-action limits.
 * Client should call once per piece and trigger a download for each response.
 */
export async function fetchSupplementalExportPiece(
  piece: SupplementalExportPiece,
  dateStr: string
): Promise<SupplementalExportPieceResult> {
  if (!SUPPLEMENTAL_EXPORT_PIECE_SET.has(piece)) {
    return { error: "Invalid export" };
  }
  const safeDate = sanitizeExportDateStrForFilename(dateStr);

  try {
    const userId = await getVerifiedUserIdForDataAccess();
    return await buildSupplementalExportCsvForUser(piece, userId, safeDate);
  } catch (e) {
    console.error("fetchSupplementalExportPiece", piece, e);
    return {
      error: e instanceof Error ? e.message : "Export piece failed",
    };
  }
}
