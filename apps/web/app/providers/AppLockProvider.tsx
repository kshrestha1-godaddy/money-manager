"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { verifyCurrentUserAppLockPassword, getAppLockPasswordStatus } from "../actions/app-lock-password";

const APP_LOCK_EXPIRY_KEY = "app_lock_expires_at";
const APP_LOCK_DURATION_MS = 15 * 60 * 1000;
const APP_ENTRY_PASSWORD = "mymoneylog";

interface AppLockContextValue {
    isInitialized: boolean;
    isUnlocked: boolean;
    remainingMs: number;
    unlock: (password: string) => Promise<boolean>;
    lockNow: () => void;
    isUsingDefaultPassword: boolean;
    shouldPromptPasswordChange: boolean;
    dismissDefaultPasswordPrompt: () => void;
    markPasswordAsUpdated: () => void;
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
    const { status: sessionStatus } = useSession();
    const [isInitialized, setIsInitialized] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [remainingMs, setRemainingMs] = useState(0);
    const [isUsingDefaultPassword, setIsUsingDefaultPassword] = useState(false);
    const [hasDismissedDefaultPasswordPrompt, setHasDismissedDefaultPasswordPrompt] = useState(false);

    const lockNow = useCallback(() => {
        clearStoredExpiry();
        setIsUnlocked(false);
        setRemainingMs(0);
    }, []);

    const unlock = useCallback(async (password: string): Promise<boolean> => {
        const inputPassword = password.trim();
        if (!inputPassword) return false;

        let isPasswordValid = false;

        if (sessionStatus === "unauthenticated") {
            isPasswordValid = inputPassword === APP_ENTRY_PASSWORD;
        } else {
            try {
                isPasswordValid = await verifyCurrentUserAppLockPassword(inputPassword);
            } catch {
                if (sessionStatus === "loading") {
                    isPasswordValid = inputPassword === APP_ENTRY_PASSWORD;
                }
            }
        }

        if (!isPasswordValid) return false;

        const newExpiry = Date.now() + APP_LOCK_DURATION_MS;
        setStoredExpiry(newExpiry);
        setIsUnlocked(true);
        setRemainingMs(APP_LOCK_DURATION_MS);
        return true;
    }, [sessionStatus]);

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
        if (sessionStatus !== "authenticated") {
            setIsUsingDefaultPassword(false);
            setHasDismissedDefaultPasswordPrompt(false);
            return;
        }

        let isMounted = true;

        async function loadPasswordStatus() {
            try {
                const status = await getAppLockPasswordStatus();
                if (!isMounted) return;
                setIsUsingDefaultPassword(status.usesDefaultPassword);
            } catch {
                if (!isMounted) return;
                setIsUsingDefaultPassword(false);
            }
        }

        loadPasswordStatus();

        return () => {
            isMounted = false;
        };
    }, [sessionStatus]);

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

    const dismissDefaultPasswordPrompt = useCallback(() => {
        setHasDismissedDefaultPasswordPrompt(true);
    }, []);

    const markPasswordAsUpdated = useCallback(() => {
        setIsUsingDefaultPassword(false);
        setHasDismissedDefaultPasswordPrompt(false);
    }, []);

    const shouldPromptPasswordChange = isUnlocked && isUsingDefaultPassword && !hasDismissedDefaultPasswordPrompt;

    const value = useMemo<AppLockContextValue>(() => ({
        isInitialized,
        isUnlocked,
        remainingMs,
        unlock,
        lockNow,
        isUsingDefaultPassword,
        shouldPromptPasswordChange,
        dismissDefaultPasswordPrompt,
        markPasswordAsUpdated
    }), [
        isInitialized,
        isUnlocked,
        remainingMs,
        unlock,
        lockNow,
        isUsingDefaultPassword,
        shouldPromptPasswordChange,
        dismissDefaultPasswordPrompt,
        markPasswordAsUpdated
    ]);

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
