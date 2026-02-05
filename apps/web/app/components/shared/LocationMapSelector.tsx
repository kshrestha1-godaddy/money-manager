"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Map, MapMarker, MarkerContent, MarkerPopup, useMap } from "@/components/ui/map";
import { MapPin, X } from "lucide-react";
import { DEFAULT_LOCATION } from "../../utils/locationDefaults";

interface LocationMapSelectorProps {
    latitude?: number;
    longitude?: number;
    onLocationSelect: (lat: number, lng: number) => void;
    onClose: () => void;
    isOpen: boolean;
    embedded?: boolean; // New prop for embedded mode
}

export function LocationMapSelector({ 
    latitude, 
    longitude, 
    onLocationSelect, 
    onClose, 
    isOpen,
    embedded = false 
}: LocationMapSelectorProps) {
    const initialLocation = useMemo(() => ({
        lat: latitude ?? DEFAULT_LOCATION.latitude,
        lng: longitude ?? DEFAULT_LOCATION.longitude
    }), [latitude, longitude]);

    const [selectedLocation, setSelectedLocation] = useState(initialLocation);

    const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

    // Get user's current location on component mount
    useEffect(() => {
        if (!isOpen || !navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                setUserLocation({ lat: userLat, lng: userLng });

                if (latitude === undefined || longitude === undefined) {
                    setSelectedLocation({ lat: userLat, lng: userLng });
                }
            },
            (error) => {
                console.log('Geolocation error:', error);
            }
        );
    }, [isOpen, latitude, longitude]);

    // Update selected location when props change
    useEffect(() => {
        if (latitude === undefined || longitude === undefined) return;
        setSelectedLocation({ lat: latitude, lng: longitude });
    }, [latitude, longitude]);

    // Map click handler component
    function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
        const { map } = useMap();

        useEffect(() => {
            if (!map) return;

            const handleClick = (e: any) => {
                if (e.lngLat) {
                    onMapClick(e.lngLat.lat, e.lngLat.lng);
                }
            };

            map.on('click', handleClick);

            return () => {
                map.off('click', handleClick);
            };
        }, [map, onMapClick]);

        return null;
    }

    const updateSelectedLocation = useCallback((lat: number, lng: number) => {
        setSelectedLocation({ lat, lng });
        if (embedded) onLocationSelect(lat, lng);
    }, [embedded, onLocationSelect]);

    const handleMapClick = useCallback((lat: number, lng: number) => {
        updateSelectedLocation(lat, lng);
    }, [updateSelectedLocation]);

    const handleMarkerDragEnd = useCallback((lngLat: { lng: number; lat: number }) => {
        updateSelectedLocation(lngLat.lat, lngLat.lng);
    }, [updateSelectedLocation]);

    const handleSelectLocation = () => {
        onLocationSelect(selectedLocation.lat, selectedLocation.lng);
        if (!embedded) onClose();
    };

    const handleUseCurrentLocation = () => {
        if (userLocation) {
            setSelectedLocation(userLocation);
        }
    };

    if (!isOpen) return null;

    const mapCenter = [selectedLocation.lng, selectedLocation.lat] as [number, number];

    const mapMarkers = (
        <>
            <MapClickHandler onMapClick={handleMapClick} />
            <MapMarker
                draggable
                longitude={selectedLocation.lng}
                latitude={selectedLocation.lat}
                onDragEnd={handleMarkerDragEnd}
            >
                <MarkerContent>
                    <div className="cursor-move">
                        <MapPin
                            className="fill-red-500 stroke-white"
                            size={32}
                        />
                    </div>
                </MarkerContent>
                <MarkerPopup>
                    <div className="space-y-1">
                        <p className="font-medium text-foreground">Selected Location</p>
                        <p className="text-xs text-muted-foreground">
                            {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                        </p>
                        <p className="text-xs text-blue-600">
                            Click anywhere on the map or drag this marker
                        </p>
                    </div>
                </MarkerPopup>
            </MapMarker>

            {userLocation && (
                <MapMarker
                    longitude={userLocation.lng}
                    latitude={userLocation.lat}
                >
                    <MarkerContent>
                        <div className="relative">
                            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
                            <div className="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                        </div>
                    </MarkerContent>
                    <MarkerPopup>
                        <div className="space-y-1">
                            <p className="font-medium text-foreground">Your Location</p>
                            <p className="text-xs text-muted-foreground">
                                {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                            </p>
                        </div>
                    </MarkerPopup>
                </MapMarker>
            )}
        </>
    );

    if (embedded) {
        return (
            <div className="h-full w-full">
                <Map 
                    key={`${selectedLocation.lat}-${selectedLocation.lng}`}
                    center={mapCenter} 
                    zoom={10}
                >
                    {mapMarkers}
                </Map>
            </div>
        );
    }

    // Modal mode - render with overlay and controls
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Select Location</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                        aria-label="Close map"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Map Container */}
                <div className="h-[500px] w-full">
                    <Map 
                        key={`${selectedLocation.lat}-${selectedLocation.lng}`}
                        center={mapCenter} 
                        zoom={15}
                    >
                        {mapMarkers}
                    </Map>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            <p>Selected: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Click anywhere on the map or drag the red marker to select a location
                            </p>
                        </div>
                        <div className="flex space-x-3">
                            {userLocation && (
                                <button
                                    type="button"
                                    onClick={handleUseCurrentLocation}
                                    className="px-4 py-2 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md transition-colors"
                                >
                                    Use My Location
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm bg-gray-300 text-gray-700 hover:bg-gray-400 rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSelectLocation}
                                className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                            >
                                Select This Location
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}