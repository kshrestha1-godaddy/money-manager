"use client";

import { useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { getUserIdFromSession } from "../utils/auth";
import { generateNotificationsForUser } from "../actions/notifications";

interface UseNotificationCheckerOptions {
    enabled?: boolean;
    interval?: number; // in milliseconds
    onError?: (error: Error) => void;
}

/**
 * Custom hook that provides reactive notification checking
 * This hook runs periodic checks for new notifications based on current financial data
 */
export function useNotificationChecker({
    enabled = true,
    interval = 1 * 60 * 1000, // 1 minute default
    onError
}: UseNotificationCheckerOptions = {}) {
    const { data: session } = useSession();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isRunningRef = useRef(false);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    const clearCheckerInterval = useCallback(() => {
        if (!intervalRef.current) return;

        clearInterval(intervalRef.current);
        intervalRef.current = null;
    }, []);

    const getUserId = useCallback(() => {
        if (!session?.user) return null;
        return getUserIdFromSession((session.user as any).id);
    }, [session?.user]);

    const checkNotifications = useCallback(async () => {
        if (isRunningRef.current) return;

        const userId = getUserId();
        if (!userId) return;

        try {
            isRunningRef.current = true;
            await generateNotificationsForUser(userId);
        } catch (error) {
            console.error("Failed to check notifications:", error);
            onErrorRef.current?.(error as Error);
        } finally {
            isRunningRef.current = false;
        }
    }, [getUserId]);

    // Start/stop the notification checker
    useEffect(() => {
        if (!enabled || !session?.user) {
            clearCheckerInterval();
            return;
        }

        // Run an initial check
        void checkNotifications();

        // Set up periodic checks
        intervalRef.current = setInterval(checkNotifications, interval);

        return clearCheckerInterval;
    }, [enabled, session?.user, interval, checkNotifications, clearCheckerInterval]);

    // Manual trigger function
    const triggerCheck = useCallback(() => {
        if (!enabled || !session?.user) return;
        void checkNotifications();
    }, [enabled, session?.user, checkNotifications]);

    return {
        triggerCheck,
        isRunning: isRunningRef.current
    };
} 