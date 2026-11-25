/**
 * Catalogue of forecasting models charts can overlay, plus the fit/forecast
 * runner. UI and chart code share this so any series can reuse the same specs.
 */

import {
    differencingLoss,
    effectivePeriod,
    fitSarima,
    forecastSarima,
    futureDates,
    selectDifferencing,
    selectSarimaOrder,
} from "../../utils/forecasting";
import type {
    DatedForecastPoint,
    RegularSeries,
    SarimaSpec,
} from "../../utils/forecasting";

/** Order parameters a user can slide. */
export interface ForecastOrderParams {
    p: number;
    d: number;
    q: number;
    P: number;
    D: number;
    Q: number;
    m: number;
}

/** A slider shown for a selected model. */
export type AdjustableOrder = keyof ForecastOrderParams;

/** Plain-language explainer shown on the settings card. */
export interface ForecastModelCopy {
    /** What kind of future this model assumes. */
    essence: string;
    /** How past observations enter the forecast. */
    uses: string;
    /** What the dashed line on a chart actually is. */
    produces: string;
    /** The estimation / projection procedure, in brief. */
    algorithm: string;
}

/** One model offered in the catalogue. */
export interface ForecastModelDefinition {
    id: string;
    label: string;
    description: string;
    copy: ForecastModelCopy;
    colour: string;
    defaultParams: ForecastOrderParams;
    /** Which orders the sliders expose; empty for auto-search besides `m`. */
    adjustable: AdjustableOrder[];
    /** When true, orders are chosen by AICc rather than the sliders. */
    isAuto: boolean;
}

export interface ForecastRun {
    modelId: string;
    label: string;
    colour: string;
    forecasts: DatedForecastPoint[];
    error: string | null;
}

const ORDER_BOUNDS: Record<AdjustableOrder, { min: number; max: number }> = {
    p: { min: 0, max: 3 },
    d: { min: 0, max: 2 },
    q: { min: 0, max: 3 },
    P: { min: 0, max: 2 },
    D: { min: 0, max: 1 },
    Q: { min: 0, max: 2 },
    m: { min: 2, max: 12 },
};

const HORIZON_BOUNDS = { min: 3, max: 24 };

function orders(
    p: number,
    d: number,
    q: number,
    P: number,
    D: number,
    Q: number,
    m: number,
): ForecastOrderParams {
    return { p, d, q, P, D, Q, m };
}

