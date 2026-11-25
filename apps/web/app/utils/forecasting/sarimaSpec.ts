/**
 * Translation between a SARIMA specification and the expanded lag polynomials
 * the recursion actually consumes.
 *
 * The model is written in the conventional multiplicative form
 *
 *   `φ(B) Φ(Bᵐ) (1-B)^d (1-Bᵐ)^D x_t = c + θ(B) Θ(Bᵐ) e_t`
 *
 * with `φ(B) = 1 - φ₁B - ...` and `θ(B) = 1 + θ₁B + ...`. Everything downstream
 * works with the collapsed products, so the seasonal structure disappears into
 * ordinary — if sparse and high-order — AR and MA polynomials.
 */

import { differencingPolynomial, evaluatePolynomial, lagPolynomial, multiplyAll } from "./polynomial";
import type { SarimaCoefficients, SarimaSpec } from "./types";

/** The expanded polynomials implied by a specification and its coefficients. */
export interface ExpandedPolynomials {
  /**
   * Stationary AR part `φ(B) Φ(Bᵐ)`, excluding differencing. Governs the
   * stationarity check and the mean term.
   */
  stationaryAr: number[];
  /**
   * Full AR part including both differencing operators. Drives forecasting on
   * the original scale.
   */
  expandedAr: number[];
  /** Full MA part `θ(B) Θ(Bᵐ)`. */
  expandedMa: number[];
  /** Equation constant, `φ(1)Φ(1) · mean`. */
  constant: number;
}

/**
 * Total number of free parameters in a specification.
 *
 * @param spec - The SARIMA specification.
 * @param includeMean - Whether a mean term is estimated.
 * @returns The parameter count, used by the information criteria.
 */
export function parameterCount(spec: SarimaSpec, includeMean: boolean): number {
  return spec.p + spec.q + spec.P + spec.Q + (includeMean ? 1 : 0);
}

/**
 * Validate a specification, throwing on structurally impossible orders.
 *
 * @param spec - The specification to check.
 * @throws RangeError If any order is negative, non-integer, or the seasonal
 *   period is inconsistent with the seasonal orders.
 */
export function assertValidSpec(spec: SarimaSpec): void {
  const orders = [spec.p, spec.d, spec.q, spec.P, spec.D, spec.Q];
  if (orders.some((order) => !Number.isInteger(order) || order < 0)) {
    throw new RangeError("SARIMA orders must be non-negative integers.");
  }
  const hasSeasonal = spec.P > 0 || spec.D > 0 || spec.Q > 0;
  if (hasSeasonal && (!Number.isInteger(spec.m) || spec.m < 2)) {
    throw new RangeError("A seasonal period of at least 2 is required for seasonal orders.");
  }
}

/**
 * Expand a specification and its coefficients into collapsed polynomials.
 *
 * @param spec - The SARIMA specification.
 * @param coefficients - Estimated coefficients matching the specification.
 * @returns The stationary AR, full AR, full MA polynomials and the constant.
 */
export function expandPolynomials(
  spec: SarimaSpec,
  coefficients: SarimaCoefficients,
): ExpandedPolynomials {
  const period = effectivePeriod(spec);
  const stationaryAr = multiplyAll([
    lagPolynomial(negate(coefficients.ar), 1),
    lagPolynomial(negate(coefficients.seasonalAr), period),
  ]);
  const expandedMa = multiplyAll([
    lagPolynomial(coefficients.ma, 1),
    lagPolynomial(coefficients.seasonalMa, period),
  ]);
  return {
    stationaryAr,
    expandedAr: applyDifferencingFactors(stationaryAr, spec, period),
    expandedMa,
    constant: evaluatePolynomial(stationaryAr, 1) * coefficients.mean,
  };
}

/** Multiply the stationary AR polynomial by both differencing operators. */
function applyDifferencingFactors(
  stationaryAr: readonly number[],
  spec: SarimaSpec,
  period: number,
): number[] {
  return multiplyAll([
    stationaryAr,
    differencingPolynomial(spec.d, 1),
    differencingPolynomial(spec.D, period),
  ]);
}

/**
 * Seasonal period to use, collapsing to `1` when no seasonal term is present.
 *
 * Guards against a caller supplying `m = 0` or `m = 12` alongside all-zero
 * seasonal orders, either of which would otherwise distort the expansion.
 *
 * @param spec - The SARIMA specification.
 * @returns The period to apply to seasonal factors.
 */
export function effectivePeriod(spec: SarimaSpec): number {
  const hasSeasonal = spec.P > 0 || spec.D > 0 || spec.Q > 0;
  return hasSeasonal ? spec.m : 1;
}

/** Flip the sign of every coefficient, converting `φ` into lag-polynomial form. */
function negate(coefficients: readonly number[]): number[] {
  return coefficients.map((coefficient) => -coefficient);
}

/**
 * Split a flat optimiser parameter vector into named coefficient groups.
 *
 * The packing order is `[ar, seasonalAr, ma, seasonalMa, mean?]`, matching
 * {@link packParameters}.
 *
 * @param parameters - Flat vector from the optimiser.
 * @param spec - The specification describing the expected lengths.
 * @param includeMean - Whether the vector carries a trailing mean term.
 * @returns The unpacked coefficients.
 */
export function unpackParameters(
  parameters: readonly number[],
  spec: SarimaSpec,
  includeMean: boolean,
): SarimaCoefficients {
  let offset = 0;
  const take = (count: number): number[] => {
    const slice = parameters.slice(offset, offset + count);
    offset += count;
    return [...slice];
  };
  const ar = take(spec.p);
  const seasonalAr = take(spec.P);
  const ma = take(spec.q);
  const seasonalMa = take(spec.Q);
  const mean = includeMean ? (parameters[offset] ?? 0) : 0;
  return { ar, seasonalAr, ma, seasonalMa, mean };
}

/**
 * Flatten named coefficient groups into an optimiser parameter vector.
 *
 * @param coefficients - The coefficients to flatten.
 * @param includeMean - Whether to append the mean term.
 * @returns The flat vector in `[ar, seasonalAr, ma, seasonalMa, mean?]` order.
 */
export function packParameters(
  coefficients: SarimaCoefficients,
  includeMean: boolean,
): number[] {
  const packed = [
    ...coefficients.ar,
    ...coefficients.seasonalAr,
    ...coefficients.ma,
    ...coefficients.seasonalMa,
  ];
  if (includeMean) packed.push(coefficients.mean);
  return packed;
}
