"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";

export const Providers = ({ children }: { children: React.ReactNode }) => {
    return (
        // wrapping all the pages with the providers

        <SessionProvider>{children}</SessionProvider>
    );
};
