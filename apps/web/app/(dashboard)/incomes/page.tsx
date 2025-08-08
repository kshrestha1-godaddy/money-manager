import { Suspense } from 'react';
import IncomesPageClient from './IncomesPageClient';
import { LOADING_COLORS } from '../../config/colorConfig';

const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

export default function IncomesPage() {
  return (
    <Suspense
      fallback={
        <div className={loadingContainer}>
          <div className={loadingSpinner}></div>
          <p className={loadingText}>Loading incomes...</p>
        </div>
      }
    >
      <IncomesPageClient />
    </Suspense>
  );
}