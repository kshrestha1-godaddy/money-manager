export const GOLD_SPOT_STORAGE_KEY = "moneymanager.goldSpotRate.v1";

/** Canonical spot rate per unit of quantity, stored in INR. */
export const DEFAULT_GOLD_SPOT_INR_PER_UNIT = 10_000;

export interface GoldSpotStored {
  spotRateInrPerUnit: number;
  /** ISO timestamp when the user last saved; null if only the default has ever been used */
  updatedAt: string | null;
}

export function readGoldSpotFromStorage(): GoldSpotStored {
  if (typeof window === "undefined") {
    return {
      spotRateInrPerUnit: DEFAULT_GOLD_SPOT_INR_PER_UNIT,
      updatedAt: null,
    };
  }
  try {
    const raw = window.localStorage.getItem(GOLD_SPOT_STORAGE_KEY);
    if (!raw) {
      return {
        spotRateInrPerUnit: DEFAULT_GOLD_SPOT_INR_PER_UNIT,
        updatedAt: null,
      };
    }
    const parsed = JSON.parse(raw) as Partial<GoldSpotStored>;
    const spotRateInrPerUnit =
      typeof parsed.spotRateInrPerUnit === "number" &&
      Number.isFinite(parsed.spotRateInrPerUnit) &&
      parsed.spotRateInrPerUnit > 0
        ? parsed.spotRateInrPerUnit
        : DEFAULT_GOLD_SPOT_INR_PER_UNIT;
    const updatedAt =
      typeof parsed.updatedAt === "string" && parsed.updatedAt.length > 0
        ? parsed.updatedAt
        : null;
    return { spotRateInrPerUnit, updatedAt };
  } catch {
    return {
      spotRateInrPerUnit: DEFAULT_GOLD_SPOT_INR_PER_UNIT,
      updatedAt: null,
    };
  }
}

export function writeGoldSpotToStorage(data: GoldSpotStored): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GOLD_SPOT_STORAGE_KEY, JSON.stringify(data));
}
