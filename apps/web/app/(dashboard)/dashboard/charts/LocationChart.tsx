"use client";

import { useCallback, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Map as MapView, MapClusterLayer, MapControls, MapPopup } from "@/components/ui/map";
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

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm" />
        <span className="text-gray-600">Income</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 rounded-full bg-red-500 border border-white shadow-sm" />
        <span className="text-gray-600">Expense</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 rounded-full bg-amber-500 border border-white shadow-sm" />
        <span className="text-gray-600">Mixed (same spot)</span>
      </div>
    </div>
  );
}

export function LocationChart({ currency, heightClass = "h-[400px]" }: LocationChartProps) {
  const [mapTheme, setMapTheme] = useState<"light" | "dark">("light");
  const [userLocation, setUserLocation] = useState<{ longitude: number; latitude: number } | null>(null);
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

  const transactions = useMemo<TransactionLocationPoint[]>(() => {
    const incomeLocations = filteredIncomes
      .filter((income) => income.transactionLocation)
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

    const expenseLocations = filteredExpenses
      .filter((expense) => expense.transactionLocation)
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
  }, [filteredIncomes, filteredExpenses, currency]);

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

  const handleLocate = useCallback((coords: { longitude: number; latitude: number }) => {
    setUserLocation(coords);
  }, []);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-full ${heightClass}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Transaction Locations
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Geographic distribution of your financial activities
        </p>
      </div>
      
      <div className="h-[calc(100%-80px)] relative rounded-lg overflow-hidden border">
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
          center={userLocation ? [userLocation.longitude, userLocation.latitude] : defaultCenter}
          zoom={minimalZoom}
        >
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
              closeButton={false}
            >
              {(() => {
                const items = transactionsByLocationKey.get(selectedLocation.locationKey) ?? [];
                return (
                  <div className="max-h-72 overflow-y-auto p-1 min-w-[220px] max-w-[320px]">
                    {items.length > 1 && (
                      <div className="mb-2 border-b border-gray-100 pb-2 text-xs font-medium text-gray-600">
                        {items.length} transactions at this location
                      </div>
                    )}
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
            onLocate={handleLocate}
          />
        </MapView>
      </div>

      {/* Legend */}
      <Legend />
    </div>
  );
}