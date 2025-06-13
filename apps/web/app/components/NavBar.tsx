"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect, useMemo, memo } from "react";
import { CURRENCIES, getCurrencySymbol, formatCurrency } from "../utils/currency";
import { useCurrency } from "../providers/CurrencyProvider";
import { useTotalBalance } from "../hooks/useTotalBalance";
import Link from "next/link";

// Memoized balance display component
const BalanceDisplay = memo(({ totalBalance, selectedCurrency }: { totalBalance: number; selectedCurrency: string }) => (
  <span className="text-green-600 font-semibold text-sm">
    Balance: {formatCurrency(totalBalance, selectedCurrency)}
  </span>
));

BalanceDisplay.displayName = 'BalanceDisplay';

export default function NavBar() {
  const { data: session, status } = useSession();
  const { currency: selectedCurrency, updateCurrency } = useCurrency();
  const { totalBalance, loading: balanceLoading } = useTotalBalance();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Memoize the user display section
  const userDisplaySection = useMemo(() => {
    if (status === "authenticated" && session?.user?.name) {
      return (
        <div>
          <span className="text-gray-700 font-bold text-lg block">
            {session.user.name}
          </span>
          {!balanceLoading && (
            <BalanceDisplay totalBalance={totalBalance} selectedCurrency={selectedCurrency} />
          )}
        </div>
      );
    }
    return null;
  }, [status, session?.user?.name, balanceLoading, totalBalance, selectedCurrency]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.currency-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Handle currency change
  const handleCurrencyChange = async (currencyCode: string) => {
    try {
      await updateCurrency(currencyCode);
      setIsDropdownOpen(false);
    } catch (error) {
      console.error("Error updating currency:", error);
      alert("Failed to update currency. Please try again.");
    }
  };

  // Wait until session is loaded to render anything session-dependent
  if (status === "loading") {
    return null; // or a loading skeleton
  }
  
  return (
    <nav className="fixed top-0 left-0 right-0 w-full flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100 z-50">
      {/* Left side: Logo/Brand */}
      <div className="flex items-center space-x-4">
        <Link href={status === "authenticated" ? "/dashboard" : "/"} className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900">MoneyManager</span>
        </Link>
      </div>

      {/* Center: User name and Balance */}
      <div className="flex-1 flex justify-center">
        <div className="text-center">
          {userDisplaySection}
        </div>
      </div>

      {/* Right side: Navigation items */}
      <div className="flex items-center space-x-4">
        {/* Navigation links for unauthenticated users */}
        {status === "unauthenticated" && (
          <div className="hidden md:flex items-center space-x-6 mr-6">
            <Link href="/" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
              Home
            </Link>
            <Link href="#features" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
              Features
            </Link>
            <Link href="#about" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
              About
            </Link>
          </div>
        )}

        {/* Currency Selector */}
        {status === "authenticated" && (
          <div className="relative currency-dropdown">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 transition-colors h-10 border border-gray-200"
            >
              <span>{getCurrencySymbol(selectedCurrency)}</span>
              <span>{selectedCurrency}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto">
                <div className="py-1">
                  {CURRENCIES.map((currency) => (
                    <button
                      key={currency.code}
                      onClick={() => handleCurrencyChange(currency.code)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between transition-colors ${
                        selectedCurrency === currency.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      <span className="flex items-center space-x-2">
                        <span className="font-medium">{currency.symbol}</span>
                        <span>{currency.code}</span>
                      </span>
                      <span className="text-xs text-gray-500">{currency.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Auth buttons */}
        {status === "authenticated" ? (
          <>
            <button
              onClick={() => signOut({ callbackUrl: "/signin" })}
              className="px-4 py-2.5 bg-gray-800 text-white hover:bg-gray-900 rounded-lg text-sm font-medium h-10 flex items-center transition-colors"
            >
              Logout
            </button>
            
            {/* User image if authenticated */}
            {session?.user?.image && (
              <div className="ml-2">
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 hover:border-blue-300 transition-colors"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </>
        ) : status === "unauthenticated" ? (
          <Link
            href="/signin"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 h-10 flex items-center font-medium transition-colors shadow-sm"
          >
            Sign In
          </Link>
        ) : null}
      </div>
    </nav>
  );
} 