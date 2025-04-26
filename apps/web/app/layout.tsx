import "./globals.css";
import "@repo/ui/styles.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Providers } from "./components/providers";
import { Appbar } from "./components/Appbar";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wallet",
  description: "Simple wallet app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <Providers>
        <body className={inter.className}>
          <div className="min-w-screen min-h-screen">
            <div className="m-3">
              <Appbar />
              {children}
            </div>
          </div>
        </body>
      </Providers>
    </html>
  );
}