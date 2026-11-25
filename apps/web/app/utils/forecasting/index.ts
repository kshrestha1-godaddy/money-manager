/**
 * ARIMA / SARIMA primitives used by the dashboard forecast overlay.
 */

export type {
  DatedForecastPoint,
  Frequency,
  SarimaSpec,
  TimeSeriesPoint,
} from "./types";

export { differencingLoss } from "./differencing";
export { effectivePeriod } from "./sarimaSpec";
export { fitSarima } from "./estimation";
export { forecastSarima } from "./forecast";
export { selectSarimaOrder } from "./orderSelection";
export { selectDifferencing } from "./stationarity";
export { futureDates, toRegularSeries } from "./timeGrid";
export type { RegularSeries } from "./timeGrid";
