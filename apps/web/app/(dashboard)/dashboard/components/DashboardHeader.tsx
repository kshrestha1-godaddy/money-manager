"use client";

import { TEXT_COLORS, UI_STYLES } from "../../../config/colorConfig";
import { ExportAllButton } from "./ExportAllButton";
import { SimplePDFReportGenerator } from "../reports/SimplePDFReportGenerator";

const pageTitle = TEXT_COLORS.title;
const pageSubtitle = TEXT_COLORS.subtitle;

interface DashboardHeaderProps {
  startDate: string;
  endDate: string;
}

export function DashboardHeader({ startDate, endDate }: DashboardHeaderProps) {
  return (
    <div id="dashboard-header" className={UI_STYLES.header.container}>
      <div>
        <h1 className={pageTitle}>Dashboard</h1>
        <p className={pageSubtitle}>Overview of your financial health</p>
      </div>
      <div className="flex items-center gap-4">
        <ExportAllButton />
        <SimplePDFReportGenerator startDate={startDate} endDate={endDate} />
      </div>
    </div>
  );
}


