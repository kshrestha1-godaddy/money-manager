"use client";

import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import {
    getChartForecastEnabled,
    getForecastSettings,
    setChartForecastEnabled,
} from "../../actions/forecast-settings";
import { toRegularSeries } from "../../utils/forecasting";
import type { Frequency, TimeSeriesPoint } from "../../utils/forecasting";
import { FORECAST_MODELS, defaultForecastSettings, runForecastModel } from "./forecastModels";
import type { ForecastRun, ForecastSettingsState } from "./forecastModels";

export const FORECAST_SETTINGS_QUERY_KEY = ["forecast-settings"] as const;

export const forecastSettingsQuery = queryOptions({
    queryKey: FORECAST_SETTINGS_QUERY_KEY,
    queryFn: getForecastSettings,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
});

const DAYS_PER_STEP: Record<Frequency, number> = {
    daily: 1,
    weekly: 7,
    monthly: 30.44,
    quarterly: 91.31,
    yearly: 365.25,
};

function settingsFingerprint(settings: ForecastSettingsState): string {
    return JSON.stringify({
        ids: settings.selectedIds,
        horizon: settings.horizon,
        params: settings.selectedIds.map((id) => [id, settings.paramsById[id] ?? null]),
    });
}

function seriesFingerprint(points: readonly TimeSeriesPoint[]): string {
    return points
        .map((point) => {
            const date = point.date;
            return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}:${point.value}`;
        })
        .join("|");
}

function horizonInSteps(
    horizonDays: number,
    frequency: Frequency,
    historyLength: number,
    coverHorizonDays: boolean,
): number {
    const periodDays = DAYS_PER_STEP[frequency];
    const steps = coverHorizonDays
        ? Math.ceil(horizonDays / periodDays)
        : Math.round(horizonDays / periodDays);
    const bounded = Math.max(1, steps);
    if (coverHorizonDays) return bounded;
    return Math.min(bounded, Math.max(historyLength, 14));
}

async function fitSeriesForecasts(
    points: readonly TimeSeriesPoint[],
    settings: ForecastSettingsState,
    frequency: Frequency,
    gapFill: "interpolate" | "zero" | undefined,
    coverHorizonDays: boolean,
): Promise<ForecastRun[]> {
    const series = toRegularSeries(points, { frequency, gapFill });
    const horizon = horizonInSteps(
        settings.horizon,
        frequency,
        series.values.length,
        coverHorizonDays,
    );
    const runs: ForecastRun[] = [];
    for (const model of FORECAST_MODELS) {
        if (!settings.selectedIds.includes(model.id)) continue;
        await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 0);
        });
        runs.push(
            runForecastModel(
                model,
                series,
                settings.paramsById[model.id] ?? model.defaultParams,
                horizon,
            ),
        );
    }
    return runs;
}

function forecastVisibilityQueryKey(chartId: string) {
    return ["forecast-visibility", chartId] as const;
}

export function useChartForecast({
    chartId,
    points,
    frequency = "monthly",
    gapFill,
    coverHorizonDays = false,
}: {
    chartId: string;
    points: readonly TimeSeriesPoint[];
    frequency?: Frequency;
    gapFill?: "interpolate" | "zero";
    /** Project the full saved horizon in days, without capping to history length. */
    coverHorizonDays?: boolean;
}): {
    isForecastVisible: boolean;
    toggleForecast: () => void;
    plottedRuns: ForecastRun[];
} {
    const queryClient = useQueryClient();
    const visibilityQuery = useQuery({
        queryKey: forecastVisibilityQueryKey(chartId),
        queryFn: () => getChartForecastEnabled(chartId),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 1,
    });
    const isForecastVisible = visibilityQuery.data ?? false;
    const settingsQuery = useQuery({
        ...forecastSettingsQuery,
        enabled: isForecastVisible,
    });
    const settings =
        settingsQuery.data ?? (settingsQuery.isError ? defaultForecastSettings() : null);
    const settingsKey = settings === null ? "" : settingsFingerprint(settings);
    const seriesKey = useMemo(
        () => (isForecastVisible ? seriesFingerprint(points) : ""),
        [isForecastVisible, points],
    );
    const isReady =
        isForecastVisible &&
        settings !== null &&
        settings.selectedIds.length > 0 &&
        points.length >= 2;

    const runsQuery = useQuery({
        queryKey: [
            "forecast-runs",
            chartId,
            frequency,
            gapFill ?? "",
            settingsKey,
            seriesKey,
            coverHorizonDays,
        ],
        queryFn: () =>
            fitSeriesForecasts(points, settings!, frequency, gapFill, coverHorizonDays),
        enabled: isReady,
        staleTime: Infinity,
        gcTime: 30 * 60 * 1000,
        retry: 0,
    });

    const plottedRuns = useMemo(() => {
        if (!isForecastVisible) return [];
        return (runsQuery.data ?? []).filter(
            (run) => run.error === null && run.forecasts.length > 0,
        );
    }, [isForecastVisible, runsQuery.data]);

    function toggleForecast(): void {
        const next = !isForecastVisible;
        const key = forecastVisibilityQueryKey(chartId);
        void queryClient.cancelQueries({ queryKey: key });
        queryClient.setQueryData(key, next);
        void setChartForecastEnabled(chartId, next)
            .then((saved) => queryClient.setQueryData(key, saved))
            .catch(() => queryClient.setQueryData(key, !next));
    }

    return {
        isForecastVisible,
        toggleForecast,
        plottedRuns,
    };
}

export function pointsThroughLastMonth<T extends { monthKey: string; date: Date }>(
    months: readonly T[],
    lastMonth: string | undefined,
    valueOf: (month: T) => number,
    fallback: readonly T[] = months,
): TimeSeriesPoint[] {
    const sample =
        lastMonth === undefined
            ? months
            : months.filter((month) => month.monthKey <= lastMonth);
    const source = sample.length >= 2 ? sample : fallback;
    return source.map((month) => ({
        date: new Date(month.date.getFullYear(), month.date.getMonth(), 1),
        value: valueOf(month),
    }));
}
