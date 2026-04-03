export const SILVER_SPOT_STORAGE_KEY = "moneymanager.silverSpotRate.v1";

/** Canonical spot rate per unit of quantity, stored in INR. */
export const DEFAULT_SILVER_SPOT_INR_PER_UNIT = 2_000;

export interface SilverSpotStored {
  spotRateInrPerUnit: number;
  updatedAt: string | null;
}

export function readSilverSpotFromStorage(): SilverSpotStored {
  if (typeof window === "undefined") {
    return {
      spotRateInrPerUnit: DEFAULT_SILVER_SPOT_INR_PER_UNIT,
      updatedAt: null,
    };
  }
  try {
    const raw = window.localStorage.getItem(SILVER_SPOT_STORAGE_KEY);
    if (!raw) {
      return {
        spotRateInrPerUnit: DEFAULT_SILVER_SPOT_INR_PER_UNIT,
        updatedAt: null,
      };
    }
    const parsed = JSON.parse(raw) as Partial<SilverSpotStored>;
    const spotRateInrPerUnit =
      typeof parsed.spotRateInrPerUnit === "number" &&
      Number.isFinite(parsed.spotRateInrPerUnit) &&
      parsed.spotRateInrPerUnit > 0
        ? parsed.spotRateInrPerUnit
        : DEFAULT_SILVER_SPOT_INR_PER_UNIT;
    const updatedAt =
      typeof parsed.updatedAt === "string" && parsed.updatedAt.length > 0
        ? parsed.updatedAt
        : null;
    return { spotRateInrPerUnit, updatedAt };
  } catch {
    return {
      spotRateInrPerUnit: DEFAULT_SILVER_SPOT_INR_PER_UNIT,
      updatedAt: null,
    };
  }
}

export function writeSilverSpotToStorage(data: SilverSpotStored): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SILVER_SPOT_STORAGE_KEY, JSON.stringify(data));
}
