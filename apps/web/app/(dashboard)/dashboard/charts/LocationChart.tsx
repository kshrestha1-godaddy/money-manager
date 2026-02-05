"use client";

import { useState, useCallback } from "react";
import { Map, MapControls, MapMarker, MarkerContent, MarkerTooltip } from "@/components/ui/map";

interface LocationChartProps {
  currency: string;
  heightClass?: string;
}

// Mock transaction locations for demonstration
// In a real app, this would come from your transaction data with geocoded locations
const mockTransactionLocations = [
  {
    id: 1,
    name: "Starbucks Coffee",
    category: "Food & Dining",
    amount: 4.50,
    longitude: -74.006,
    latitude: 40.7128,
    type: "expense" as const,
    date: "2024-01-15",
  },
  {
    id: 2,
    name: "Bank - Salary Deposit",
    category: "Salary",
    amount: 5000,
    longitude: -74.0059,
    latitude: 40.7140,
    type: "income" as const,
    date: "2024-01-01",
  },
  {
    id: 3,
    name: "Whole Foods Market",
    category: "Groceries",
    amount: 85.30,
    longitude: -74.0070,
    latitude: 40.7110,
    type: "expense" as const,
    date: "2024-01-12",
  },
  {
    id: 4,
    name: "Shell Gas Station",
    category: "Transportation",
    amount: 45.00,
    longitude: -74.0080,
    latitude: 40.7150,
    type: "expense" as const,
    date: "2024-01-10",
  },
  {
    id: 5,
    name: "Amazon Refund",
    category: "Shopping",
    amount: 29.99,
    longitude: -74.0055,
    latitude: 40.7135,
    type: "income" as const,
    date: "2024-01-08",
  },
  {
    id: 6,
    name: "McDonald's",
    category: "Food & Dining",
    amount: 12.45,
    longitude: -74.0045,
    latitude: 40.7125,
    type: "expense" as const,
    date: "2024-01-14",
  },
];

export function LocationChart({ currency, heightClass = "h-[400px]" }: LocationChartProps) {
  const [userLocation, setUserLocation] = useState<{ longitude: number; latitude: number } | null>(null);
  
  // Default to New York City coordinates
  const defaultCenter: [number, number] = [-74.006, 40.7128];
  const defaultZoom = 13;

  const handleLocate = useCallback((coords: { longitude: number; latitude: number }) => {
    setUserLocation(coords);
  }, []);

  const formatAmount = (amount: number, type: "income" | "expense") => {
    const sign = type === "income" ? "+" : "-";
    return `${sign}${amount.toLocaleString()} ${currency}`;
  };

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
          zoom={defaultZoom}
        >
          {/* Transaction markers */}
          {mockTransactionLocations.map((transaction) => (
            <MapMarker
              key={transaction.id}
              longitude={transaction.longitude}
              latitude={transaction.latitude}
            >
              <MarkerContent>
                <div 
                  className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${
                    transaction.type === "income" 
                      ? "bg-green-500" 
                      : "bg-red-500"
                  }`}
                />
              </MarkerContent>
              <MarkerTooltip>
                <div className="p-2 min-w-[200px]">
                  <div className="font-semibold text-sm">{transaction.name}</div>
                  <div className="text-xs text-gray-600 mb-1">{transaction.category}</div>
                  <div className="text-xs text-gray-500 mb-2">{transaction.date}</div>
                  <div className={`text-sm font-medium ${
                    transaction.type === "income" ? "text-green-600" : "text-red-600"
                  }`}>
                    {formatAmount(transaction.amount, transaction.type)}
                  </div>
                </div>
              </MarkerTooltip>
            </MapMarker>
          ))}

          {/* User location marker */}
          {userLocation && (
            <MapMarker
              longitude={userLocation.longitude}
              latitude={userLocation.latitude}
            >
              <MarkerContent>
                <div className="relative">
                  <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg animate-pulse" />
                  <div className="absolute inset-0 w-4 h-4 rounded-full bg-blue-500 opacity-25 animate-ping" />
                </div>
              </MarkerContent>
              <MarkerTooltip>
                <div className="p-2">
                  <div className="font-semibold text-sm">Your Location</div>
                </div>
              </MarkerTooltip>
            </MapMarker>
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
      <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm" />
          <span className="text-gray-600">Income</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500 border border-white shadow-sm" />
          <span className="text-gray-600">Expense</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 border border-white shadow-sm animate-pulse" />
          <span className="text-gray-600">Your Location</span>
        </div>
      </div>
    </div>
  );
}