/**
 * SARIMA parameter estimation by conditional least squares.
 *
 * The fitting path is: difference the series, seed the coefficients from
 * Hannan–Rissanen (or Yule–Walker), minimise the conditional sum of squares
 * with Nelder–Mead, then re-run the recursion once at the optimum to recover
 * residuals on the original scale.
 */

import { armaResiduals, innovationVariance } from "./armaCore";
import { gaussianLogLikelihood, informationCriteria } from "./criteria";
import { applyDifferencing, differencingLoss } from "./differencing";
import { initialCoefficients } from "./initialEstimates";
import { nelderMead } from "./nelderMead";
import type { NelderMeadOptions } from "./nelderMead";
import { lagPolynomial } from "./polynomial";
import { isInvertible, isStationary } from "./roots";
import {
  assertValidSpec,
  effectivePeriod,
  expandPolynomials,
  packParameters,
  parameterCount,
  unpackParameters,
} from "./sarimaSpec";
import type { SarimaCoefficients, SarimaModel, SarimaSpec } from "./types";

/** Options controlling a SARIMA fit. */
export interface FitOptions {
  /**
   * Whether to estimate a mean for the differenced series. Defaults to `true`
   * when the series is undifferenced and `false` otherwise, matching the usual
   * convention that differencing removes the level.
   */
  includeMean?: boolean;
  /**
   * Whether to reject parameter vectors that are non-stationary or
   * non-invertible during optimisation. Defaults to `true`.
   */
  enforceStability?: boolean;
  /** Optimiser tuning, forwarded to Nelder–Mead. */
  optimiser?: NelderMeadOptions;
}

/**
 * Fit a SARIMA model to a series by conditional least squares.
 *
 * @param observations - The series on its original scale, chronologically
 *   ordered and regularly spaced.
 * @param spec - The `(p,d,q)(P,D,Q)[m]` specification to fit.
 * @param options - Optional fitting controls.
 * @returns The fitted model, including residuals and information criteria.
 * @throws RangeError If the specification is invalid or the series is too short
 *   to support the requested differencing and lag structure.
 */
export function fitSarima(
  observations: readonly number[],
  spec: SarimaSpec,
  options: FitOptions = {},
): SarimaModel {
  assertValidSpec(spec);
  const stationary = prepareSeries(observations, spec);
  const includeMean = options.includeMean ?? (spec.d === 0 && spec.D === 0);
  const enforceStability = options.enforceStability ?? true;
  const start = packParameters(initialCoefficients(stationary, spec, includeMean), includeMean);
  const objective = buildObjective(stationary, spec, includeMean, enforceStability);
  const optimised = nelderMead(objective, start, options.optimiser);
  const chosen = Number.isFinite(optimised.value) ? optimised.parameters : start;
  const coefficients = unpackParameters(chosen, spec, includeMean);
  return assemble(observations, stationary, spec, coefficients, includeMean);
}

/**
 * Difference the series and verify enough observations survive.
 *
 * @throws RangeError If differencing leaves too little data to estimate the
 *   requested number of parameters.
 */
function prepareSeries(observations: readonly number[], spec: SarimaSpec): number[] {
  const period = effectivePeriod(spec);
  const loss = differencingLoss(spec.d, spec.D, period);
  if (observations.length <= loss) {
    throw new RangeError(
      `Differencing consumes ${loss} observations but only ${observations.length} were supplied.`,
    );
  }
  const stationary = applyDifferencing(observations, spec.d, spec.D, period);
  const required = Math.max(spec.p, spec.q, spec.P * period, spec.Q * period) + 1;
  if (stationary.length < required) {
    throw new RangeError(
      `The differenced series has ${stationary.length} observations; the specification needs at least ${required}.`,
    );
  }
  return stationary;
}

/**
 * Build the conditional sum-of-squares objective for the optimiser.
 *
 * Infeasible points return `Infinity`, which Nelder–Mead treats as a wall and
 * reflects away from.
 */
function buildObjective(
  stationary: readonly number[],
  spec: SarimaSpec,
  includeMean: boolean,
  enforceStability: boolean,
): (parameters: readonly number[]) => number {
  const burnIn = burnInLength(spec);
  return (parameters: readonly number[]): number => {
    const coefficients = unpackParameters(parameters, spec, includeMean);
    // Check each factor separately. Roots of φ(B)Φ(Bᵐ) lie outside the unit
    // circle iff those of φ and Φ do; expanding first turns a seasonal MA(1)
    // into a degree-m polynomial and makes Durand–Kerner dominate the fit.
    if (enforceStability && !areFactorsStable(coefficients)) return Infinity;
    const expanded = expandPolynomials(spec, coefficients);
    const { residuals } = armaResiduals(
      stationary,
      expanded.stationaryAr,
      expanded.expandedMa,
      expanded.constant,
    );
    return sumSquaredAfterBurnIn(residuals, burnIn);
  };
}

/**
 * Stationarity / invertibility on the multiplicative factors.
 *
 * Seasonal polynomials are tested as functions of `w = Bᵐ` (degree `P` / `Q`),
 * which is equivalent to testing the expanded sparse polynomials and far
 * cheaper for monthly seasonality.
 */
function areFactorsStable(coefficients: SarimaCoefficients): boolean {
  const ar = lagPolynomial(coefficients.ar.map((value) => -value), 1);
  const seasonalAr = lagPolynomial(coefficients.seasonalAr.map((value) => -value), 1);
  const ma = lagPolynomial(coefficients.ma, 1);
  const seasonalMa = lagPolynomial(coefficients.seasonalMa, 1);
  return (
    isStationary(ar) &&
    isStationary(seasonalAr) &&
    isInvertible(ma) &&
    isInvertible(seasonalMa)
  );
}

/** Leading residuals excluded from the objective to limit start-up bias. */
function burnInLength(spec: SarimaSpec): number {
  const period = effectivePeriod(spec);
  return Math.max(spec.p, spec.q, spec.P * period, spec.Q * period);
}

/** Sum of squared residuals past the burn-in, guarding against non-finite values. */
function sumSquaredAfterBurnIn(residuals: readonly number[], burnIn: number): number {
  let total = 0;
  for (let t = Math.min(burnIn, residuals.length); t < residuals.length; t += 1) {
    const residual = residuals[t];
    if (residual === undefined || !Number.isFinite(residual)) return Infinity;
    total += residual * residual;
  }
  return total;
}

/** Run the recursion at the optimum and package the fitted model. */
function assemble(
  observations: readonly number[],
  stationary: readonly number[],
  spec: SarimaSpec,
  coefficients: SarimaCoefficients,
  includeMean: boolean,
): SarimaModel {
  const expanded = expandPolynomials(spec, coefficients);
  const { residuals } = armaResiduals(
    stationary,
    expanded.stationaryAr,
    expanded.expandedMa,
    expanded.constant,
  );
  const count = parameterCount(spec, includeMean);
  const sigma2 = innovationVariance(residuals, count);
  return {
    spec,
    coefficients,
    includeMean,
    expandedAr: expanded.expandedAr,
    expandedMa: expanded.expandedMa,
    constant: expanded.constant,
    sigma2,
    residuals,
    observations: [...observations],
    criteria: informationCriteria(
      gaussianLogLikelihood(residuals.length, sigma2),
      count,
      residuals.length,
    ),
  };
}
