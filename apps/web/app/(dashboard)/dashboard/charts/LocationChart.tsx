"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Moon, Sun, Scan } from "lucide-react";
import { Map as MapView, MapClusterLayer, MapControls, MapPopup, useMap } from "@/components/ui/map";
import { useChartData } from "../../../hooks/useChartDataContext";
import { DEFAULT_LOCATION } from "../../../utils/locationDefaults";
import type { ExpressionSpecification } from "maplibre-gl";
import { formatCurrency } from "../../../utils/currency";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";

interface LocationChartProps {
  currency: string;
  heightClass?: string;
}

interface TransactionLocationPoint {
  id: number;
  name: string;
  category: string;
  /** Amount converted to the viewer's preferred currency (for display). */
  displayAmount: number;
  longitude: number;
  latitude: number;
  type: "income" | "expense";
  date: string;
  timestamp: number;
}

interface LocationClusterFeatureProperties {
  locationKey: string;
  type: "income" | "expense" | "mixed";
  count: number;
}

function locationKeyForPoint(longitude: number, latitude: number): string {
  return `${longitude.toFixed(6)},${latitude.toFixed(6)}`;
}

function formatTransactionDisplay(displayAmount: number, type: "income" | "expense", userCurrency: string) {
  const formatted = formatCurrency(Math.abs(displayAmount), userCurrency);
  return type === "income" ? `+${formatted}` : `-${formatted}`;
}

function getAmountColor(type: "income" | "expense") {
  return type === "income" ? "text-green-600" : "text-red-600";
}

function MapFraming({ coordinates }: { coordinates: [number, number][] }) {
  const { map, isLoaded } = useMap();
  const fit = useCallback(() => {
    if (!map || coordinates.length === 0) return;
    const bounds = coordinates.reduce((result, point) => ({
      west: Math.min(result.west, point[0]), east: Math.max(result.east, point[0]),
      south: Math.min(result.south, point[1]), north: Math.max(result.north, point[1]),
    }), { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity });
    map.fitBounds(
      [[bounds.west, bounds.south], [bounds.east, bounds.north]],
      { padding: 64, maxZoom: 14, duration: 500 }
    );
  }, [map, coordinates]);
  useEffect(() => { if (isLoaded) fit(); }, [isLoaded, fit]);
  return (
    <button type="button" onClick={fit} disabled={!coordinates.length}
      className="absolute left-3 top-3 z-10 inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white/95 px-3 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
      title="Fit all visible transaction locations" aria-label="Fit all transaction locations">
      <Scan className="h-3.5 w-3.5" /> Fit locations
    </button>
  );
}

function hasValidCoordinates(location: { longitude: unknown; latitude: unknown } | null | undefined) {
  if (!location || location.longitude == null || location.latitude == null || location.longitude === "" || location.latitude === "") return false;
  const lng = Number(location.longitude);
  const lat = Number(location.latitude);
  return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90;
}

