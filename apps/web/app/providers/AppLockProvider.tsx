"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const APP_LOCK_EXPIRY_KEY = "app_lock_expires_at";
const APP_LOCK_DURATION_MS = 15 * 60 * 1000;
const APP_ENTRY_PASSWORD = process.env.NEXT_PUBLIC_APP_ENTRY_PASSWORD || "moneymanager";

interface AppLockContextValue {
    isInitialized: boolean;
    isUnlocked: boolean;
    remainingMs: number;
    unlock: (password: string) => boolean;
    lockNow: () => void;
}

const AppLockContext = createContext<AppLockContextValue | undefined>(undefined);

function getStoredExpiry(): number | null {
    if (typeof window === "undefined") return null;

    const rawExpiry = window.localStorage.getItem(APP_LOCK_EXPIRY_KEY);
    if (!rawExpiry) return null;

    const parsedExpiry = Number(rawExpiry);
    if (Number.isNaN(parsedExpiry) || parsedExpiry <= 0) return null;
    return parsedExpiry;
}

function clearStoredExpiry() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(APP_LOCK_EXPIRY_KEY);
}

function setStoredExpiry(expiryMs: number) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(APP_LOCK_EXPIRY_KEY, String(expiryMs));
}

function getRemainingMs(expiryMs: number): number {
    return Math.max(0, expiryMs - Date.now());
}

export function AppLockProvider({ children }: { children: React.ReactNode }) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [remainingMs, setRemainingMs] = useState(0);

    const lockNow = useCallback(() => {
        clearStoredExpiry();
        setIsUnlocked(false);
        setRemainingMs(0);
    }, []);

    const unlock = useCallback((password: string): boolean => {
        if (password !== APP_ENTRY_PASSWORD) return false;

        const newExpiry = Date.now() + APP_LOCK_DURATION_MS;
        setStoredExpiry(newExpiry);
        setIsUnlocked(true);
        setRemainingMs(APP_LOCK_DURATION_MS);
        return true;
    }, []);

    useEffect(() => {
        const expiryMs = getStoredExpiry();
        if (!expiryMs) {
            setIsInitialized(true);
            return;
        }

        const remaining = getRemainingMs(expiryMs);
        if (remaining <= 0) {
            clearStoredExpiry();
            setIsUnlocked(false);
            setRemainingMs(0);
            setIsInitialized(true);
            return;
        }

        setIsUnlocked(true);
        setRemainingMs(remaining);
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (!isUnlocked) return;

        const timer = window.setInterval(() => {
            const expiryMs = getStoredExpiry();
            if (!expiryMs) {
                setIsUnlocked(false);
                setRemainingMs(0);
                return;
            }

            const remaining = getRemainingMs(expiryMs);
            if (remaining <= 0) {
                clearStoredExpiry();
                setIsUnlocked(false);
                setRemainingMs(0);
                return;
            }

            setRemainingMs(remaining);
        }, 1000);

        return () => window.clearInterval(timer);
    }, [isUnlocked]);

    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key !== APP_LOCK_EXPIRY_KEY) return;

            const expiryMs = getStoredExpiry();
            if (!expiryMs) {
                setIsUnlocked(false);
                setRemainingMs(0);
                return;
            }

            const remaining = getRemainingMs(expiryMs);
            if (remaining <= 0) {
                clearStoredExpiry();
                setIsUnlocked(false);
                setRemainingMs(0);
                return;
            }

            setIsUnlocked(true);
            setRemainingMs(remaining);
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    const value = useMemo<AppLockContextValue>(() => ({
        isInitialized,
        isUnlocked,
        remainingMs,
        unlock,
        lockNow
    }), [isInitialized, isUnlocked, remainingMs, unlock, lockNow]);

    return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock() {
    const context = useContext(AppLockContext);
    if (!context) throw new Error("useAppLock must be used within AppLockProvider");
    return context;
}

export function formatLockCountdown(remainingMs: number): string {
    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
