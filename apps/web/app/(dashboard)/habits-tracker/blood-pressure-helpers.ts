import type { BloodPressureCategory } from "@prisma/client";

/**
 * Nested L-shaped chart: the worse of systolic vs diastolic bands wins (e.g. Stage 1 S + Stage 2 D → Stage 2).
 * LOW: S 70–90 and D 40–60. NORMAL: S≤120 and D≤80 excluding LOW. Then Pre / Stage 1 / Stage 2 by thresholds.
 */
export function classifyBloodPressure(
  systolic: number,
  diastolic: number
): BloodPressureCategory {
  const S = systolic;
  const D = diastolic;

  if (S >= 160 || D >= 100) return "HIGH_STAGE_2";
  if (S >= 140 || D >= 90) return "HIGH_STAGE_1";
  if (S >= 120 || D >= 80) return "PRE_HYPERTENSION";

  if (S < 70 || D < 40) return "OTHER";
  if (S >= 70 && S <= 90 && D >= 40 && D <= 60) return "LOW";
  if (S <= 120 && D <= 80) return "NORMAL";

  return "OTHER";
}

export const BLOOD_PRESSURE_CATEGORY_LABELS: Record<BloodPressureCategory, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  PRE_HYPERTENSION: "Pre hypertension",
  HIGH_STAGE_1: "High: stage 1",
  HIGH_STAGE_2: "High: stage 2",
  OTHER: "Other / mixed",
};

/** Labels as on the reference chart (uppercase). */
export const BP_CHART_REGION_LABELS: Record<BloodPressureCategory, string> = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  PRE_HYPERTENSION: "PRE HYPERTENSION",
  HIGH_STAGE_1: "HIGH: STAGE 1",
  HIGH_STAGE_2: "HIGH: STAGE 2",
  OTHER: "OTHER",
};

/** Shorter labels so region titles fit inside colored bands on the plot. */
export const BP_CHART_REGION_SHORT: Record<BloodPressureCategory, string> = {
  LOW: "LOW**",
  NORMAL: "NORMAL",
  PRE_HYPERTENSION: "PRE HTN",
  HIGH_STAGE_1: "STAGE 1",
  HIGH_STAGE_2: "STAGE 2",
  OTHER: "OTHER",
};

/** Plot bounds (mmHg): X = diastolic, Y = systolic. */
export const BP_CHART_X_DOMAIN: [number, number] = [40, 125];
export const BP_CHART_Y_DOMAIN: [number, number] = [70, 200];

export const BLOOD_PRESSURE_CATEGORY_BADGE_CLASS: Record<BloodPressureCategory, string> = {
  LOW: "bg-sky-100 text-sky-900",
  NORMAL: "bg-emerald-100 text-emerald-900",
  PRE_HYPERTENSION: "bg-amber-100 text-amber-900",
  HIGH_STAGE_1: "bg-rose-200 text-rose-950",
  HIGH_STAGE_2: "bg-red-700 text-white",
  OTHER: "bg-slate-200 text-slate-800",
};

export const BLOOD_PRESSURE_CHART_COLORS: Record<BloodPressureCategory, string> = {
  LOW: "#0ea5e9",
  NORMAL: "#22c55e",
  PRE_HYPERTENSION: "#f97316",
  HIGH_STAGE_1: "#fda4af",
  HIGH_STAGE_2: "#b91c1c",
  OTHER: "#64748b",
};

export function parseMeasuredAtInput(localDatetime: string): Date {
  const t = localDatetime.trim();
  if (!t) throw new Error("Date and time are required");
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date or time");
  return d;
}

export function datetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${mo}-${day}T${h}:${min}`;
}
