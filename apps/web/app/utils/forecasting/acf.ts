/**
 * Autocorrelation used by differencing heuristics and Yule–Walker starts.
 */

import { at, mean } from "./linalg";

function autocovariance(series: readonly number[], maxLag: number): number[] {
  if (series.length === 0) throw new RangeError("Autocovariance needs a non-empty series.");
  const centre = mean(series);
  const limit = Math.min(maxLag, series.length - 1);
  const result: number[] = [];
  for (let lag = 0; lag <= limit; lag += 1) {
    let total = 0;
    for (let t = lag; t < series.length; t += 1) {
      total += (at(series, t) - centre) * (at(series, t - lag) - centre);
    }
    result.push(total / series.length);
  }
  return result;
}

export function autocorrelation(series: readonly number[], maxLag: number): number[] {
  const covariances = autocovariance(series, maxLag);
  const variance0 = at(covariances, 0);
  if (variance0 === 0) return covariances.map((_, index) => (index === 0 ? 1 : 0));
  return covariances.map((covariance) => covariance / variance0);
}
