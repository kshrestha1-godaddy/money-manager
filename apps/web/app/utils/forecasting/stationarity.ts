/**
 * Heuristics for choosing the differencing degrees `d` and `D`.
 *
 * These are deliberately lightweight: a KPSS or augmented Dickey–Fuller test
 * needs tabulated critical values, so instead the routines below difference
 * while a series still shows the signature of a unit root — a near-one lag-1
 * autocorrelation, or a seasonal autocorrelation that stays high.
 */

import { autocorrelation } from "./acf";
import { difference } from "./differencing";
import { at, variance } from "./linalg";

/** Thresholds controlling the differencing heuristics. */
interface DifferencingThresholds {
  /** Lag-1 autocorrelation above which another regular difference is taken. */
  unitRootThreshold?: number;
  /** Seasonal autocorrelation above which a seasonal difference is taken. */
  seasonalThreshold?: number;
  /** Largest number of regular differences to consider. */
  maxD?: number;
  /** Largest number of seasonal differences to consider. */
  maxSeasonalD?: number;
}

/**
 * Choose the number of regular differences a series appears to need.
 *
 * Differencing stops early if it fails to reduce the variance, which guards
 * against over-differencing an already stationary series.
 *
 * @param series - The series on its original scale.
 * @param thresholds - Optional threshold overrides.
 * @returns A differencing degree between `0` and `maxD`.
 */
function selectRegularDifferencing(
  series: readonly number[],
  thresholds: DifferencingThresholds = {},
): number {
  const limit = thresholds.maxD ?? 2;
  const threshold = thresholds.unitRootThreshold ?? 0.9;
  let current = [...series];
  let degree = 0;
  while (degree < limit && hasUnitRoot(current, threshold)) {
    const candidate = difference(current, 1, 1);
    if (candidate.length < 3 || variance(candidate) >= variance(current)) break;
    current = candidate;
    degree += 1;
  }
  return degree;
}

/**
 * Whether a series looks non-stationary by its lag-1 autocorrelation.
 *
 * @param series - The series to test.
 * @param threshold - Lag-1 autocorrelation treated as evidence of a unit root.
 * @returns `true` when the series should be differenced again.
 */
function hasUnitRoot(series: readonly number[], threshold: number = 0.9): boolean {
  if (series.length < 4) return false;
  const correlations = autocorrelation(series, 1);
  return at(correlations, 1) >= threshold;
}

/**
 * Choose the number of seasonal differences a series appears to need.
 *
 * @param series - The series on its original scale.
 * @param period - The seasonal period; a period below 2 yields `0`.
 * @param thresholds - Optional threshold overrides.
 * @returns A seasonal differencing degree between `0` and `maxSeasonalD`.
 */
function selectSeasonalDifferencing(
  series: readonly number[],
  period: number,
  thresholds: DifferencingThresholds = {},
): number {
  if (period < 2) return 0;
  const limit = thresholds.maxSeasonalD ?? 1;
  const threshold = thresholds.seasonalThreshold ?? 0.6;
  let current = [...series];
  let degree = 0;
  while (degree < limit && hasSeasonalRoot(current, period, threshold)) {
    const candidate = difference(current, 1, period);
    if (candidate.length < period + 2) break;
    current = candidate;
    degree += 1;
  }
  return degree;
}

/**
 * Whether a series retains strong autocorrelation at the seasonal lag.
 *
 * @param series - The series to test.
 * @param period - The seasonal period.
 * @param threshold - Seasonal autocorrelation treated as evidence of a
 *   seasonal unit root.
 * @returns `true` when a seasonal difference is warranted.
 */
function hasSeasonalRoot(
  series: readonly number[],
  period: number,
  threshold: number = 0.6,
): boolean {
  if (series.length < 2 * period + 2) return false;
  const correlations = autocorrelation(series, period);
  return at(correlations, period) >= threshold;
}

/**
 * Choose both differencing degrees, seasonal first.
 *
 * Seasonal differencing is applied before assessing the regular degree, since
 * removing a seasonal unit root often removes the apparent trend with it.
 *
 * @param series - The series on its original scale.
 * @param period - The seasonal period; use `1` for non-seasonal data.
 * @param thresholds - Optional threshold overrides.
 * @returns The selected `d` and `D`.
 */
export function selectDifferencing(
  series: readonly number[],
  period: number,
  thresholds: DifferencingThresholds = {},
): { d: number; D: number } {
  const D = selectSeasonalDifferencing(series, period, thresholds);
  const seasonallyAdjusted = D > 0 ? difference(series, D, period) : [...series];
  return { d: selectRegularDifferencing(seasonallyAdjusted, thresholds), D };
}