/** Models available to overlay on any dated series. */
export const FORECAST_MODELS: ForecastModelDefinition[] = [
    {
        id: "auto",
        label: "Auto-selected",
        description: "Lets the data pick an ARIMA / SARIMA specification.",
        copy: {
            essence:
                "There is no fixed story about trend or season — the series is allowed to choose the lag structure that best explains itself.",
            uses: "Reads the full history, tests whether a trend or a seasonal cycle still sits in the levels, then tries a grid of autoregressive and moving-average orders on the resulting stationary series.",
            produces:
                "A single projection whose shape depends on the winner: it may sit flat, carry a slope, or repeat a yearly pattern, always with a 95% interval around the mean path.",
            algorithm:
                "Unit-root heuristics on lag-1 and seasonal autocorrelations pick d and D. A grid over (p, q, P, Q) is fitted by conditional least squares (Nelder–Mead from a Hannan–Rissanen start) and ranked by AICc. The winner is re-fitted and stepped forward with future shocks set to zero.",
        },
        colour: "#2a78d6",
        defaultParams: orders(0, 0, 0, 0, 0, 0, 12),
        adjustable: ["m"],
        isAuto: true,
    },
    {
        id: "arima-010",
        label: "ARIMA(0,1,0)",
        description: "A random walk: tomorrow equals today, plus noise.",
        copy: {
            essence:
                "The level has no memory of how it got here and no reason to go back. The best guess for every future month is the last observation.",
            uses: "Keeps only the most recent value. Earlier history is discarded once the series has been differenced; month-to-month changes are treated as unpredictable shocks.",
            produces:
                "A flat dashed line at the latest point, with an interval that fans out as the horizon grows because each extra shock is allowed to accumulate.",
            algorithm:
                "First difference the series (d = 1). The differenced process is white noise, so the multi-step forecast on the original scale is the last level, integrated forward with no AR or MA terms.",
        },
        colour: "#eb6834",
        defaultParams: orders(0, 1, 0, 0, 0, 0, 1),
        adjustable: ["p", "d", "q"],
        isAuto: false,
    },
    {
        id: "arima-110",
        label: "ARIMA(1,1,0)",
        description: "A random walk whose changes keep some momentum.",
        copy: {
            essence:
                "This month’s change is partly a continuation of last month’s change. Rises tend to be followed by rises, falls by falls, until the momentum dies.",
            uses: "Differences the series, then regresses each change on the previous change (AR(1) on the differences). The fitted φ is how much of the last step is expected to repeat.",
            produces:
                "A path that continues the recent slope for a few periods and then flattens at a new level — not a perpetual trend, just fading momentum.",
            algorithm:
                "Fit φ by conditional least squares on Δy_t = φ Δy_{t−1} + e_t. Forecasts recurse on that AR(1); integrating the differences recovers the original scale.",
        },
        colour: "#1baf7a",
        defaultParams: orders(1, 1, 0, 0, 0, 0, 1),
        adjustable: ["p", "d", "q"],
        isAuto: false,
    },
    {
        id: "arima-111",
        label: "ARIMA(1,1,1)",
        description: "Differenced series with both inertia and a shock smoother.",
        copy: {
            essence:
                "The usual workhorse: the series has a wandering level, last period’s change still matters, and last period’s surprise is allowed to leak into this period.",
            uses: "Differences once, then estimates one autoregressive coefficient (how changes persist) and one moving-average coefficient (how a one-off shock is smoothed rather than treated as a new trend).",
            produces:
                "A short continuation of recent movement that settles faster than a pure AR, because the MA term absorbs transitory noise instead of writing it into the level.",
            algorithm:
                "Minimise the conditional sum of squares of e_t in Δy_t = φ Δy_{t−1} + e_t + θ e_{t−1}. Forecasts use the expanded AR polynomial (including the difference) with future e set to zero and the last residual carried in the MA memory.",
        },
        colour: "#4a3aa7",
        defaultParams: orders(1, 1, 1, 0, 0, 0, 1),
        adjustable: ["p", "d", "q"],
        isAuto: false,
    },
    {
        id: "arima-011-drift",
        label: "ARIMA(0,1,1)",
        description: "Exponential smoothing of a wandering level.",
        copy: {
            essence:
                "The level is a local average that updates when a surprise arrives. There is no explicit slope; the line is a smoothed version of “where we are now”.",
            uses: "Differences the series and fits a single MA coefficient on those differences — the discrete-time form of simple exponential smoothing. Recent observations weigh more than distant ones.",
            produces:
                "A nearly flat projection at a smoothed last level. Isolated spikes are damped; a genuine shift in the level is adopted and then held.",
            algorithm:
                "Δy_t = e_t + θ e_{t−1}. The forecast of the difference is zero after the MA memory dies, so the original-scale path stays at the smoothed last observation.",
        },
        colour: "#0f766e",
        defaultParams: orders(0, 1, 1, 0, 0, 0, 1),
        adjustable: ["p", "d", "q"],
        isAuto: false,
    },
    {
        id: "arima-200",
        label: "ARIMA(2,0,0)",
        description: "Mean-reverting: forecasts decay back toward the average.",
        copy: {
            essence:
                "The series is assumed stationary. High values are temporary; the future is pulled back toward the historical mean rather than walking off with the last point.",
            uses: "Does not difference. Fits two autoregressive lags on the levels, so both last month and the month before help explain where the series sits relative to its mean.",
            produces:
                "A curve that starts near the latest observations and bends back toward the sample average, with intervals that settle at a constant width instead of fanning forever.",
            algorithm:
                "Yule–Walker / Hannan–Rissanen seeds φ₁, φ₂; Nelder–Mead minimises the residual sum of squares of y_t − μ = φ₁(y_{t−1} − μ) + φ₂(y_{t−2} − μ) + e_t. Multi-step forecasts iterate that recursion toward μ.",
        },
        colour: "#b45309",
        defaultParams: orders(2, 0, 0, 0, 0, 0, 1),
        adjustable: ["p", "d", "q"],
        isAuto: false,
    },
    {
        id: "sarima-seasonal-naive",
        label: "Seasonal naive",
        description: "Next year looks like last year, date for date.",
        copy: {
            essence:
                "The only structure that matters is the calendar cycle. December will look like last December; the rest of the history is ignored once that match is made.",
            uses: "Seasonally differences at lag m (usually 12). That is equivalent to saying each future month equals the value from one full cycle earlier, plus a shock.",
            produces:
                "A dashed copy of the last complete cycle, tiled forward. Peaks and troughs land on the same months they did last year, with no extra trend unless the copied values already contain one.",
            algorithm:
                "Apply (1 − Bᵐ). The seasonal difference is treated as noise, so the h-step forecast on the original scale is y_{T+h−m} (or the last available same-season observation), repeated across the horizon.",
        },
        colour: "#be185d",
        defaultParams: orders(0, 0, 0, 0, 1, 0, 12),
        adjustable: ["D", "m"],
        isAuto: false,
    },
    {
        id: "sarima-airline",
        label: "Airline model",
        description: "Trend plus a yearly cycle, each smoothed by an MA shock.",
        copy: {
            essence:
                "Box and Jenkins’ classic for monthly series: the level wanders, the seasonal pattern wanders, and both are cleaned of one-off noise before they are projected.",
            uses: "Takes a regular difference and a seasonal difference, then estimates two moving-average coefficients — one on month-to-month surprises, one on same-month-last-year surprises.",
            produces:
                "A path that keeps a gentle trend and a repeating seasonal shape, but with last year’s quirks damped. Spikes do not become the new December forever.",
            algorithm:
                "Fit SARIMA(0,1,1)(0,1,1)[m] by conditional least squares on (1−B)(1−Bᵐ)y_t = (1+θB)(1+ΘBᵐ)e_t. Forecasts recurse on the expanded polynomials; future innovations are zero.",
        },
        colour: "#7c3aed",
        defaultParams: orders(0, 1, 1, 0, 1, 1, 12),
        adjustable: ["p", "d", "q", "P", "D", "Q", "m"],
        isAuto: false,
    },
    {
        id: "sarima-full",
        label: "SARIMA(1,1,1)(1,1,1)",
        description: "AR and MA memory at both the monthly and the yearly lag.",
        copy: {
            essence:
                "The richest catalogue member: recent months and the same month last year both pull on the next value, after trend and season have been differenced out.",
            uses: "Differences at lag 1 and lag m, then estimates four coefficients — φ and θ for adjacent months, Φ and Θ for the seasonal lag — so both inertia and shock-smoothing operate on two time scales.",
            produces:
                "A projection that can continue a short-run run-up while still locking onto the yearly pattern. More flexible than the airline model, and easier to overfit on a short sample.",
            algorithm:
                "Expand φ(B)Φ(Bᵐ)(1−B)(1−Bᵐ)y_t = θ(B)Θ(Bᵐ)e_t, estimate the four free coefficients by Nelder–Mead on the conditional sum of squares, then iterate the recursion with future e_t = 0.",
        },
        colour: "#0369a1",
        defaultParams: orders(1, 1, 1, 1, 1, 1, 12),
        adjustable: ["p", "d", "q", "P", "D", "Q", "m"],
        isAuto: false,
    },
];

