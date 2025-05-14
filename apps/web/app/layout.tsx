import "./globals.css";
import "@repo/ui/styles.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Providers } from "./providers";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Financial Tracker",
  description: "Simple financial tracker - track your income and expenses",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <Providers>
        <body className={inter.className + " flex flex-col min-h-screen"}>


          <NavBar />


          <div className="m-3 flex-grow">
            {children}
          </div>


          <Footer />


          
        </body>
      </Providers>
    </html>
  );
}