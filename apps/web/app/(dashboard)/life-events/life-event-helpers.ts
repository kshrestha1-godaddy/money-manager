import { format } from "date-fns";
import type { LifeEventCategory } from "@prisma/client";
import type { LifeEventItem } from "../../types/life-event";

export const LIFE_EVENT_CATEGORY_LABELS: Record<LifeEventCategory, string> = {
  EDUCATION: "Education",
  CAREER: "Career",
  TRAVEL: "Travel",
  PERSONAL: "Personal",
  LEGAL: "Legal",
  DOCUMENTS: "Documents",
  COLLEGE: "College",
  UNIVERSITY: "University",
  SCHOOL: "School",
  MARRIAGE: "Marriage",
  OTHER: "Other",
};

export const LIFE_EVENT_CATEGORY_ORDER: LifeEventCategory[] = [
  "EDUCATION",
  "COLLEGE",
  "UNIVERSITY",
  "SCHOOL",
  "CAREER",
  "TRAVEL",
  "PERSONAL",
  "LEGAL",
  "DOCUMENTS",
  "MARRIAGE",
  "OTHER",
];

/** Hex colors for charts and timeline bubbles (aligned with category badges). */
export const LIFE_EVENT_CATEGORY_CHART_COLORS: Record<LifeEventCategory, string> = {
  EDUCATION: "#6366f1",
  COLLEGE: "#4f46e5",
  UNIVERSITY: "#7c3aed",
  SCHOOL: "#8b5cf6",
  CAREER: "#0ea5e9",
  TRAVEL: "#14b8a6",
  PERSONAL: "#a855f7",
  LEGAL: "#f97316",
  DOCUMENTS: "#64748b",
  MARRIAGE: "#ec4899",
  OTHER: "#94a3b8",
};

/** First letter of the category display name (for timeline bubbles). */
export function lifeEventCategoryLetter(category: LifeEventCategory): string {
  const label = LIFE_EVENT_CATEGORY_LABELS[category];
  const match = label.match(/[A-Za-z0-9]/);
  return match ? match[0]!.toUpperCase() : "?";
}

export function matchesLifeEventSearch(item: LifeEventItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const linkRaw = (item.externalLink ?? "").trim();
  const linkLower = linkRaw.toLowerCase();
  const linkForSearch = linkLower.replace(/^https?:\/\//, "").replace(/^www\./, "");

  const endStr = item.eventEndDate ? formatLifeEventDate(item.eventEndDate) : "";
  const hay = [
    item.title,
    item.description ?? "",
    item.location ?? "",
    item.category,
    LIFE_EVENT_CATEGORY_LABELS[item.category],
    ...item.tags,
    linkLower,
    linkForSearch,
    endStr,
  ]
    .join(" ")
    .toLowerCase();

  return hay.includes(q);
}

export interface YearMonthGroup {
  year: number;
  months: {
    monthIndex: number;
    monthLabel: string;
    events: LifeEventItem[];
  }[];
}

/**
 * UTC months where the event appears in the timeline list.
 * Single-day: that day’s month. Range: only the **start** month and **end** month (not every month in between).
 */
export function getUtcMonthsForEvent(e: LifeEventItem): { year: number; monthIndex: number }[] {
  const start = new Date(e.eventDate);
  if (!e.eventEndDate) {
    return [{ year: start.getUTCFullYear(), monthIndex: start.getUTCMonth() }];
  }
  const end = new Date(e.eventEndDate);
  const sy = start.getUTCFullYear();
  const sm = start.getUTCMonth();
  const ey = end.getUTCFullYear();
  const em = end.getUTCMonth();
  if (sy === ey && sm === em) {
    return [{ year: sy, monthIndex: sm }];
  }
  return [
    { year: sy, monthIndex: sm },
    { year: ey, monthIndex: em },
  ];
}

export function isRangeLifeEvent(item: LifeEventItem): boolean {
  return item.eventEndDate != null;
}

export function formatLifeEventDateDisplay(item: LifeEventItem): string {
  if (!item.eventEndDate) return formatLifeEventDate(item.eventDate);
  const a = formatLifeEventDate(item.eventDate);
  const b = formatLifeEventDate(item.eventEndDate);
  return `${a} – ${b}`;
}

export function groupEventsByYearAndMonth(events: LifeEventItem[]): YearMonthGroup[] {
  const byYear = new Map<number, Map<number, LifeEventItem[]>>();
  for (const e of events) {
    for (const { year, monthIndex } of getUtcMonthsForEvent(e)) {
      if (!byYear.has(year)) byYear.set(year, new Map());
      const ym = byYear.get(year)!;
      if (!ym.has(monthIndex)) ym.set(monthIndex, []);
      ym.get(monthIndex)!.push(e);
    }
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  return years.map((year) => {
    const monthMap = byYear.get(year)!;
    const monthIndices = [...monthMap.keys()].sort((a, b) => b - a);
    return {
      year,
      months: monthIndices.map((monthIndex) => {
        const list = monthMap.get(monthIndex)!;
        list.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
        return {
          monthIndex,
          monthLabel: format(new Date(Date.UTC(year, monthIndex, 1)), "MMMM"),
          events: list,
        };
      }),
    };
  });
}

export function parseTagsInput(raw: string): string[] {
  if (!raw?.trim()) return [];
  const separator = raw.includes(",") ? "," : ";";
  return raw
    .split(separator)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function normalizeExternalLink(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export function dateInputFromEventDate(d: Date): string {
  const x = new Date(d);
  const y = x.getUTCFullYear();
  const m = String(x.getUTCMonth() + 1).padStart(2, "0");
  const day = String(x.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateInputToUtcNoon(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00.000Z`);
}

export function formatLifeEventDate(d: Date): string {
  const x = new Date(d);
  return format(
    new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate())),
    "d MMMM yyyy"
  );
}

/** UTC calendar year overlaps [start, end] inclusive (date-only semantics). */
export function utcYearOverlapsRange(year: number, start: Date, end: Date): boolean {
  const ys = Date.UTC(year, 0, 1);
  const ye = Date.UTC(year, 11, 31, 23, 59, 59, 999);
  const sMs = start.getTime();
  const eMs = end.getTime();
  return sMs <= ye && eMs >= ys;
}
