import { SUPPLEMENTAL_EXPORT_PIECES } from "../actions/supplemental-export-pieces.shared";
import { sanitizeExportDateStrForFilename } from "../utils/exportFilename";
import { buildSupplementalExportCsvForUser } from "./supplemental-export-csv-for-user";
import { buildPrimaryExportCsvAttachments, type CsvAttachment } from "./user-primary-export-csv";

const DEFAULT_ACTIVITY_LOG_EMAIL_CAP = 15_000;

export interface WeeklyExportBundleOptions {
  activityLogTake?: number;
}

/**
 * Full weekly attachment set: primary “Export all” CSVs + supplemental pieces (same as dashboard).
 */
export async function buildWeeklyUserExportAttachments(
  userId: number,
  dateInput?: string,
  options?: WeeklyExportBundleOptions
): Promise<CsvAttachment[]> {
  const dateStr = sanitizeExportDateStrForFilename(
    dateInput ?? new Date().toISOString().slice(0, 10)
  );

  const activityLogTake =
    options?.activityLogTake ?? DEFAULT_ACTIVITY_LOG_EMAIL_CAP;

  const supplemental: CsvAttachment[] = [];
  for (const piece of SUPPLEMENTAL_EXPORT_PIECES) {
    const r = await buildSupplementalExportCsvForUser(
      piece,
      userId,
      dateStr,
      piece === "activity_logs" ? { activityLogTake } : undefined
    );
    if ("error" in r && r.error) {
      console.warn(`Weekly export supplemental skip ${piece} user ${userId}:`, r.error);
      continue;
    }
    if ("csv" in r) {
      supplemental.push({
        filename: r.filename,
        content: r.csv.startsWith("\uFEFF") ? r.csv : "\uFEFF" + r.csv,
      });
    }
  }

  const primary = await buildPrimaryExportCsvAttachments(userId, dateStr);
  return [...primary, ...supplemental];
}
