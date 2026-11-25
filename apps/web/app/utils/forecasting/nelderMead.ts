/**
 * Nelder–Mead simplex optimiser.
 *
 * Derivative-free, which suits the SARIMA conditional sum of squares: the
 * objective is cheap to evaluate but awkward to differentiate once the moving
 * average recursion is unrolled.
 */

import { at } from "./linalg";

/** Tuning parameters for {@link nelderMead}. */
export interface NelderMeadOptions {
  /** Maximum simplex iterations before giving up. */
  maxIterations?: number;
  /** Convergence tolerance on the simplex spread of objective values. */
  tolerance?: number;
  /** Relative step used to build the initial simplex. */
  initialStep?: number;
}

/** Outcome of an optimisation run. */
export interface OptimisationResult {
  /** Best parameter vector found. */
  parameters: number[];
  /** Objective value at `parameters`. */
  value: number;
  /** Iterations actually performed. */
  iterations: number;
  /** Whether the spread tolerance was met before the iteration cap. */
  converged: boolean;
}

/** Objective to be minimised. */
export type Objective = (parameters: readonly number[]) => number;

const REFLECTION = 1;
const EXPANSION = 2;
const CONTRACTION = 0.5;
const SHRINK = 0.5;

/** A simplex vertex paired with its objective value. */
interface Vertex {
  point: number[];
  value: number;
}

/**
 * Minimise `objective` over a real parameter vector.
 *
 * @param objective - Function to minimise; may return `Infinity` to mark a
 *   point as infeasible, which the simplex will then move away from.
 * @param start - Starting parameter vector; an empty vector is returned as is.
 * @param options - Optional tuning parameters.
 * @returns The best point found and convergence metadata.
 */
export function nelderMead(
  objective: Objective,
  start: readonly number[],
  options: NelderMeadOptions = {},
): OptimisationResult {
  const maxIterations = options.maxIterations ?? 2000;
  const tolerance = options.tolerance ?? 1e-10;
  if (start.length === 0) {
    return { parameters: [], value: objective([]), iterations: 0, converged: true };
  }
  let simplex = buildSimplex(objective, start, options.initialStep ?? 0.1);
  let iterations = 0;
  while (iterations < maxIterations && spread(simplex) > tolerance) {
    simplex = advance(objective, simplex);
    iterations += 1;
  }
  return summarise(simplex, start, objective, iterations, tolerance);
}

/** Package the finished simplex into a result record. */
function summarise(
  simplex: readonly Vertex[],
  start: readonly number[],
  objective: Objective,
  iterations: number,
  tolerance: number,
): OptimisationResult {
  const best = simplex[0] ?? { point: [...start], value: objective(start) };
  return {
    parameters: best.point,
    value: best.value,
    iterations,
    converged: spread(simplex) <= tolerance,
  };
}

/** Build an initial simplex of `n + 1` vertices around the starting point. */
function buildSimplex(objective: Objective, start: readonly number[], step: number): Vertex[] {
  const vertices: Vertex[] = [evaluate(objective, start)];
  for (let i = 0; i < start.length; i += 1) {
    const point = [...start];
    const current = at(point, i);
    point[i] = current + (Math.abs(current) > 1e-8 ? current * step : step);
    vertices.push(evaluate(objective, point));
  }
  return sortVertices(vertices);
}

/** Evaluate the objective at a point, packaging it as a vertex. */
function evaluate(objective: Objective, point: readonly number[]): Vertex {
  return { point: [...point], value: objective(point) };
}

/** Order vertices from best (lowest) to worst objective value. */
function sortVertices(vertices: readonly Vertex[]): Vertex[] {
  return [...vertices].sort((left, right) => left.value - right.value);
}

/** Difference between the worst and best objective values in the simplex. */
function spread(simplex: readonly Vertex[]): number {
  const best = simplex[0];
  const worst = simplex[simplex.length - 1];
  if (best === undefined || worst === undefined) return 0;
  if (!Number.isFinite(worst.value) || !Number.isFinite(best.value)) return Infinity;
  return Math.abs(worst.value - best.value);
}

/** Centroid of every vertex except the worst. */
function centroid(simplex: readonly Vertex[]): number[] {
  const retained = simplex.slice(0, simplex.length - 1);
  const first = retained[0];
  if (first === undefined) return [];
  const centre = new Array<number>(first.point.length).fill(0);
  for (const vertex of retained) {
    for (let i = 0; i < centre.length; i += 1) centre[i] = at(centre, i) + at(vertex.point, i);
  }
  return centre.map((total) => total / retained.length);
}

/** Move from `centre` through `point` by `factor`. */
function extrapolate(
  centre: readonly number[],
  point: readonly number[],
  factor: number,
): number[] {
  return centre.map((value, i) => value + factor * (value - at(point, i)));
}

/** Perform one reflect / expand / contract / shrink step. */
function advance(objective: Objective, simplex: readonly Vertex[]): Vertex[] {
  const best = simplex[0];
  const worst = simplex[simplex.length - 1];
  const secondWorst = simplex[simplex.length - 2];
  if (best === undefined || worst === undefined || secondWorst === undefined) {
    return [...simplex];
  }
  const centre = centroid(simplex);
  const reflected = evaluate(objective, extrapolate(centre, worst.point, REFLECTION));
  if (reflected.value < best.value) {
    return acceptBetter(objective, simplex, reflected, centre, worst);
  }
  if (reflected.value < secondWorst.value) return replaceWorst(simplex, reflected);
  return contractOrShrink(objective, simplex, centre, worst);
}

/** Try an expansion when reflection produced a new best point. */
function acceptBetter(
  objective: Objective,
  simplex: readonly Vertex[],
  reflected: Vertex,
  centre: readonly number[],
  worst: Vertex,
): Vertex[] {
  const expanded = evaluate(objective, extrapolate(centre, worst.point, EXPANSION));
  return replaceWorst(simplex, expanded.value < reflected.value ? expanded : reflected);
}

/** Contract towards the centroid, shrinking the whole simplex if that fails. */
function contractOrShrink(
  objective: Objective,
  simplex: readonly Vertex[],
  centre: readonly number[],
  worst: Vertex,
): Vertex[] {
  const contracted = evaluate(objective, extrapolate(centre, worst.point, -CONTRACTION));
  if (contracted.value < worst.value) return replaceWorst(simplex, contracted);
  return shrinkTowardsBest(objective, simplex);
}

/** Pull every vertex halfway towards the current best point. */
function shrinkTowardsBest(objective: Objective, simplex: readonly Vertex[]): Vertex[] {
  const best = simplex[0];
  if (best === undefined) return [...simplex];
  const shrunk = simplex.map((vertex, index) =>
    index === 0
      ? vertex
      : evaluate(
          objective,
          vertex.point.map((value, i) => at(best.point, i) + SHRINK * (value - at(best.point, i))),
        ),
  );
  return sortVertices(shrunk);
}

/** Swap the worst vertex for a candidate and re-sort. */
function replaceWorst(simplex: readonly Vertex[], candidate: Vertex): Vertex[] {
  return sortVertices([...simplex.slice(0, simplex.length - 1), candidate]);
}
