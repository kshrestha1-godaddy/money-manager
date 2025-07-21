"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { CURRENCIES, getCurrencySymbol, formatCurrency } from "../utils/currency";
import { useCurrency } from "../providers/CurrencyProvider";
import { useTotalBalance } from "../hooks/useTotalBalance";
import { useModals } from "../providers/ModalsProvider";
import Link from "next/link";
import Image from "next/image";
import { NotificationBell } from "./NotificationBell";

export default function NavBar() {
  const { data: session, status } = useSession();
  const { currency: selectedCurrency, updateCurrency } = useCurrency();
  const { totalBalance, loading: balanceLoading } = useTotalBalance();
  const { openExpenseModal, openIncomeModal } = useModals();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.profile-dropdown')) {
        setIsProfileDropdownOpen(false);
        setIsDropdownOpen(false);
      }
    };

    if (isProfileDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isProfileDropdownOpen]);

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
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const formatTime = (date: Date) => {
    const timeString = date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const timeZone = date.toLocaleTimeString(undefined, {
      timeZoneName: 'short'
    }).split(' ').pop();
    
    return `${timeString} · ${timeZone}`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 w-full bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100/50 z-50">
      {/* Main navbar content */}
      <div className="flex items-center justify-between px-8 py-4 w-full">
        {/* Left side: Logo and Date/Time */}
        <div className="flex flex-col flex-shrink-0">
          {/* App Logo and Info Container */}
          <Link href={status === "authenticated" ? "/dashboard" : "/"} className="flex items-center space-x-4">
            <Image 
              src="/logo-zero.gif" 
              alt="Money Manager Logo" 
              priority={true}
              width={56} 
              height={56} 
              className="rounded-full"
            />
            <div className="flex flex-col justify-center">
              <span className="text-xl font-semibold text-gray-900">My Money Manager</span>
              <div className="text-sm text-gray-600">
                <span className="font-medium">{formatDate(currentDateTime)}</span>
                <span className="mx-1.5 text-gray-400">•</span>
                <span className="font-mono">{formatTime(currentDateTime)}</span>
              </div>
            </div>
          </Link>
        </div>
        
        {/* Empty div for spacing when unauthenticated */}
        {status === "unauthenticated" && (
          <div className="flex-1"></div>
        )}

        {/* Center: User Name */}
        {status === "authenticated" && (
          <div className="flex items-center justify-center flex-1 flex-col">
            <span className="text-lg font-semibold text-gray-900">
              {session?.user?.name}
            </span>
            <div className="flex items-center">
              {balanceLoading ? (
                <span className="text-sm text-gray-500">Loading balance...</span>
              ) : (
                <span className="text-sm font-medium text-green-600">
                  Balance: {formatCurrency(totalBalance, selectedCurrency)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Right side: Quick Actions, Currency, Logout and Profile Icon */}
        <div className="flex items-center space-x-4 flex-shrink-0 pr-4">
          {/* Quick Action Buttons - Only shown for authenticated users */}
          {status === "authenticated" && (
            <div className="flex items-center space-x-2 mr-2">
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
          


          {/* Auth buttons */}
          {status === "authenticated" ? (
            <>
              {/* Notification Bell */}
              <NotificationBell className="mr-2" />
              
              {/* Profile Dropdown */}
              <div className="relative profile-dropdown">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="w-12 h-12 rounded-full transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-200/50 hover:border-blue-300/50 transition-all duration-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center border-2 border-gray-200/50 hover:border-blue-300/50 transition-all duration-200">
                      <span className="text-xl font-semibold text-blue-700">
                        {session?.user?.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/50 z-50">
                    <div className="py-2">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">
                          {session?.user?.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {session?.user?.email}
                        </p>
                      </div>

                      {/* Currency Selector */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            Currency
                          </span>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl text-sm font-medium text-gray-800 transition-all duration-200 border border-blue-200/50 hover:border-blue-300/50 shadow-sm hover:shadow-md group"
                          >
                            <span className="flex items-center space-x-3">
                              <span className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-200/50 group-hover:shadow-md transition-all duration-200">
                                <span className="font-bold text-blue-600 text-sm">{getCurrencySymbol(selectedCurrency)}</span>
                              </span>
                              <div className="flex flex-col items-start">
                                <span className="font-semibold text-gray-900">{selectedCurrency}</span>
                                <span className="text-xs text-gray-500">
                                  {CURRENCIES.find(c => c.code === selectedCurrency)?.name || 'Select Currency'}
                                </span>
                              </div>
                            </span>
                            <svg className="w-4 h-4 transition-transform duration-200 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {isDropdownOpen && (
                            <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200/50 z-50 max-h-60 overflow-hidden">
                              <div className="p-2">
                                <div className="max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                  {CURRENCIES.map((currency) => (
                                    <button
                                      key={currency.code}
                                      onClick={() => handleCurrencyChange(currency.code)}
                                      className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 mb-1 last:mb-0 ${
                                        selectedCurrency === currency.code 
                                          ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-900 shadow-md border border-blue-200/50' 
                                          : 'text-gray-700 hover:bg-gray-50/80 hover:shadow-sm'
                                      }`}
                                    >
                                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm border transition-all duration-200 ${
                                        selectedCurrency === currency.code 
                                          ? 'bg-white border-blue-200/50 shadow-md' 
                                          : 'bg-gray-50 border-gray-200/50'
                                      }`}>
                                        <span className={`font-bold text-sm ${
                                          selectedCurrency === currency.code ? 'text-blue-600' : 'text-gray-600'
                                        }`}>
                                          {currency.symbol}
                                        </span>
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                          <span className={`font-medium ${
                                            selectedCurrency === currency.code ? 'text-blue-900' : 'text-gray-900'
                                          }`}>
                                            {currency.code}
                                          </span>
                                          {selectedCurrency === currency.code && (
                                            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                          )}
                                        </div>
                                        <span className={`text-xs truncate block ${
                                          selectedCurrency === currency.code ? 'text-blue-700/80' : 'text-gray-500'
                                        }`}>
                                          {currency.name}
                                        </span>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Logout */}
                      <div className="border-t border-gray-100 py-1">
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            signOut({ callbackUrl: "/signin" });
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50/80 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Navigation links for unauthenticated users - Desktop */}
              <div className="flex items-center space-x-6">
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
              
              <Link
                href="/signin"
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-medium transition-all duration-200 shadow-sm hover:shadow-md text-sm flex items-center"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
} 