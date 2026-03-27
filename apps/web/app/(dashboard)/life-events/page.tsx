import { Suspense } from "react";
import LifeEventsPageClient from "./LifeEventsPageClient";
import { LOADING_COLORS } from "../../config/colorConfig";

const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

export default function LifeEventsPage() {
  return (
    <Suspense
      fallback={
        <div className={loadingContainer}>
          <div className={loadingSpinner} />
          <p className={loadingText}>Loading…</p>
        </div>
      }
    >
      <LifeEventsPageClient />
    </Suspense>
  );
}
