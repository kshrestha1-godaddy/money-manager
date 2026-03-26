export function parseSafeNumber(value: string): number {
  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function clampYears(years: number): number {
  if (!Number.isFinite(years)) return 1;
  if (years < 1) return 1;
  if (years > 100) return 100;
  return Math.floor(years);
}