export function LocationChart({ currency, heightClass = "h-[850px]" }: LocationChartProps) {
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [datePreset, setDatePreset] = useState("All");
  const [mapTheme, setMapTheme] = useState<"light" | "dark">("light");
  const [transactionType, setTransactionType] = useState<"all" | "income" | "expense">("all");
  const [selectedLocation, setSelectedLocation] = useState<{
    coordinates: [number, number];
    locationKey: string;
  } | null>(null);
  const { filteredIncomes, filteredExpenses } = useChartData();
  const pointColorExpression = useMemo<ExpressionSpecification>(
    () => [
      "match",
      ["get", "type"],
      "income",
      "#22c55e",
      "expense",
      "#ef4444",
      "mixed",
      "#f59e0b",
      "#3b82f6",
    ],
    []
  );

  const dateFiltered = useMemo(() => {
    const matchesDate = (value: Date | string) => {
      const date = new Date(value);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return (!dateRange.start || key >= dateRange.start) && (!dateRange.end || key <= dateRange.end);
    };
    return {
      incomes: filteredIncomes.filter(item => matchesDate(item.date)),
      expenses: filteredExpenses.filter(item => matchesDate(item.date)),
    };
  }, [filteredIncomes, filteredExpenses, dateRange]);

  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    if (preset === "All") { setDateRange({ start: "", end: "" }); return; }
    const today = new Date();
    const start = new Date(today);
    if (preset === "YTD") start.setMonth(0, 1);
    else {
      const months = preset === "1Y" ? 12 : Number.parseInt(preset, 10);
      start.setDate(1);
      start.setMonth(start.getMonth() - months);
      const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      start.setDate(Math.min(today.getDate(), lastDay));
    }
    const day = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    setDateRange({ start: day(start), end: day(today) });
  };

  const locatedTransactions = useMemo<TransactionLocationPoint[]>(() => {
    const incomeLocations = dateFiltered.incomes
      .filter((income) => hasValidCoordinates(income.transactionLocation))
      .map((income) => {
        const date = new Date(income.date);
        return {
          id: income.id,
          name: income.title || "Income",
          category: income.category?.name || "Income",
          displayAmount: convertForDisplaySync(income.amount, income.currency, currency),
          longitude: Number(income.transactionLocation?.longitude),
          latitude: Number(income.transactionLocation?.latitude),
          type: "income" as const,
          date: date.toLocaleDateString(),
          timestamp: date.getTime(),
        };
      });

    const expenseLocations = dateFiltered.expenses
      .filter((expense) => hasValidCoordinates(expense.transactionLocation))
      .map((expense) => {
        const date = new Date(expense.date);
        return {
          id: expense.id,
          name: expense.title || "Expense",
          category: expense.category?.name || "Expense",
          displayAmount: convertForDisplaySync(expense.amount, expense.currency, currency),
          longitude: Number(expense.transactionLocation?.longitude),
          latitude: Number(expense.transactionLocation?.latitude),
          type: "expense" as const,
          date: date.toLocaleDateString(),
          timestamp: date.getTime(),
        };
      });

    return [...incomeLocations, ...expenseLocations].filter(
      (transaction) => Number.isFinite(transaction.latitude) && Number.isFinite(transaction.longitude)
    );
  }, [dateFiltered, currency]);

  const transactions = useMemo(
    () => locatedTransactions.filter(item => transactionType === "all" || item.type === transactionType),
    [locatedTransactions, transactionType]
  );
  const totalTransactions = (transactionType !== "expense" ? dateFiltered.incomes.length : 0)
    + (transactionType !== "income" ? dateFiltered.expenses.length : 0);
  const mappedIncome = transactions.reduce((sum, item) => sum + (item.type === "income" ? item.displayAmount : 0), 0);
  const mappedExpense = transactions.reduce((sum, item) => sum + (item.type === "expense" ? item.displayAmount : 0), 0);
  const missingLocations = totalTransactions - transactions.length;
  useEffect(() => { setSelectedLocation(null); }, [transactions]);

  const transactionsByLocationKey = useMemo(() => {
    const map = new Map<string, TransactionLocationPoint[]>();
    for (const transaction of transactions) {
      const key = locationKeyForPoint(transaction.longitude, transaction.latitude);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(transaction);
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.timestamp - a.timestamp);
    }
    return map;
  }, [transactions]);

  const locationFeatures = useMemo(() => {
    const features: GeoJSON.Feature<GeoJSON.Point, LocationClusterFeatureProperties>[] = [];
    for (const [key, items] of transactionsByLocationKey.entries()) {
      if (items.length === 0) continue;
      const first = items[0]!;
      const hasIncome = items.some((item) => item.type === "income");
      const hasExpense = items.some((item) => item.type === "expense");
      const displayType: "income" | "expense" | "mixed" =
        hasIncome && hasExpense ? "mixed" : hasIncome ? "income" : "expense";
      features.push({
        type: "Feature",
        properties: {
          locationKey: key,
          type: displayType,
          count: items.length,
        },
        geometry: {
          type: "Point",
          coordinates: [first.longitude, first.latitude],
        },
      });
    }
    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [transactionsByLocationKey]);

  const firstLocation = transactions[0];
  const defaultCenter: [number, number] = firstLocation
    ? [firstLocation.longitude, firstLocation.latitude]
    : [DEFAULT_LOCATION.longitude, DEFAULT_LOCATION.latitude];
  const minimalZoom = 1;

  const coordinates = useMemo<[number, number][]>(
    () => locationFeatures.features.map(feature => feature.geometry.coordinates as [number, number]),
    [locationFeatures]
  );

  return (
    <div className={`flex min-h-[560px] flex-col bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 w-full ${heightClass}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Transaction Locations
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Explore where money comes in and goes out. Select a marker for transaction details.
        </p>
        </div>
        <div className="inline-flex rounded-lg bg-gray-100 p-1" role="group" aria-label="Transaction type">
          {(["all", "income", "expense"] as const).map(type => (
            <button key={type} type="button" aria-pressed={transactionType === type}
              onClick={() => setTransactionType(type)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${transactionType === type ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}>
              {type === "all" ? "All transactions" : type === "income" ? "Income" : "Expenses"}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Location date range">
          {["All", "1M", "3M", "6M", "1Y", "YTD"].map(preset => (
            <button key={preset} type="button" onClick={() => applyDatePreset(preset)} aria-pressed={datePreset === preset}
              className={`rounded-md border px-2.5 py-1.5 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${datePreset === preset ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {preset}
            </button>
          ))}
        </div>
        <label htmlFor="location-start-date" className="ml-1 text-gray-500">From</label>
        <input id="location-start-date" type="date" value={dateRange.start} max={dateRange.end || undefined}
          onChange={event => { setDatePreset("Custom"); setDateRange(previous => ({ ...previous, start: event.target.value })); }}
          className="min-w-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <label htmlFor="location-end-date" className="text-gray-500">To</label>
        <input id="location-end-date" type="date" value={dateRange.end} min={dateRange.start || undefined}
          onChange={event => { setDatePreset("Custom"); setDateRange(previous => ({ ...previous, end: event.target.value })); }}
          className="min-w-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-gray-400">{datePreset === "Custom" ? "Custom dates · " : ""}Within dashboard filters</span>
      </div>
      <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Mapped transactions", value: `${transactions.length} / ${totalTransactions}`, color: "text-gray-900" },
          { label: "Distinct locations", value: String(locationFeatures.features.length), color: "text-gray-900" },
          { label: "Mapped income", value: formatCurrency(mappedIncome, currency), color: "text-green-700" },
          { label: "Mapped expenses", value: formatCurrency(mappedExpense, currency), color: "text-red-600" },
        ].map(item => <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2"><dt className="text-xs text-gray-500">{item.label}</dt><dd className={`mt-1 text-sm font-semibold tabular-nums ${item.color}`}>{item.value}</dd></div>)}
      </dl>
      <div className="relative min-h-[280px] flex-1 rounded-lg overflow-hidden border border-gray-200">
        <button
          type="button"
          onClick={() => setMapTheme((previous) => (previous === "light" ? "dark" : "light"))}
          className="absolute top-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white/95 text-gray-700 shadow-sm backdrop-blur-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          aria-label={mapTheme === "light" ? "Use dark map" : "Use light map"}
          title={mapTheme === "light" ? "Dark map" : "Light map"}
        >
          {mapTheme === "light" ? (
            <Moon className="h-4 w-4" aria-hidden />
          ) : (
            <Sun className="h-4 w-4" aria-hidden />
          )}
        </button>
        <MapView
          theme={mapTheme}
          center={defaultCenter}
          zoom={minimalZoom}
        >
          <MapFraming coordinates={coordinates} />
          <MapClusterLayer<LocationClusterFeatureProperties>
            data={locationFeatures}
            clusterRadius={50}
            clusterMaxZoom={14}
            clusterColors={["#22c55e", "#eab308", "#ef4444"]}
            clusterSumProperty="count"
            pointColor={pointColorExpression}
            onPointClick={(feature, coordinates) => {
              const key = feature.properties?.locationKey;
              if (!key) return;
              setSelectedLocation({
                coordinates,
                locationKey: key,
              });
            }}
          />

          {selectedLocation && (
            <MapPopup
              key={`${selectedLocation.coordinates[0]}-${selectedLocation.coordinates[1]}-${selectedLocation.locationKey}`}
              longitude={selectedLocation.coordinates[0]}
              latitude={selectedLocation.coordinates[1]}
              onClose={() => setSelectedLocation(null)}
              closeOnClick={true}
              focusAfterOpen={true}
              closeButton={true}
            >
              {(() => {
                const items = transactionsByLocationKey.get(selectedLocation.locationKey) ?? [];
                const incomeTotal = items.reduce((sum, item) => sum + (item.type === "income" ? item.displayAmount : 0), 0);
                const expenseTotal = items.reduce((sum, item) => sum + (item.type === "expense" ? item.displayAmount : 0), 0);
                return (
                  <div className="max-h-72 overflow-y-auto p-1 min-w-[220px] max-w-[320px]">
                    <div className="mb-3 border-b border-gray-100 pb-3 pr-3">
                      <p className="text-sm font-semibold text-gray-900">{items.length} {items.length === 1 ? "transaction" : "transactions"} at this location</p>
                      <div className="mt-2 space-y-1 text-xs">
                        <p className="flex justify-between gap-3"><span className="text-gray-500">Income</span><span className="font-medium text-green-700">{formatCurrency(incomeTotal, currency)}</span></p>
                        <p className="flex justify-between gap-3"><span className="text-gray-500">Expenses</span><span className="font-medium text-red-600">{formatCurrency(expenseTotal, currency)}</span></p>
                        <p className="flex justify-between gap-3"><span className="text-gray-500">Net flow</span><span className="font-medium">{formatCurrency(incomeTotal - expenseTotal, currency)}</span></p>
                      </div>
                    </div>
                    <ul className="space-y-3">
                      {items.map((transaction) => (
                        <li
                          key={`${transaction.type}-${transaction.id}`}
                          className="border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                        >
                          <div className="font-semibold text-sm leading-snug">{transaction.name}</div>
                          <div className="text-xs text-gray-600">{transaction.category}</div>
                          <div className="text-xs text-gray-500">{transaction.date}</div>
                          <div className={`text-sm font-medium ${getAmountColor(transaction.type)}`}>
                            {formatTransactionDisplay(transaction.displayAmount, transaction.type, currency)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </MapPopup>
          )}

          <MapControls 
            position="bottom-right"
            showZoom={true}
            showCompass={true}
            showLocate={true}
            showFullscreen={true}
          />
        </MapView>
        {transactions.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/60 p-6">
            <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm">
              <p className="font-semibold text-gray-900">{totalTransactions ? "No mapped transactions" : "No transactions in this view"}</p>
              <p className="mt-2 text-sm text-gray-500">{totalTransactions ? "Add locations to your transactions to see them here." : "Try another transaction type or adjust the date filters."}</p>
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <div className="flex flex-wrap gap-4">
          {[{ label: "Income", color: "bg-green-500" }, { label: "Expense", color: "bg-red-500" }, { label: "Both at one location", color: "bg-amber-500" }].map(item => <span key={item.label} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />{item.label}</span>)}
        </div>
        <span>{totalTransactions === 0 ? "No transactions selected" : missingLocations > 0 ? `${missingLocations} without a valid location · not shown` : "All transactions have locations"}</span>
      </div>
      <p className="mt-2 text-xs text-gray-400">Cluster numbers count transactions. Select a cluster to zoom in. Totals follow dashboard filters.</p>
    </div>
  );
}