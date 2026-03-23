import { Suspense } from "react";
import ScheduledPaymentsPageClient from "./ScheduledPaymentsPageClient";
import { LOADING_COLORS } from "../../config/colorConfig";

const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

export default function ScheduledPaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className={loadingContainer}>
          <div className={loadingSpinner} />
          <p className={loadingText}>Loading…</p>
        </div>
      }
    >
      <ScheduledPaymentsPageClient />
    </Suspense>
  );
}
