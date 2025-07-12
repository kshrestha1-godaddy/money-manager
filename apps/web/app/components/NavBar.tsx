"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { CURRENCIES, getCurrencySymbol, formatCurrency } from "../utils/currency";
import { useCurrency } from "../providers/CurrencyProvider";
import { useTotalBalance } from "../hooks/useTotalBalance";
import { useModals } from "../providers/ModalsProvider";
import Link from "next/link";

export default function NavBar() {
  const { data: session, status } = useSession();
  const { currency: selectedCurrency, updateCurrency } = useCurrency();
  const { totalBalance, loading: balanceLoading } = useTotalBalance();
  const { openExpenseModal, openIncomeModal } = useModals();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.currency-dropdown') && !target.closest('.mobile-menu')) {
        setIsDropdownOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    if (isDropdownOpen || isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isDropdownOpen, isMobileMenuOpen]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

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
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 w-full bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100/50 z-50">
      {/* Main navbar content */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 w-full">
        {/* Left side: Home button and Date/Time */}
        <div className="flex items-center flex-shrink-0 space-x-3">
          {/* Mobile menu toggle button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Toggle mobile menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Home Button */}
          {status === "authenticated" && (
            <Link 
              href="/dashboard" 
              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full flex items-center justify-center transition-all duration-200 border border-blue-100 shadow-sm hover:shadow-md"
              aria-label="Go to Dashboard"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Link>
          )}
          
          {/* Date and Time */}
          <div className="hidden sm:block text-sm text-gray-600">
            <span className="font-medium">{formatDate(currentDateTime)}</span>
            <span className="mx-1.5 text-gray-400">•</span>
            <span className="font-mono">{formatTime(currentDateTime)}</span>
          </div>
        </div>
        
        {/* Navigation links for unauthenticated users - Desktop */}
        {status === "unauthenticated" && (
          <div className="hidden sm:flex items-center space-x-6 ml-6">
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
        
        {/* Empty div for spacing when unauthenticated */}
        {status === "unauthenticated" && (
          <div className="flex-1"></div>
        )}

        {/* Center: User Name */}
        {status === "authenticated" && (
          <div className="flex items-center justify-center flex-1 flex-col">
            <span className="text-base sm:text-lg font-semibold text-gray-900">
              {session?.user?.name}
            </span>
            <div className="flex items-center">
              {balanceLoading ? (
                <span className="text-xs sm:text-sm text-gray-500">Loading balance...</span>
              ) : (
                <span className="text-xs sm:text-sm font-medium text-green-600">
                  Balance: {formatCurrency(totalBalance, selectedCurrency)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Right side: Quick Actions, Currency, Logout and Profile Icon */}
        <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0 pr-2 sm:pr-4">
          {/* Quick Action Buttons - Only shown for authenticated users */}
          {status === "authenticated" && (
            <div className="hidden sm:flex items-center space-x-2 mr-2">
              <button 
                onClick={openExpenseModal}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md text-xs font-medium border border-red-100 shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Expense</span>
              </button>
              <button 
                onClick={openIncomeModal}
                className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-md text-xs font-medium border border-green-100 shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Income</span>
              </button>
            </div>
          )}
          
          {/* Currency Selector */}
          {status === "authenticated" && (
            <div className="relative currency-dropdown">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50/80 hover:bg-gray-100/80 rounded-full text-xs sm:text-sm font-medium text-gray-700 transition-all duration-200 border border-gray-200/50 hover:border-gray-300/50 shadow-sm hover:shadow-md"
              >
                <span className="font-semibold">{getCurrencySymbol(selectedCurrency)}</span>
                <span className="hidden sm:inline font-medium">{selectedCurrency}</span>
                <svg className="w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/50 z-50 max-h-60 overflow-y-auto">
                  <div className="py-2">
                    {CURRENCIES.map((currency) => (
                      <button
                        key={currency.code}
                        onClick={() => handleCurrencyChange(currency.code)}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50/80 flex items-center justify-between transition-all duration-200 ${
                          selectedCurrency === currency.code ? 'bg-blue-50/80 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        <span className="flex items-center space-x-3">
                          <span className="font-semibold text-base">{currency.symbol}</span>
                          <span className="font-medium">{currency.code}</span>
                        </span>
                        <span className="text-xs text-gray-500 hidden sm:inline">{currency.name}</span>
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
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-800/90 hover:bg-gray-900/90 text-white rounded-full text-xs sm:text-sm font-medium flex items-center transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </span>
              </button>
              
              {/* Profile Icon */}
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-gray-200/50 hover:border-blue-300/50 transition-all duration-200 shadow-sm hover:shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center border-2 border-gray-200/50 hover:border-blue-300/50 transition-all duration-200 shadow-sm hover:shadow-md">
                  <span className="text-lg sm:text-xl font-semibold text-blue-700">
                    {session?.user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              )}
            </>
          ) : status === "unauthenticated" ? (
            <Link
              href="/signin"
              className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-medium transition-all duration-200 shadow-sm hover:shadow-md text-xs sm:text-sm flex items-center"
            >
              Sign In
            </Link>
          ) : null}
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg md:hidden">
          <div className="px-4 py-2 space-y-2">
            {status === "authenticated" ? (
              <>
                <div className="flex items-center justify-around py-2">
                  <Link 
                    href="/dashboard" 
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md text-sm font-medium border border-blue-100 shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>Dashboard</span>
                  </Link>
                </div>
                <div className="flex items-center justify-around py-2">
                  <button 
                    onClick={() => {
                      openExpenseModal();
                      setIsMobileMenuOpen(false);
                    }}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-md text-sm font-medium border border-red-100 shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add Expense</span>
                  </button>
                  <button 
                    onClick={() => {
                      openIncomeModal();
                      setIsMobileMenuOpen(false);
                    }}
                    className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-md text-sm font-medium border border-green-100 shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add Income</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/" className="block py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  Home
                </Link>
                <Link href="#features" className="block py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  Features
                </Link>
                <Link href="#about" className="block py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  About
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
} 