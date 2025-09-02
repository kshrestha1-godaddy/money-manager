"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { CurrencyProvider } from "./providers/CurrencyProvider";
import { TimezoneProvider } from "./providers/TimezoneProvider";
import { QueryProvider } from "./providers/QueryProvider";
import { ModalsProvider } from "./providers/ModalsProvider";
import { NotificationProvider } from "./components/notification/NotificationProvider";
import { TutorialProvider } from "./providers/TutorialProvider";
import { WelcomeBackProvider } from "./providers/WelcomeBackProvider";

export const Providers = ({ children }: { children: React.ReactNode }) => {
    return (
        // wrapping all the pages with the providers
        <SessionProvider>
            <WelcomeBackProvider>
                <NotificationProvider>
                    <QueryProvider>
                        <CurrencyProvider>
                            <TimezoneProvider>
                                <ModalsProvider>
                                    <TutorialProvider>
                                        {children}
                                    </TutorialProvider>
                                </ModalsProvider>
                            </TimezoneProvider>
                        </CurrencyProvider>
                    </QueryProvider>
                </NotificationProvider>
            </WelcomeBackProvider>
        </SessionProvider>
    );
};
