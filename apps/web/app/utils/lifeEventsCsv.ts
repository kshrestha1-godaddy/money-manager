import type { LifeEventItem } from "../types/life-event";
import { downloadCSV, mapRowToObject, parseCSV } from "./csvUtils";

/**
 * Stable column order for export and future import validation.
 * event_date / event_end_date: UTC calendar YYYY-MM-DD (matches stored life-event dates).
 * tags: semicolon-separated (aligned with parseTags / parseTagsInput).
 * category: LifeEventCategory enum string (e.g. EDUCATION).
 */
export const LIFE_EVENTS_CSV_HEADERS = [
  "id",
  "title",
  "event_date",
  "event_end_date",
  "category",
  "description",
  "location",
  "tags",
  "external_link",
  "created_at",
  "updated_at",
] as const;

export type LifeEventsCsvHeader = (typeof LIFE_EVENTS_CSV_HEADERS)[number];

function formatUtcDateIsoDay(d: Date): string {
  const x = new Date(d);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
}

export function convertLifeEventsToCsvRows(items: LifeEventItem[]): (string | number)[][] {
  const dataRows = items.map((item) => [
    item.id,
    item.title,
    formatUtcDateIsoDay(item.eventDate),
    item.eventEndDate ? formatUtcDateIsoDay(item.eventEndDate) : "",
    item.category,
    item.description ?? "",
    item.location ?? "",
    item.tags.join("; "),
    item.externalLink ?? "",
    item.createdAt.toISOString(),
    item.updatedAt.toISOString(),
  ]);
  return [[...LIFE_EVENTS_CSV_HEADERS], ...dataRows];
}

/**
 * Download life events as CSV (UTF-8 BOM via csvUtils). Filename without extension; `.csv` is appended.
 */
export function exportLifeEventsToCsvFile(items: LifeEventItem[], filenameBase?: string): void {
  if (items.length === 0) return;
  const rows = convertLifeEventsToCsvRows(items);
  const base = filenameBase ?? `life_events_export_${new Date().toISOString().slice(0, 10)}`;
  downloadCSV(rows, base);
}

/** Max data rows accepted per import (excluding header). */
export const LIFE_EVENTS_CSV_IMPORT_MAX_ROWS = 2000;

const LIFE_EVENTS_CSV_MAX_BYTES = 2_500_000;

export function normalizeCsvHeaderKey(header: string): string {
  return header?.toLowerCase().replace(/\s+/g, "") || "";
}

/** Read a column using export header names and common aliases (e.g. eventdate vs event_date). */
export function getLifeEventCsvField(row: Record<string, string>, ...aliases: string[]): string {
  for (const a of aliases) {
    const nk = normalizeCsvHeaderKey(a);
    if (row[nk] !== undefined && row[nk] !== "") return row[nk]!;
  }
  for (const a of aliases) {
    const nk = normalizeCsvHeaderKey(a);
    if (row[nk] !== undefined) return row[nk] ?? "";
  }
  return "";
}

function stripBom(text: string): string {
  if (!text) return text;
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function headersMissingRequired(headers: string[]): string[] {
  const n = new Set(headers.map(normalizeCsvHeaderKey));
  const missing: string[] = [];
  if (!n.has("title")) missing.push("title");
  if (!n.has("event_date") && !n.has("eventdate")) missing.push("event_date");
  if (!n.has("category")) missing.push("category");
  return missing;
}

/**
 * Parse life-events CSV text (UTF-8, optional BOM). First row must be headers with at least
 * title, event_date (or Event Date), and category.
 */
export function parseLifeEventsCsvText(
  rawText: string
): { ok: true; rows: Record<string, string>[] } | { ok: false; error: string } {
  const trimmed = stripBom(rawText);
  if (!trimmed.trim()) return { ok: false, error: "File is empty" };
  if (trimmed.length > LIFE_EVENTS_CSV_MAX_BYTES) {
    return { ok: false, error: "File is too large (max ~2.5 MB)" };
  }

  const rows = parseCSV(trimmed);
  if (rows.length < 2) {
    return { ok: false, error: "CSV must include a header row and at least one data row" };
  }

  const headers = rows[0]!;
  const missing = headersMissingRequired(headers);
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing required column(s): ${missing.join(", ")}`,
    };
  }

  const dataRows = rows.slice(1);
  if (dataRows.length > LIFE_EVENTS_CSV_IMPORT_MAX_ROWS) {
    return {
      ok: false,
      error: `Too many data rows (max ${LIFE_EVENTS_CSV_IMPORT_MAX_ROWS})`,
    };
  }

  const objects = dataRows.map((row) => mapRowToObject(row, headers));
  return { ok: true, rows: objects };
}
