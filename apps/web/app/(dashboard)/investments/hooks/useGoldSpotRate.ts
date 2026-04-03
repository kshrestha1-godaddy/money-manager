"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { convertCurrencySync } from "../../../utils/currencyConversion";
import {
  DEFAULT_GOLD_SPOT_INR_PER_UNIT,
  readGoldSpotFromStorage,
  writeGoldSpotToStorage,
  type GoldSpotStored,
} from "../utils/goldSpotStorage";

export interface UseGoldSpotRateResult {
  /** Spot rate per unit in the active display currency (from stored INR via conversion). */
  spotPerUnitDisplay: number;
  spotRateInrPerUnit: number;
  updatedAt: string | null;
  setSpotFromDisplayAmount: (amountInUserCurrency: number) => void;
}

export function useGoldSpotRate(currency: string): UseGoldSpotRateResult {
  const [stored, setStored] = useState<GoldSpotStored>(() => ({
    spotRateInrPerUnit: DEFAULT_GOLD_SPOT_INR_PER_UNIT,
    updatedAt: null,
  }));

  useEffect(() => {
    setStored(readGoldSpotFromStorage());
  }, []);

  const spotPerUnitDisplay = useMemo(
    () =>
      convertCurrencySync(stored.spotRateInrPerUnit, "INR", currency),
    [stored.spotRateInrPerUnit, currency]
  );

  const setSpotFromDisplayAmount = useCallback(
    (amountInUserCurrency: number) => {
      if (!Number.isFinite(amountInUserCurrency) || amountInUserCurrency <= 0) return;
      const inr = convertCurrencySync(amountInUserCurrency, currency, "INR");
      if (!Number.isFinite(inr) || inr <= 0) return;
      const next: GoldSpotStored = {
        spotRateInrPerUnit: inr,
        updatedAt: new Date().toISOString(),
      };
      writeGoldSpotToStorage(next);
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
