"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseDashboardFiltersArgs {
  hasIncomes: boolean;
  hasExpenses: boolean;
}

interface UseDashboardFiltersResult {
  startDate: string;
  endDate: string;
  handleDateChange: (start: string, end: string) => void;
  clearFilters: () => void;
}

export function useDashboardFilters({ hasIncomes, hasExpenses }: UseDashboardFiltersArgs): UseDashboardFiltersResult {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDateChange = useCallback((start: string, end: string) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      setStartDate(start);
      setEndDate(end);
    }, 150);
  }, []);

  const clearFilters = useCallback(() => {
    setStartDate("");
    setEndDate("");
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  return {
    startDate,
    endDate,
    handleDateChange,
    clearFilters,
  };
}


