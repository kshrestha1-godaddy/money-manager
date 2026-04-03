import { InvestmentInterface } from "../../../types/investments";

/**
 * For GOLD / SILVER positions, replaces `currentPrice` with browser-stored spot rates
 * (per unit of quantity, same currency as other investment amounts).
 */
export function applyMetalSpotRatesToInvestments(
  investments: InvestmentInterface[],
  goldSpotPerUnit: number | undefined,
  silverSpotPerUnit: number | undefined
): InvestmentInterface[] {
  const goldOk =
    goldSpotPerUnit != null &&
    Number.isFinite(goldSpotPerUnit) &&
    goldSpotPerUnit > 0;
  const silverOk =
    silverSpotPerUnit != null &&
    Number.isFinite(silverSpotPerUnit) &&
    silverSpotPerUnit > 0;

  if (!goldOk && !silverOk) return investments;

  return investments.map((inv) => {
    if (inv.type === "GOLD" && goldOk)
      return { ...inv, currentPrice: goldSpotPerUnit! };
    if (inv.type === "SILVER" && silverOk)
      return { ...inv, currentPrice: silverSpotPerUnit! };
    return inv;
  });
}
