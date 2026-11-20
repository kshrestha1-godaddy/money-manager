"use client";

import { useState } from "react";

const defaultFilters = { startDate: "", endDate: "", isAllTime: false };

export function useDashboardFilters() {
  const [filters, setFilters] = useState(defaultFilters);

  return {
    ...filters,
    handleDateChange: (startDate: string, endDate: string) =>
      setFilters({ startDate, endDate, isAllTime: false }),
    clearFilters: () => setFilters(defaultFilters),
    setAllTime: () => setFilters({ ...defaultFilters, isAllTime: true }),
  };
}
