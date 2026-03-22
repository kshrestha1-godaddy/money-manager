const ISO_DATE_FILENAME = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Keeps export filenames predictable and avoids odd characters from client input.
 */
export function sanitizeExportDateStrForFilename(raw: string): string {
  const s = String(raw).trim().slice(0, 12);
  if (!ISO_DATE_FILENAME.test(s)) {
    return new Date().toISOString().slice(0, 10);
  }
  return s;
}
