"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { convertCurrencySync } from "../../../utils/currencyConversion";
import {
  DEFAULT_SILVER_SPOT_INR_PER_UNIT,
  readSilverSpotFromStorage,
  writeSilverSpotToStorage,
  type SilverSpotStored,
} from "../utils/silverSpotStorage";

export interface UseSilverSpotRateResult {
  spotPerUnitDisplay: number;
  spotRateInrPerUnit: number;
  updatedAt: string | null;
  setSpotFromDisplayAmount: (amountInUserCurrency: number) => void;
}

export function useSilverSpotRate(currency: string): UseSilverSpotRateResult {
  const [stored, setStored] = useState<SilverSpotStored>(() => ({
    spotRateInrPerUnit: DEFAULT_SILVER_SPOT_INR_PER_UNIT,
    updatedAt: null,
  }));

  useEffect(() => {
    setStored(readSilverSpotFromStorage());
  }, []);

  const spotPerUnitDisplay = useMemo(
    () => convertCurrencySync(stored.spotRateInrPerUnit, "INR", currency),
    [stored.spotRateInrPerUnit, currency]
  );

  const setSpotFromDisplayAmount = useCallback(
    (amountInUserCurrency: number) => {
      if (!Number.isFinite(amountInUserCurrency) || amountInUserCurrency <= 0) return;
      const inr = convertCurrencySync(amountInUserCurrency, currency, "INR");
      if (!Number.isFinite(inr) || inr <= 0) return;
      const next: SilverSpotStored = {
        spotRateInrPerUnit: inr,
        updatedAt: new Date().toISOString(),
      };
      writeSilverSpotToStorage(next);
      setStored(next);
    },
    [currency]
  );

  return {
    spotPerUnitDisplay,
    spotRateInrPerUnit: stored.spotRateInrPerUnit,
    updatedAt: stored.updatedAt,
    setSpotFromDisplayAmount,
  };
}
