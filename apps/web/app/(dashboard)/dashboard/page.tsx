import { Suspense } from "react";
import { LOADING_COLORS } from "../../config/colorConfig";
import DashboardPageClient from "./DashboardPageClient";

const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className={loadingContainer}>
          <div className={loadingSpinner}></div>
          <p className={loadingText}>Loading dashboard...</p>
        </div>
      }
    >
      <DashboardPageClient />
    </Suspense>
  );
}