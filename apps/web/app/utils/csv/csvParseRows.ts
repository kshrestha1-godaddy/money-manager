/**
 * Parse CSV strings produced by arrayToCSV / export converters into 2D arrays.
 */

function stripBom(content: string): string {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

/**
 * Parse a CSV string into rows of string cells.
 * Handles quoted fields, escaped quotes, commas, and newlines inside quotes.
 */
export function csvToRows(content: string): string[][] {
  const text = stripBom(content);
  if (!text.trim()) return [];

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\r") {
      if (next === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

/**
 * Extract sheet name from export filename (e.g. accounts_2026-07-13.csv -> accounts).
 */
export function sheetNameFromExportFilename(filename: string): string {
  const base = filename.replace(/\.csv$/i, "");
  const match = base.match(/^(.+)_\d{4}-\d{2}-\d{2}$/);
  return match?.[1] ?? base;
}
