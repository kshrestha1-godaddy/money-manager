import { Suspense } from "react";
import MobileHubClient from "./MobileHubClient";
import { LOADING_COLORS } from "../../config/colorConfig";

const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

export default function MobileHubPage() {
  return (
    <Suspense
      fallback={
        <div className={loadingContainer}>
          <div className={loadingSpinner} />
          <p className={loadingText}>Loading mobile hub…</p>
        </div>
      }
    >
      <MobileHubClient />
    </Suspense>
  );
}
