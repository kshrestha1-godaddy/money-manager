import { Suspense } from "react";
import AnnuityPageClient from "./AnnuityPageClient";
import { LOADING_COLORS } from "../../config/colorConfig";

const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

export default function AnnuityPage() {
  return (
    <Suspense
      fallback={
        <div className={loadingContainer}>
          <div className={loadingSpinner}></div>
          <p className={loadingText}>Loading annuity calculator...</p>
        </div>
      }
    >
      <AnnuityPageClient />
    </Suspense>
  );
}
