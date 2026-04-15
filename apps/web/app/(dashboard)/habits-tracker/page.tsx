import { Suspense } from "react";
import HabitsTrackerPageClient from "./HabitsTrackerPageClient";
import { LOADING_COLORS } from "../../config/colorConfig";

const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

export default function HabitsTrackerPage() {
  return (
    <Suspense
      fallback={
        <div className={loadingContainer}>
          <div className={loadingSpinner} />
          <p className={loadingText}>Loading…</p>
        </div>
      }
    >
      <HabitsTrackerPageClient />
    </Suspense>
  );
}
