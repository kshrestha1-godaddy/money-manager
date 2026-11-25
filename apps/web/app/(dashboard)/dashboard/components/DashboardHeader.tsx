"use client";

import { TEXT_COLORS } from "../../../config/colorConfig";
import { ExportAllButton } from "./ExportAllButton";
import { ExportExcelButton } from "./ExportExcelButton";

const pageTitle = TEXT_COLORS.title;

export function DashboardHeader() {
  return (
    <div id="dashboard-header" className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className={pageTitle}>Dashboard</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ExportExcelButton />
        <ExportAllButton />
      </div>
    </div>
  );
}
