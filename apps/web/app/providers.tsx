"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { CurrencyProvider } from "./providers/CurrencyProvider";
import { QueryProvider } from "./providers/QueryProvider";
import { ModalsProvider } from "./providers/ModalsProvider";

export const Providers = ({ children }: { children: React.ReactNode }) => {
    return (
        // wrapping all the pages with the providers
        <SessionProvider>
            <QueryProvider>
                <CurrencyProvider>
                    <ModalsProvider>
                        {children}
                    </ModalsProvider>
                </CurrencyProvider>
            </QueryProvider>
        </SessionProvider>
    );
};
