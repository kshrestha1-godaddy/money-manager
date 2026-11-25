/**
 * Differencing operators used before ARMA estimation.
 */

import { at } from "./linalg";

function differenceOnce(series: readonly number[], lag: number): number[] {
  if (!Number.isInteger(lag) || lag < 1) {
    throw new RangeError(`Difference lag must be a positive integer, received ${lag}.`);
  }
  const output: number[] = [];
  for (let t = lag; t < series.length; t += 1) {
    output.push(at(series, t) - at(series, t - lag));
  }
  return output;
}

export function difference(
  series: readonly number[],
  order: number,
  lag: number = 1,
): number[] {
  let current = [...series];
  for (let i = 0; i < order; i += 1) current = differenceOnce(current, lag);
  return current;
}

export function applyDifferencing(
  series: readonly number[],
  d: number,
  seasonalD: number,
  period: number,
): number[] {
  const regular = difference(series, d, 1);
  if (seasonalD === 0) return regular;
  return difference(regular, seasonalD, period);
}

export function differencingLoss(d: number, seasonalD: number, period: number): number {
  return d + seasonalD * period;
}
