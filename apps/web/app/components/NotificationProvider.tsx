"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useNotificationChecker } from "../hooks/useNotificationChecker";
import { getUnreadNotificationCount } from "../actions/notifications";

interface NotificationContextValue {
    unreadCount: number;
    refreshUnreadCount: () => Promise<void>;
    triggerNotificationCheck: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotificationContext() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotificationContext must be used within NotificationProvider");
    }
    return context;
}

interface NotificationProviderProps {
    children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
    const { data: session } = useSession();
    const [unreadCount, setUnreadCount] = useState(0);
    
    // Set up periodic notification checking
    const { triggerCheck } = useNotificationChecker({
        enabled: !!session?.user,
        interval: 5 * 60 * 1000, // 5 minutes
        onError: (error) => {
            console.error("Notification check error:", error);
        }
    });

    // Function to refresh unread count
    const refreshUnreadCount = async () => {
        if (!session?.user) {
            setUnreadCount(0);
            return;
        }

        try {
            const count = await getUnreadNotificationCount();
            setUnreadCount(count);
        } catch (error) {
            console.error("Failed to fetch unread count:", error);
        }
    };

    // Initial load and refresh when session changes
    useEffect(() => {
        refreshUnreadCount();
    }, [session?.user]);

    // Refresh unread count periodically
    useEffect(() => {
        if (!session?.user) return;

        const interval = setInterval(refreshUnreadCount, 30 * 1000); // 30 seconds
        return () => clearInterval(interval);
    }, [session?.user]);

    const contextValue: NotificationContextValue = {
        unreadCount,
        refreshUnreadCount,
        triggerNotificationCheck: triggerCheck
    };

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
        </NotificationContext.Provider>
    );
} 