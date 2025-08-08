"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseDashboardFiltersArgs {
  hasIncomes: boolean;
  hasExpenses: boolean;
}

interface UseDashboardFiltersResult {
  startDate: string;
  endDate: string;
  isAllTime: boolean;
  handleDateChange: (start: string, end: string) => void;
  clearFilters: () => void;
  setAllTime: () => void;
}

export function useDashboardFilters({ hasIncomes, hasExpenses }: UseDashboardFiltersArgs): UseDashboardFiltersResult {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isAllTime, setIsAllTime] = useState<boolean>(false);

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDateChange = useCallback((start: string, end: string) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      setStartDate(start);
      setEndDate(end);
      setIsAllTime(false); // Reset all time when dates are changed
    }, 150);
  }, []);

  const clearFilters = useCallback(() => {
    setStartDate("");
    setEndDate("");
    setIsAllTime(false); // Reset all time when clearing filters
  }, []);

  const setAllTime = useCallback(() => {
    setStartDate("");
    setEndDate("");
    setIsAllTime(true); // Explicitly set all time
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  return {
    startDate,
    endDate,
    isAllTime,
    handleDateChange,
    clearFilters,
    setAllTime,
  };
}


