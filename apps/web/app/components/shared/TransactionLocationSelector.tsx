"use client";

import { useEffect, useMemo } from "react";
import { labelClasses } from "../../utils/formUtils";
import { LocationMapSelector } from "./LocationMapSelector";
import { DEFAULT_LOCATION } from "../../utils/locationDefaults";

interface TransactionLocation {
    id: number;
    latitude: number;
    longitude: number;
    userId?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface TransactionLocationSelectorProps {
    value?: TransactionLocation | null;
    onChange: (location: TransactionLocation | null) => void;
    disabled?: boolean;
}


export function TransactionLocationSelector({ 
    value, 
    onChange, 
    disabled = false
}: TransactionLocationSelectorProps) {
    const defaultLocation = useMemo<TransactionLocation>(() => ({
        id: -1,
        latitude: DEFAULT_LOCATION.latitude,
        longitude: DEFAULT_LOCATION.longitude
    }), []);

    const currentLocation = value ?? defaultLocation;

    // Initialize with default location if no value is provided
    useEffect(() => {
        if (!value) onChange(defaultLocation);
    }, [value, onChange, defaultLocation]);



    const handleMapLocationSelect = (lat: number, lng: number) => {
        // Create a simple location object with just coordinates
        const locationData: TransactionLocation = {
            id: -1, // Temporary ID for new locations
            latitude: lat,
            longitude: lng
        };
        
        onChange(locationData);
    };



    return (
        <div>
            <label className={labelClasses}>Transaction Location</label>
            
            {/* Map Section - Only the map selector */}
            <div className="mb-4">
                <div className="h-[300px] w-full border border-gray-300 rounded-lg overflow-hidden">
                    <LocationMapSelector
                        isOpen={true}
                        latitude={currentLocation.latitude}
                        longitude={currentLocation.longitude}
                        onLocationSelect={handleMapLocationSelect}
                        onClose={() => {}} // Empty function since map is always visible
                        embedded={true} // New prop to indicate embedded mode
                    />
                </div>
            </div>

            {/* GPS Coordinates Display */}
            {currentLocation.latitude && currentLocation.longitude && (
                <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-xs text-green-700">
                        📍 Location set: {Number(currentLocation.latitude).toFixed(6)}, {Number(currentLocation.longitude).toFixed(6)}
                    </p>
                </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
                Click anywhere on the map or drag the marker to set the transaction location.
            </p>
        </div>
    );
}