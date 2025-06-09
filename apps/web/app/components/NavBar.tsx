"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect, useMemo, memo } from "react";
import { CURRENCIES, getCurrencySymbol, formatCurrency } from "../utils/currency";
import { useCurrency } from "../providers/CurrencyProvider";
import { useTotalBalance } from "../hooks/useTotalBalance";

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
  console.log(session)
  
  
  
  return (
    <nav className="fixed top-0 left-0 right-0 w-full flex items-center justify-between px-6 py-4 bg-white shadow-md z-50">
      {/* Left side: User image if authenticated */}
    
      <div className="w-32 flex items-center">
        {status === "authenticated" && session?.user?.image && (
          <a href="/dashboard">
            <img
              src={session.user.image}
              alt={session.user.name || "User"}
              className="w-10 h-10 rounded-full object-cover border border-gray-300"
              referrerPolicy="no-referrer"
            />
          </a>
        )}
      </div>

      {/* Center: User name and Balance */}
      <div className="flex-1 flex justify-center">
        <div className="text-center">
          {userDisplaySection}
        </div>
      </div>

      {/* Currency Selector and Logout button */}
      <div className="flex items-center space-x-4">
        {status === "authenticated" && (
          <div className="relative currency-dropdown">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium text-gray-700 transition-colors h-10"
            >
              <span>{getCurrencySymbol(selectedCurrency)}</span>
              <span>{selectedCurrency}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto">
                <div className="py-1">
                  {CURRENCIES.map((currency) => (
                    <button
                      key={currency.code}
                      onClick={() => handleCurrencyChange(currency.code)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
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

        {status === "authenticated" ? (
          <button
            onClick={() => signOut({ callbackUrl: "/api/auth/signin" })}
            className="px-4 py-2.5 bg-gray-800 text-white hover:bg-gray-900 rounded-md text-sm font-medium h-10 flex items-center transition-colors"
          >
            Logout
          </button>
        ) : status === "unauthenticated" ? (
          <button
            className="px-4 py-2.5 bg-blue-600 text-white rounded hover:bg-blue-700 h-10 flex items-center"
            onClick={() => signIn()}
          >
            Sign In
          </button>
        ) : null}
      </div>
    </nav>
  );
} 