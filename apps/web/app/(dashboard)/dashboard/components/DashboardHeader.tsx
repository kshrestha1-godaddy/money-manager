"use client";

import { ExportAllButton } from "./ExportAllButton";
import { ExportExcelButton } from "./ExportExcelButton";

export function DashboardHeader() {
  return (
    <div id="dashboard-header" className="flex flex-wrap items-center justify-end gap-3">
      <h1 className="sr-only">Dashboard</h1>
      <div className="flex flex-wrap items-center gap-2">
        <ExportExcelButton />
        <ExportAllButton />
      </div>
    </div>
  );
}
