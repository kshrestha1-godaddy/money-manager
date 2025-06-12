"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { CurrencyProvider } from "./providers/CurrencyProvider";
import { QueryProvider } from "./providers/QueryProvider";

export const Providers = ({ children }: { children: React.ReactNode }) => {
    return (
        // wrapping all the pages with the providers
        <SessionProvider>
            <QueryProvider>
                <CurrencyProvider>
                    {children}
                </CurrencyProvider>
            </QueryProvider>
        </SessionProvider>
    );
};
