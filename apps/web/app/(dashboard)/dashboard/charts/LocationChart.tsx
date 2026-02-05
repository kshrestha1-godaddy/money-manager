"use client";

import { useCallback, useMemo, useState } from "react";
import { Map, MapClusterLayer, MapControls, MapPopup } from "@/components/ui/map";
import { useChartData } from "../../../hooks/useChartDataContext";
import { DEFAULT_LOCATION } from "../../../utils/locationDefaults";
import type { ExpressionSpecification } from "maplibre-gl";

interface LocationChartProps {
  currency: string;
  heightClass?: string;
}

interface TransactionLocationPoint {
  id: number;
  name: string;
  category: string;
  amount: number;
  longitude: number;
  latitude: number;
  type: "income" | "expense";
  date: string;
}

function formatAmount(amount: number, type: "income" | "expense", currency: string) {
  const sign = type === "income" ? "+" : "-";
  return `${sign}${amount.toLocaleString()} ${currency}`;
}

function getAmountColor(type: "income" | "expense") {
  return type === "income" ? "text-green-600" : "text-red-600";
}

function Legend() {
  return (
    <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm" />
        <span className="text-gray-600">Income</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 rounded-full bg-red-500 border border-white shadow-sm" />
        <span className="text-gray-600">Expense</span>
      </div>
    </div>
  );
}

export function LocationChart({ currency, heightClass = "h-[400px]" }: LocationChartProps) {
  const [userLocation, setUserLocation] = useState<{ longitude: number; latitude: number } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{
    coordinates: [number, number];
    properties: TransactionLocationPoint;
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
      "#3b82f6",
    ],
    []
  );

  const transactions = useMemo<TransactionLocationPoint[]>(() => {
    const incomeLocations = filteredIncomes
      .filter((income) => income.transactionLocation)
      .map((income) => ({
        id: income.id,
        name: income.title || "Income",
        category: income.category?.name || "Income",
        amount: income.amount,
        longitude: Number(income.transactionLocation?.longitude),
        latitude: Number(income.transactionLocation?.latitude),
        type: "income" as const,
        date: new Date(income.date).toLocaleDateString(),
      }));

    const expenseLocations = filteredExpenses
      .filter((expense) => expense.transactionLocation)
      .map((expense) => ({
        id: expense.id,
        name: expense.title || "Expense",
        category: expense.category?.name || "Expense",
        amount: expense.amount,
        longitude: Number(expense.transactionLocation?.longitude),
        latitude: Number(expense.transactionLocation?.latitude),
        type: "expense" as const,
        date: new Date(expense.date).toLocaleDateString(),
      }));

    return [...incomeLocations, ...expenseLocations].filter(
      (transaction) => Number.isFinite(transaction.latitude) && Number.isFinite(transaction.longitude)
    );
  }, [filteredIncomes, filteredExpenses]);

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
        <Map 
          center={userLocation ? [userLocation.longitude, userLocation.latitude] : defaultCenter} 
          zoom={minimalZoom}
        >
          <MapClusterLayer<TransactionLocationPoint>
            data={{
              type: "FeatureCollection",
              features: transactions.map((transaction) => ({
                type: "Feature",
                properties: transaction,
                geometry: {
                  type: "Point",
                  coordinates: [transaction.longitude, transaction.latitude],
                },
              })),
            }}
            clusterRadius={50}
            clusterMaxZoom={14}
            clusterColors={["#22c55e", "#eab308", "#ef4444"]}
            pointColor={pointColorExpression}
            onPointClick={(feature, coordinates) => {
              setSelectedPoint({
                coordinates,
                properties: feature.properties,
              });
            }}
          />

          {selectedPoint && (
            <MapPopup
              key={`${selectedPoint.coordinates[0]}-${selectedPoint.coordinates[1]}`}
              longitude={selectedPoint.coordinates[0]}
              latitude={selectedPoint.coordinates[1]}
              onClose={() => setSelectedPoint(null)}
              closeOnClick={true}
              focusAfterOpen={true}
              closeButton={false}
            >
              <div className="space-y-1 p-1 min-w-[200px]">
                <div className="font-semibold text-sm">{selectedPoint.properties.name}</div>
                <div className="text-xs text-gray-600">{selectedPoint.properties.category}</div>
                <div className="text-xs text-gray-500">{selectedPoint.properties.date}</div>
                <div className={`text-sm font-medium ${getAmountColor(selectedPoint.properties.type)}`}>
                  {formatAmount(
                    selectedPoint.properties.amount,
                    selectedPoint.properties.type,
                    currency
                  )}
                </div>
              </div>
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
        </Map>
      </div>

      {/* Legend */}
      <Legend />
    </div>
  );
}