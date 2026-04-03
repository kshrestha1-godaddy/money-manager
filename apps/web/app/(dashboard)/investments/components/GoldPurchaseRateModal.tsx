import type { ComponentProps } from "react";
import { MetalSpotRateModal } from "./MetalSpotRateModal";
import { DEFAULT_GOLD_SPOT_INR_PER_UNIT } from "../utils/goldSpotStorage";

type Props = Omit<ComponentProps<typeof MetalSpotRateModal>, "metal" | "defaultInrPerUnit">;

export function GoldPurchaseRateModal(props: Props) {
  return (
    <MetalSpotRateModal
      {...props}
      metal="gold"
      defaultInrPerUnit={DEFAULT_GOLD_SPOT_INR_PER_UNIT}
    />
  );
}
