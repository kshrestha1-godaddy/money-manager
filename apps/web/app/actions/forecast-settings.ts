"use server";

import type { Prisma } from "@prisma/client";
import prisma from "@repo/db/client";

import {
    FORECAST_MODELS,
    MAX_SELECTED_MODELS,
    defaultForecastSettings,
    defaultParamsByModel,
    horizonBounds,
    isForecastOrderParams,
} from "../components/forecasting/forecastModels";
import type {
    ForecastOrderParams,
    ForecastSettingsState,
} from "../components/forecasting/forecastModels";
import { getAuthenticatedSession, getUserIdFromSession } from "../utils/auth";

const KNOWN_MODEL_IDS = new Set(FORECAST_MODELS.map((model) => model.id));

const KNOWN_CHART_IDS = new Set([
    "savings-rate",
    "income-trend",
    "expense-trend",
    "networth-history",
]);

export async function getForecastSettings(): Promise<ForecastSettingsState> {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    const row = await prisma.userForecastSetting.findUnique({
        where: { userId },
    });
    if (row === null) return defaultForecastSettings();
    return {
        selectedIds: sanitiseSelectedIds(row.selectedModelIds),
        horizon: clampHorizon(row.horizon),
        paramsById: mergeParams(row.modelParams),
    };
}

export async function saveForecastSettings(
    input: ForecastSettingsState,
): Promise<ForecastSettingsState> {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    const selectedIds = sanitiseSelectedIds(input.selectedIds);
    const horizon = clampHorizon(input.horizon);
    const paramsById = mergeParams(input.paramsById);
    await prisma.userForecastSetting.upsert({
        where: { userId },
        create: {
            userId,
            selectedModelIds: selectedIds,
            horizon,
            modelParams: paramsById as unknown as Prisma.InputJsonValue,
        },
        update: {
            selectedModelIds: selectedIds,
            horizon,
            modelParams: paramsById as unknown as Prisma.InputJsonValue,
        },
    });
    return { selectedIds, horizon, paramsById };
}

export async function getChartForecastEnabled(chartId: string): Promise<boolean> {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    if (!KNOWN_CHART_IDS.has(chartId)) return false;
    const row = await prisma.userChartForecast.findUnique({
        where: { userId_chartId: { userId, chartId } },
    });
    return row?.isEnabled ?? false;
}

export async function setChartForecastEnabled(
    chartId: string,
    isEnabled: boolean,
): Promise<boolean> {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    if (!KNOWN_CHART_IDS.has(chartId)) return false;
    const row = await prisma.userChartForecast.upsert({
        where: { userId_chartId: { userId, chartId } },
        create: { userId, chartId, isEnabled },
        update: { isEnabled },
    });
    return row.isEnabled;
}

function sanitiseSelectedIds(ids: readonly string[]): string[] {
    const unique = [...new Set(ids.filter((id) => KNOWN_MODEL_IDS.has(id)))];
    if (unique.length === 0) return [...defaultForecastSettings().selectedIds];
    return unique.slice(0, MAX_SELECTED_MODELS);
}

function clampHorizon(value: number): number {
    const bounds = horizonBounds();
    if (!Number.isFinite(value)) return defaultForecastSettings().horizon;
    return Math.min(bounds.max, Math.max(bounds.min, Math.round(value)));
}

function mergeParams(raw: unknown): Record<string, ForecastOrderParams> {
    const defaults = defaultParamsByModel();
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return defaults;
    const incoming = raw as Record<string, unknown>;
    for (const model of FORECAST_MODELS) {
        const candidate = incoming[model.id];
        if (isForecastOrderParams(candidate)) defaults[model.id] = candidate;
    }
    return defaults;
}
