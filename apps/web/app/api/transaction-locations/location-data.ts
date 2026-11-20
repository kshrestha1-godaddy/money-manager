import { readJsonObject } from "../../lib/api-json";

function parseCoordinate(value: unknown, limit: number): number | null {
    if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) {
        return null;
    }

    const coordinate = Number(value);
    return Number.isFinite(coordinate) && Math.abs(coordinate) <= limit ? coordinate : null;
}

export async function readCoordinates(request: Request) {
    const body = await readJsonObject(request);
    const latitude = parseCoordinate(body?.latitude, 90);
    const longitude = parseCoordinate(body?.longitude, 180);
    return latitude === null || longitude === null ? null : { latitude, longitude };
}

export function serializeLocation<T extends { latitude: unknown; longitude: unknown }>(location: T) {
    return {
        ...location,
        latitude: Number(location.latitude),
        longitude: Number(location.longitude)
    };
}
