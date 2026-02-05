"use client";

import { useCallback, useMemo, useState } from "react";
import { Map, MapControls, MapMarker, MarkerContent, MarkerTooltip } from "@/components/ui/map";
import { useChartData } from "../../../hooks/useChartDataContext";
import { DEFAULT_LOCATION } from "../../../utils/locationDefaults";

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

function getMarkerColor(type: "income" | "expense") {
  return type === "income" ? "bg-green-500" : "bg-red-500";
}

function getAmountColor(type: "income" | "expense") {
  return type === "income" ? "text-green-600" : "text-red-600";
}

function getTooltipAnchor(index: number) {
  const anchors = [
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right"
  ] as const;
  return anchors[index % anchors.length];
}

function getTooltipOffset(index: number) {
  return 16 + (index % 3) * 6;
}

function TransactionMarker({
  transaction,
  currency,
  index,
}: {
  transaction: TransactionLocationPoint;
  currency: string;
  index: number;
}) {
  const markerColor = getMarkerColor(transaction.type);
  const amountColor = getAmountColor(transaction.type);
  const tooltipAnchor = getTooltipAnchor(index);
  const tooltipOffset = getTooltipOffset(index);

  return (
    <MapMarker
      key={transaction.id}
      longitude={transaction.longitude}
      latitude={transaction.latitude}
    >
      <MarkerContent>
        <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${markerColor}`} />
      </MarkerContent>
      <MarkerTooltip anchor={tooltipAnchor} offset={tooltipOffset}>
        <div className="p-2 min-w-[200px]">
          <div className="font-semibold text-sm">{transaction.name}</div>
          <div className="text-xs text-gray-600 mb-1">{transaction.category}</div>
          <div className="text-xs text-gray-500 mb-2">{transaction.date}</div>
          <div className={`text-sm font-medium ${amountColor}`}>
            {formatAmount(transaction.amount, transaction.type, currency)}
          </div>
        </div>
      </MarkerTooltip>
    </MapMarker>
  );
}

function getLocationKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
}

function spreadOverlappingLocations(points: TransactionLocationPoint[]) {
  const groups = new globalThis.Map<string, TransactionLocationPoint[]>();

  points.forEach((point) => {
    const key = getLocationKey(point.latitude, point.longitude);
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  });

  return Array.from(groups.values()).flatMap((group: TransactionLocationPoint[]) => {
    if (group.length === 1) return group;

    const radius = 0.00035;
    const step = (Math.PI * 2) / group.length;

    return group.map((point: TransactionLocationPoint, index: number) => {
      const angle = step * index;
      return {
        ...point,
        latitude: point.latitude + Math.sin(angle) * radius,
        longitude: point.longitude + Math.cos(angle) * radius
      };
    });
  });
}

function UserLocationMarker({ location }: { location: { longitude: number; latitude: number } }) {
  return (
    <MapMarker longitude={location.longitude} latitude={location.latitude}>
      <MarkerContent>
        <div className="relative">
          <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg animate-pulse" />
          <div className="absolute inset-0 w-4 h-4 rounded-full bg-blue-500 opacity-25 animate-ping" />
        </div>
      </MarkerContent>
    </MapMarker>
  );
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
  const { filteredIncomes, filteredExpenses } = useChartData();

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

  const displayTransactions = useMemo(
    () => spreadOverlappingLocations(transactions),
    [transactions]
  );

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
          {/* Transaction markers */}
          {displayTransactions.map((transaction, index) => (
            <TransactionMarker
              key={transaction.id}
              transaction={transaction}
              currency={currency}
              index={index}
            />
          ))}

          {/* User location marker */}
          {userLocation && <UserLocationMarker location={userLocation} />}

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