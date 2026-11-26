"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { CurrencyProvider } from "./providers/CurrencyProvider";
import { DisplayCurrencyProvider } from "./hooks/useDisplayCurrency";
import { TimezoneProvider } from "./providers/TimezoneProvider";
import { QueryProvider } from "./providers/QueryProvider";
import { ModalsProvider } from "./providers/ModalsProvider";
import { NotificationProvider } from "./components/notification/NotificationProvider";
import { TutorialProvider } from "./providers/TutorialProvider";
import { WelcomeBackProvider } from "./providers/WelcomeBackProvider";
import { AppLockProvider } from "./providers/AppLockProvider";
import { AppLockOverlay } from "./components/security/AppLockOverlay";
import { AppLockGuardProvider } from "@repo/applock";
import { verifyCurrentUserAppLockPassword } from "./actions/app-lock-password";

export const Providers = ({ children }: { children: React.ReactNode }) => {
    return (
        // wrapping all the pages with the providers
        <SessionProvider>
            <AppLockProvider>
              <AppLockGuardProvider verifyPassword={verifyCurrentUserAppLockPassword}>
                <WelcomeBackProvider>
                    <NotificationProvider>
                        <QueryProvider>
                            <CurrencyProvider>
                                <DisplayCurrencyProvider>
                                <TimezoneProvider>
                                    <ModalsProvider>
                                        <TutorialProvider>
                                            {children}
                                            <AppLockOverlay />
                                        </TutorialProvider>
                                    </ModalsProvider>
                                </TimezoneProvider>
                                </DisplayCurrencyProvider>
                            </CurrencyProvider>
                        </QueryProvider>
                    </NotificationProvider>
                </WelcomeBackProvider>
              </AppLockGuardProvider>
            </AppLockProvider>
        </SessionProvider>
    );
};
