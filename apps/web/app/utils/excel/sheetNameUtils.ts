const INVALID_SHEET_CHARS = /[\\/*?:\[\]]/g;
const MAX_SHEET_NAME_LENGTH = 31;

/**
 * Sanitize a string for use as an Excel worksheet name.
 */
export function sanitizeExcelSheetName(name: string): string {
  const cleaned = name.replace(INVALID_SHEET_CHARS, "_").trim();
  if (!cleaned) return "Sheet";
  return cleaned.slice(0, MAX_SHEET_NAME_LENGTH);
}

/**
 * Ensure sheet names are unique (Excel requires unique names per workbook).
 */
export function dedupeSheetNames(names: string[]): string[] {
  const used = new Map<string, number>();
  return names.map((raw) => {
    let base = sanitizeExcelSheetName(raw);
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    if (count === 0) return base;

    const suffix = `_${count + 1}`;
    const maxBaseLen = MAX_SHEET_NAME_LENGTH - suffix.length;
    base = base.slice(0, Math.max(1, maxBaseLen));
    return `${base}${suffix}`;
  });
}
