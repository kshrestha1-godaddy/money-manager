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
    interval = 1 * 60 * 1000, // 5 minutes default
    onError
}: UseNotificationCheckerOptions = {}) {
    const { data: session } = useSession();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isRunningRef = useRef(false);

    const checkNotifications = useCallback(async () => {
        if (!session?.user || isRunningRef.current) {
            return;
        }

        try {
            isRunningRef.current = true;
            // Use type assertion to access id property
            const userId = getUserIdFromSession((session.user as any).id);
            await generateNotificationsForUser(userId);
        } catch (error) {
            console.error("Failed to check notifications:", error);
            onError?.(error as Error);
        } finally {
            isRunningRef.current = false;
        }
    }, [session?.user, onError]);

    // Start/stop the notification checker
    useEffect(() => {
        if (!enabled || !session?.user) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Run an initial check
        checkNotifications();

        // Set up periodic checks
        intervalRef.current = setInterval(checkNotifications, interval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [enabled, session?.user, interval, checkNotifications]);

    // Manual trigger function
    const triggerCheck = useCallback(() => {
        if (enabled && session?.user) {
            checkNotifications();
        }
    }, [enabled, session?.user, checkNotifications]);

    return {
        triggerCheck,
        isRunning: isRunningRef.current
    };
} 