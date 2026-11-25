/**
 * Automatic SARIMA order selection by penalised grid search.
 *
 * Differencing degrees are fixed up front — chosen by the caller or by the
 * stationarity heuristics in `stationarity.ts` — because information criteria
 * are not comparable across different `d` or `D`. Within a fixed differencing
 * scheme the search ranks candidates by AICc.
 */

import { fitSarima } from "./estimation";
import type { FitOptions } from "./estimation";
import type { SarimaModel, SarimaSpec } from "./types";

/** Bounds for an order-selection search. */
export interface SearchBounds {
  /** Largest non-seasonal AR order to try. */
  maxP?: number;
  /** Largest non-seasonal MA order to try. */
  maxQ?: number;
  /** Largest seasonal AR order to try. */
  maxSeasonalP?: number;
  /** Largest seasonal MA order to try. */
  maxSeasonalQ?: number;
}

/** Fixed differencing scheme the search holds constant. */
export interface DifferencingScheme {
  d: number;
  D: number;
  m: number;
}

/** Criterion used to rank candidate specifications. */
export type SelectionCriterion = "aic" | "aicc" | "bic";

/** Options for {@link selectSarimaOrder}. */
export interface SelectionOptions extends SearchBounds {
  /** Which information criterion to minimise. Defaults to `"aicc"`. */
  criterion?: SelectionCriterion;
  /** Fitting options forwarded to every candidate fit. */
  fit?: FitOptions;
}

/** A scored candidate from the search. */
export interface CandidateFit {
  spec: SarimaSpec;
  model: SarimaModel;
  score: number;
}

/** Outcome of an order search. */
export interface SelectionResult {
  /** The best-scoring model. */
  best: CandidateFit;
  /** Every candidate that fitted successfully, ascending by score. */
  candidates: CandidateFit[];
}

/**
 * Search over `(p, q, P, Q)` for the specification minimising a criterion.
 *
 * Candidates that fail to fit — typically because the differenced series is too
 * short for the lag structure — are skipped rather than propagated.
 *
 * @param observations - The series on its original scale.
 * @param differencing - The fixed differencing scheme to search within.
 * @param options - Search bounds, criterion and fitting options.
 * @returns The best candidate and the full ranked list.
 * @throws RangeError If no candidate in the grid could be fitted.
 */
export function selectSarimaOrder(
  observations: readonly number[],
  differencing: DifferencingScheme,
  options: SelectionOptions = {},
): SelectionResult {
  const criterion = options.criterion ?? "aicc";
  const candidates: CandidateFit[] = [];
  for (const spec of enumerateSpecs(differencing, options)) {
    const candidate = tryFit(observations, spec, criterion, options.fit);
    if (candidate !== null) candidates.push(candidate);
  }
  candidates.sort((left, right) => left.score - right.score);
  const best = candidates[0];
  if (best === undefined) {
    throw new RangeError("No SARIMA specification in the search grid could be fitted.");
  }
  return { best, candidates };
}

/** Enumerate every specification in the grid, skipping the all-zero model. */
function enumerateSpecs(
  differencing: DifferencingScheme,
  bounds: SearchBounds,
): SarimaSpec[] {
  const maxP = bounds.maxP ?? 2;
  const maxQ = bounds.maxQ ?? 2;
  const maxSeasonalP = bounds.maxSeasonalP ?? (differencing.m > 1 ? 1 : 0);
  const maxSeasonalQ = bounds.maxSeasonalQ ?? (differencing.m > 1 ? 1 : 0);
  const specs: SarimaSpec[] = [];
  for (let p = 0; p <= maxP; p += 1) {
    for (let q = 0; q <= maxQ; q += 1) {
      for (let P = 0; P <= maxSeasonalP; P += 1) {
        for (let Q = 0; Q <= maxSeasonalQ; Q += 1) {
          if (p + q + P + Q === 0) continue;
          specs.push({ p, q, P, Q, d: differencing.d, D: differencing.D, m: differencing.m });
        }
      }
    }
  }
  return specs;
}

/**
 * Fitting defaults used only during the grid search.
 *
 * A full Nelder–Mead run is unnecessary for ranking: a few hundred iterations
 * from a Hannan–Rissanen start are enough to separate good orders from bad,
 * and the winning specification is re-fitted by the caller if needed.
 */
const SEARCH_FIT_DEFAULTS: FitOptions = {
  optimiser: { maxIterations: 400, tolerance: 1e-8 },
};

/** Fit one candidate, returning `null` if it cannot be estimated. */
function tryFit(
  observations: readonly number[],
  spec: SarimaSpec,
  criterion: SelectionCriterion,
  fitOptions: FitOptions | undefined,
): CandidateFit | null {
  try {
    const model = fitSarima(observations, spec, {
      ...SEARCH_FIT_DEFAULTS,
      ...fitOptions,
      optimiser: {
        ...SEARCH_FIT_DEFAULTS.optimiser,
        ...fitOptions?.optimiser,
      },
    });
    const score = model.criteria[criterion];
    if (!Number.isFinite(score)) return null;
    return { spec, model, score };
  } catch {
    return null;
  }
}
