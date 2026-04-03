import { InvestmentInterface } from "../../../types/investments";

/**
 * For GOLD positions, replaces `currentPrice` with the browser-stored spot rate
 * (per unit of quantity, in the same currency as other investment amounts).
 */
export function applyGoldSpotToInvestments(
  investments: InvestmentInterface[],
  goldSpotPerUnit: number | undefined
): InvestmentInterface[] {
  if (
    goldSpotPerUnit == null ||
    !Number.isFinite(goldSpotPerUnit) ||
    goldSpotPerUnit <= 0
  ) {
    return investments;
  }
  return investments.map((inv) =>
    inv.type === "GOLD"
      ? { ...inv, currentPrice: goldSpotPerUnit }
      : inv
  );
}