/** Recharts / object-key for a model's forecast series. */
export function forecastSeriesKey(modelId: string): string {
    return `fc_${modelId}`;
}

export interface HistoryMonth {
    month: string;
    formattedMonth: string;
    value: number;
}

export interface ForecastOverlayRow {
    month: string;
    formattedMonth: string;
    history: number | null;
    isForecast: boolean;
    [seriesKey: string]: string | number | boolean | null;
}

function monthKeyFromDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(date: Date): string {
    return date.toLocaleDateString("en", { month: "short", year: "numeric" });
}

/**
 * History rows plus one row per forecast step, with a column per successful run.
 *
 * The last observed point is copied onto each forecast series so the dashed
 * projection continues the solid history line instead of floating.
 */
export function overlayColumns(
    row: ForecastOverlayRow,
    runs: readonly ForecastRun[],
): Record<string, number | null> {
    const columns: Record<string, number | null> = {};
    for (const run of runs) {
        const key = forecastSeriesKey(run.modelId);
        const value = row[key];
        columns[key] = typeof value === "number" ? value : null;
    }
    return columns;
}

export function overlayForecasts(
    history: readonly HistoryMonth[],
    runs: readonly ForecastRun[],
    grain: "month" | "day" = "month",
): ForecastOverlayRow[] {
    if (runs.length === 0) return [];
    const lastValue = history[history.length - 1]?.value ?? null;
    const rows: ForecastOverlayRow[] = history.map((point, index) => {
        const isLast = index === history.length - 1;
        const row: ForecastOverlayRow = {
            month: point.month,
            formattedMonth: point.formattedMonth,
            history: point.value,
            isForecast: false,
        };
        for (const run of runs) {
            row[forecastSeriesKey(run.modelId)] = isLast ? lastValue : null;
        }
        return row;
    });

    const horizon = Math.max(...runs.map((run) => run.forecasts.length), 0);
    for (let step = 0; step < horizon; step += 1) {
        const date = runs.find((run) => run.forecasts[step])?.forecasts[step]?.date ?? new Date();
        const row: ForecastOverlayRow = {
            month: grain === "day" ? dayKeyFromDate(date) : monthKeyFromDate(date),
            formattedMonth: grain === "day" ? dayLabelFromDate(date) : formatMonthLabel(date),
            history: null,
            isForecast: true,
        };
        for (const run of runs) {
            row[forecastSeriesKey(run.modelId)] = run.forecasts[step]?.mean ?? null;
        }
        rows.push(row);
    }
    return rows;
}

function dayKeyFromDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function dayLabelFromDate(date: Date): string {
    const month = date.toLocaleDateString("en", { month: "short" });
    return `${month} ${date.getDate()}`;
}

export function defaultParamsByModel(): Record<string, ForecastOrderParams> {
    return Object.fromEntries(
        FORECAST_MODELS.map((model) => [model.id, { ...model.defaultParams }]),
    );
}

export const DEFAULT_SELECTED_MODEL_IDS = ["auto"] as const;
export const DEFAULT_HORIZON = 12;
export const MAX_SELECTED_MODELS = 4;

/** Persisted forecasting preferences shared by every chart. */
export interface ForecastSettingsState {
    selectedIds: string[];
    horizon: number;
    paramsById: Record<string, ForecastOrderParams>;
}

export function defaultForecastSettings(): ForecastSettingsState {
    return {
        selectedIds: [...DEFAULT_SELECTED_MODEL_IDS],
        horizon: DEFAULT_HORIZON,
        paramsById: defaultParamsByModel(),
    };
}

export function isForecastOrderParams(value: unknown): value is ForecastOrderParams {
    if (value === null || typeof value !== "object") return false;
    const candidate = value as Record<string, unknown>;
    return (["p", "d", "q", "P", "D", "Q", "m"] as const).every(
        (key) => typeof candidate[key] === "number" && Number.isFinite(candidate[key]),
    );
}

export function orderBounds(order: AdjustableOrder): { min: number; max: number } {
    return ORDER_BOUNDS[order];
}

export function horizonBounds(): { min: number; max: number } {
    return HORIZON_BOUNDS;
}

