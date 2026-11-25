/**
 * Minimal linear-algebra and descriptive-statistics helpers.
 *
 * Kept dependency-free and operating on plain `number[]` / `number[][]` so the
 * rest of the forecasting layer never reaches for an external numeric library.
 */

/**
 * Read an array element, failing loudly instead of yielding `undefined`.
 *
 * Exists because `noUncheckedIndexedAccess` makes every index access optional;
 * the numeric routines below index in tight loops where a bounds bug is a
 * programming error rather than a recoverable condition.
 *
 * @typeParam T - Element type of the array.
 * @param values - The array to read from.
 * @param index - Zero-based index.
 * @returns The element at `index`.
 * @throws RangeError If the index falls outside the array.
 */
export function at<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) {
    throw new RangeError(`Index ${index} out of bounds (length ${values.length}).`);
  }
  return value;
}

/**
 * Read a matrix row, failing loudly on an out-of-bounds index.
 *
 * @param matrix - The matrix to read from.
 * @param index - Zero-based row index.
 * @returns The row at `index`.
 * @throws RangeError If the index falls outside the matrix.
 */
export function row(matrix: readonly number[][], index: number): number[] {
  const value = matrix[index];
  if (value === undefined) {
    throw new RangeError(`Row ${index} out of bounds (length ${matrix.length}).`);
  }
  return value;
}

/**
 * Arithmetic mean of a series.
 *
 * @param values - Input series; must be non-empty.
 * @returns The mean.
 * @throws RangeError If `values` is empty.
 */
export function mean(values: readonly number[]): number {
  if (values.length === 0) {
    throw new RangeError("Cannot take the mean of an empty series.");
  }
  let total = 0;
  for (const value of values) total += value;
  return total / values.length;
}

/**
 * Sample variance of a series, using the `n - ddof` denominator.
 *
 * @param values - Input series.
 * @param ddof - Delta degrees of freedom; `1` gives the unbiased estimate.
 * @returns The variance, or `0` when there are too few observations.
 */
export function variance(values: readonly number[], ddof: number = 1): number {
  if (values.length <= ddof) return 0;
  const centre = mean(values);
  let total = 0;
  for (const value of values) total += (value - centre) ** 2;
  return total / (values.length - ddof);
}

/**
 * Sum of squares of a vector.
 *
 * @param values - Input vector.
 * @returns The sum of squared elements.
 */
export function sumOfSquares(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value * value;
  return total;
}

/**
 * Solve `A x = b` by Gaussian elimination with partial pivoting.
 *
 * @param matrix - Square coefficient matrix, consumed as a copy.
 * @param vector - Right-hand side, length equal to the matrix dimension.
 * @returns The solution vector, or `null` when the system is singular.
 */
export function solveLinearSystem(
  matrix: readonly number[][],
  vector: readonly number[],
): number[] | null {
  const size = matrix.length;
  if (size === 0 || vector.length !== size) return null;
  const augmented = matrix.map((line, i) => [...line, at(vector, i)]);
  for (let pivot = 0; pivot < size; pivot += 1) {
    if (!pivotInPlace(augmented, pivot, size)) return null;
    eliminateBelow(augmented, pivot, size);
  }
  return backSubstitute(augmented, size);
}

/**
 * Swap the row with the largest absolute pivot into position.
 *
 * @returns `false` when the remaining column is numerically zero.
 */
function pivotInPlace(augmented: number[][], pivot: number, size: number): boolean {
  let best = pivot;
  for (let candidate = pivot + 1; candidate < size; candidate += 1) {
    if (Math.abs(at(row(augmented, candidate), pivot)) > Math.abs(at(row(augmented, best), pivot))) {
      best = candidate;
    }
  }
  if (Math.abs(at(row(augmented, best), pivot)) < 1e-12) return false;
  const bestRow = row(augmented, best);
  augmented[best] = row(augmented, pivot);
  augmented[pivot] = bestRow;
  return true;
}

/** Zero out the pivot column beneath the pivot row. */
function eliminateBelow(augmented: number[][], pivot: number, size: number): void {
  const pivotRow = row(augmented, pivot);
  const pivotValue = at(pivotRow, pivot);
  for (let target = pivot + 1; target < size; target += 1) {
    const targetRow = row(augmented, target);
    const factor = at(targetRow, pivot) / pivotValue;
    if (factor === 0) continue;
    for (let column = pivot; column <= size; column += 1) {
      targetRow[column] = at(targetRow, column) - factor * at(pivotRow, column);
    }
  }
}

/** Resolve an upper-triangular augmented system from the bottom up. */
function backSubstitute(augmented: number[][], size: number): number[] {
  const solution = new Array<number>(size).fill(0);
  for (let i = size - 1; i >= 0; i -= 1) {
    const line = row(augmented, i);
    let accumulated = at(line, size);
    for (let j = i + 1; j < size; j += 1) accumulated -= at(line, j) * at(solution, j);
    solution[i] = accumulated / at(line, i);
  }
  return solution;
}

/**
 * Ordinary least squares via the normal equations `(XᵀX) b = Xᵀy`.
 *
 * Ridge-free and intended for the small, well-conditioned designs used by
 * Hannan–Rissanen initialisation; callers needing numerical robustness on
 * near-collinear designs should prefer a QR-based routine.
 *
 * @param design - Row-major design matrix, one row per observation.
 * @param response - Response vector, one entry per design row.
 * @returns The coefficient vector, or `null` if the system is singular.
 */
export function leastSquares(
  design: readonly number[][],
  response: readonly number[],
): number[] | null {
  if (design.length === 0 || design.length !== response.length) return null;
  const width = row(design, 0).length;
  if (width === 0) return null;
  const normal = buildNormalMatrix(design, width);
  const moment = buildMomentVector(design, response, width);
  return solveLinearSystem(normal, moment);
}

/** Accumulate `XᵀX` for the normal equations. */
function buildNormalMatrix(design: readonly number[][], width: number): number[][] {
  const normal = Array.from({ length: width }, () => new Array<number>(width).fill(0));
  for (const line of design) {
    for (let i = 0; i < width; i += 1) {
      const target = row(normal, i);
      const left = at(line, i);
      for (let j = 0; j < width; j += 1) target[j] = at(target, j) + left * at(line, j);
    }
  }
  return normal;
}

/** Accumulate `Xᵀy` for the normal equations. */
function buildMomentVector(
  design: readonly number[][],
  response: readonly number[],
  width: number,
): number[] {
  const moment = new Array<number>(width).fill(0);
  for (let r = 0; r < design.length; r += 1) {
    const line = row(design, r);
    const target = at(response, r);
    for (let i = 0; i < width; i += 1) moment[i] = at(moment, i) + at(line, i) * target;
  }
  return moment;
}
