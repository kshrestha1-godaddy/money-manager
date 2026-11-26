"use server";

import prisma from "@repo/db/client";
import { getAuthenticatedSession, getUserIdFromSession, decimalToNumber } from "../utils/auth";
import { requireAppLockPassword } from "../lib/security/require-app-lock-password";

export interface SavedLocationData {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface CreateSavedLocationInput {
    name: string;
    latitude: number;
    longitude: number;
}

export async function getSavedLocations(): Promise<SavedLocationData[]> {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    const locations = await prisma.savedLocation.findMany({
        where: { userId },
        orderBy: { name: "asc" }
    });

    return locations.map(location => ({
        id: location.id,
        name: location.name,
        latitude: decimalToNumber(location.latitude, "latitude"),
        longitude: decimalToNumber(location.longitude, "longitude"),
        createdAt: location.createdAt,
        updatedAt: location.updatedAt
    }));
}

export async function createSavedLocation(input: CreateSavedLocationInput): Promise<SavedLocationData> {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    const name = input.name.trim();
    if (!name) {
        throw new Error("Location name is required");
    }

    if (Number.isNaN(input.latitude) || Number.isNaN(input.longitude)) {
        throw new Error("Valid latitude and longitude are required");
    }

    const created = await prisma.savedLocation.create({
        data: {
            name,
            latitude: input.latitude,
            longitude: input.longitude,
            userId
        }
    });

    return {
        id: created.id,
        name: created.name,
        latitude: decimalToNumber(created.latitude, "latitude"),
        longitude: decimalToNumber(created.longitude, "longitude"),
        createdAt: created.createdAt,
        updatedAt: created.updatedAt
    };
}

export async function deleteSavedLocation(id: number, appLockPassword: string): Promise<void> {
    const userId = await requireAppLockPassword(appLockPassword);

    await prisma.savedLocation.delete({
        where: { id, userId }
    });
}