export function specFromParams(params: ForecastOrderParams): SarimaSpec {
    return {
        p: params.p,
        d: params.d,
        q: params.q,
        P: params.P,
        D: params.D,
        Q: params.Q,
        m: params.m,
    };
}

export function formatSpec(value: SarimaSpec): string {
    const core = `(${value.p},${value.d},${value.q})`;
    const isSeasonal = value.P > 0 || value.D > 0 || value.Q > 0;
    if (!isSeasonal) return `ARIMA${core}`;
    return `SARIMA${core}(${value.P},${value.D},${value.Q})[${value.m}]`;
}

/**
 * Fit one catalogue model to a regular series and project `horizon` steps.
 *
 * Failures are returned as `error` so a chart can keep drawing the rest.
 */
export function runForecastModel(
    model: ForecastModelDefinition,
    series: RegularSeries,
    params: ForecastOrderParams,
    horizon: number,
): ForecastRun {
    try {
        const resolved = resolveModel(model, series, params);
        const projected = forecastSarima(resolved.model, horizon);
        const lastDate = series.dates[series.dates.length - 1] ?? new Date();
        const dates = futureDates(lastDate, horizon, series.frequency);
        const floorAtZero = series.values.every((value) => value >= 0);
        return {
            modelId: model.id,
            label: model.label,
            colour: model.colour,
            forecasts: projected.map((point, index) => {
                const mean = floorAtZero ? Math.max(0, point.mean) : point.mean;
                return {
                    ...point,
                    mean,
                    lower: floorAtZero ? Math.max(0, point.lower) : point.lower,
                    upper: floorAtZero ? Math.max(mean, point.upper) : point.upper,
                    date: dates[index] ?? new Date(),
                };
            }),
            error: null,
        };
    } catch (caught) {
        return {
            modelId: model.id,
            label: model.label,
            colour: model.colour,
            forecasts: [],
            error: caught instanceof Error ? caught.message : "Could not fit this model.",
        };
    }
}

function specFitsSample(spec: SarimaSpec, sampleSize: number): boolean {
    const period = effectivePeriod(spec);
    const loss = differencingLoss(spec.d, spec.D, period);
    if (sampleSize <= loss) return false;
    const required = Math.max(spec.p, spec.q, spec.P * period, spec.Q * period) + 1;
    return sampleSize - loss >= required;
}

/**
 * Shrink seasonal period (then drop seasonal terms) until the spec can be
 * estimated on a short sample, instead of silently skipping the model.
 */
function adaptSpecToSample(spec: SarimaSpec, sampleSize: number): SarimaSpec {
    if (specFitsSample(spec, sampleSize)) return spec;
    const maxPeriod = Math.max(2, sampleSize - spec.d - 2);
    for (let m = Math.min(spec.m, maxPeriod); m >= 2; m -= 1) {
        const candidate = { ...spec, m };
        if (specFitsSample(candidate, sampleSize)) return candidate;
    }
    const nonseasonal = { ...spec, P: 0, D: 0, Q: 0, m: 1 };
    return specFitsSample(nonseasonal, sampleSize) ? nonseasonal : spec;
}

function resolveModel(
    definition: ForecastModelDefinition,
    series: RegularSeries,
    params: ForecastOrderParams,
): { spec: SarimaSpec; model: ReturnType<typeof fitSarima> } {
    if (!definition.isAuto) {
        const chosen = adaptSpecToSample(specFromParams(params), series.values.length);
        return { spec: chosen, model: fitSarima(series.values, chosen) };
    }
    const period = Math.max(params.m, 1);
    const { d, D } = selectDifferencing(series.values, period);
    const selection = selectSarimaOrder(series.values, { d, D, m: period }, {
        maxP: 2,
        maxQ: 2,
        maxSeasonalP: period > 1 ? 1 : 0,
        maxSeasonalQ: period > 1 ? 1 : 0,
    });
    return {
        spec: selection.best.spec,
        model: fitSarima(series.values, selection.best.spec),
    };
}
