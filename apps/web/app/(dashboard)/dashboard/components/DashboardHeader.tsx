"use client";

import { PageDisplayCurrencySelect } from "../../../components/PageDisplayCurrencySelect";
import { ExportAllButton } from "./ExportAllButton";
import { ExportExcelButton } from "./ExportExcelButton";

interface DashboardHeaderProps {
  displayCurrency: string;
  onDisplayCurrencyChange: (currency: string) => void;
}

export function DashboardHeader({
  displayCurrency,
  onDisplayCurrencyChange,
}: DashboardHeaderProps) {
  return (
    <div id="dashboard-header" className="flex flex-wrap items-center justify-end gap-3">
      <h1 className="sr-only">Dashboard</h1>
      <div className="flex flex-wrap items-center gap-2">
        <PageDisplayCurrencySelect
          id="dashboard-display-currency"
          value={displayCurrency}
          onChange={onDisplayCurrencyChange}
        />
        <ExportExcelButton />
        <ExportAllButton />
      </div>
    </div>
  );
}
