import { Suspense } from 'react';
import InvestmentsPageClient from './InvestmentsPageClient';
import { LOADING_COLORS } from '../../config/colorConfig';

const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

export default function Investments() {
  return (
    <Suspense
      fallback={
        <div className={loadingContainer}>
          <div className={loadingSpinner}></div>
          <p className={loadingText}>Loading investments...</p>
        </div>
      }
    >
      <InvestmentsPageClient />
    </Suspense>
  );
} 