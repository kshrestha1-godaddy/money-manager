"use client";

import { FormEvent, useState } from "react";
import { useAppLock } from "../../providers/AppLockProvider";
import { getRandomUnlockDialogMessage, UnlockDialogMessage } from "../../config/unlock-dialog-messages";
import { useEffect } from "react";

export function AppLockOverlay() {
    const { isInitialized, isUnlocked, unlock } = useAppLock();
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [message, setMessage] = useState<UnlockDialogMessage>(getRandomUnlockDialogMessage());

    useEffect(() => {
        if (isUnlocked) return;

        setMessage(getRandomUnlockDialogMessage());
        setPassword("");
        setErrorMessage("");
    }, [isUnlocked]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const didUnlock = unlock(password.trim());
        if (!didUnlock) {
            setErrorMessage("Incorrect password. Please try again.");
            return;
        }

        setErrorMessage("");
        setPassword("");
    };

    if (!isInitialized) {
        return (
            <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-sm flex items-center justify-center">
                <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-lg">
                    <p className="text-sm font-medium text-gray-700">Checking app lock...</p>
                </div>
            </div>
        );
    }

    if (isUnlocked) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-xl flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900">{message.title}</h2>
                <p className="mt-2 text-sm text-gray-600">
                    {message.subtitle}
                </p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter password"
                        className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        autoFocus
                    />
                    {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
                    <button
                        type="submit"
                        className="w-full h-11 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        Unlock App
                    </button>
                </form>
            </div>
        </div>
    );
}
