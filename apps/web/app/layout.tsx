import "./globals.css";
import "@repo/ui/styles.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Providers } from "./providers";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import { GlobalModals } from "./components/GlobalModals";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My Money Manager",
  description: "Simple financial tracker - track your income and expenses",
  icons: {
    icon: {
      url: "/favicon.ico",
      type: "image/png",
      sizes: "any",
      media: "(prefers-color-scheme: light)",
    },
    apple: {
      url: "/favicon.ico",
      type: "image/png",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body 
        className={inter.className + " flex flex-col min-h-screen"}
        suppressHydrationWarning
      >
        <Providers>
          <NavBar />
            <GlobalModals />

          <div className="flex-grow p-10 pb-20">
            {children}
          </div>

          <Footer />
        </Providers>
      </body>
    </html>
  );
}