"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { saveForecastSettings } from "../../../actions/forecast-settings";
import {
    FORECAST_SETTINGS_QUERY_KEY,
    ForecastModelSelector,
    defaultForecastSettings,
    forecastSettingsQuery,
} from "../../../components/forecasting";
import type { ForecastOrderParams, ForecastSettingsState } from "../../../components/forecasting";

export default function ForecastSettingsPage(): React.ReactElement {
    const queryClient = useQueryClient();
    const settingsQuery = useQuery(forecastSettingsQuery);
    const [draft, setDraft] = useState<ForecastSettingsState | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const saveTimer = useRef<number | null>(null);
    const saveGeneration = useRef(0);

    const settings = draft ?? settingsQuery.data ?? defaultForecastSettings();
    const isLoading = settingsQuery.isPending && draft === null;

    const persist = (next: ForecastSettingsState): void => {
        if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => {
            const generation = (saveGeneration.current += 1);
            setIsSaving(true);
            setStatus(null);
            saveForecastSettings(next)
                .then((saved) => {
                    if (generation !== saveGeneration.current) return;
                    setDraft(saved);
                    queryClient.setQueryData(FORECAST_SETTINGS_QUERY_KEY, saved);
                    void queryClient.invalidateQueries({ queryKey: ["forecast-runs"] });
                    setStatus("Saved. Charts will use these models.");
                })
                .catch(() => {
                    if (generation !== saveGeneration.current) return;
                    setStatus("Could not save forecast settings.");
                })
                .finally(() => {
                    if (generation === saveGeneration.current) setIsSaving(false);
                });
        }, 350);
    };

    const handleSelectedIdsChange = (selectedIds: string[]): void => {
        const next = { ...settings, selectedIds };
        setDraft(next);
        persist(next);
    };

    const handleParamsChange = (modelId: string, params: ForecastOrderParams): void => {
        const next = {
            ...settings,
            paramsById: { ...settings.paramsById, [modelId]: params },
        };
        setDraft(next);
        persist(next);
    };

    const handleHorizonChange = (horizon: number): void => {
        const next = { ...settings, horizon };
        setDraft(next);
        persist(next);
    };

    return (
        <div className="w-full space-y-6">
            <div>
                <p className="mb-2 text-sm text-gray-500">
                    <Link href="/settings" className="hover:text-gray-800">
                        Settings
                    </Link>
                    {" / "}
                    Forecast
                </p>
                <h1 className="text-3xl font-bold text-gray-900">Forecast settings</h1>
                <p className="mt-2 text-gray-600">
                    Choose which models to overlay on every forecasting chart, and the
                    orders each one uses. Auto-selected is on by default.
                </p>
            </div>

            {isLoading ? (
                <p className="text-sm text-gray-500">Loading settings…</p>
            ) : (
                <ForecastModelSelector
                    selectedIds={settings.selectedIds}
                    onSelectedIdsChange={handleSelectedIdsChange}
                    paramsById={settings.paramsById}
                    onParamsChange={handleParamsChange}
                    horizon={settings.horizon}
                    onHorizonChange={handleHorizonChange}
                />
            )}

            <p className="text-xs text-gray-500" aria-live="polite">
                {isSaving ? "Saving…" : (status ?? "")}
            </p>
        </div>
    );
}
