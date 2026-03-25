import { cache } from "react";
import prisma from "@repo/db/client";
import {
  DEFAULT_CURRENCY_ANCHORS,
  buildStaticConversionRates,
} from "../utils/currencyRates";

/**
 * Cached Prisma read for server-side conversion. Do not import this module from client components.
 */
export const getCurrencyRateConfigQuery = cache(async () => {
  const row = await prisma.currencyRateConfig.findUnique({ where: { id: 1 } });
  const inrToNpr = row ? Number(row.inrToNpr) : DEFAULT_CURRENCY_ANCHORS.inrToNpr;
  const nprPerUsd = row ? Number(row.nprPerUsd) : DEFAULT_CURRENCY_ANCHORS.nprPerUsd;
  return {
    inrToNpr,
    nprPerUsd,
    matrix: buildStaticConversionRates(inrToNpr, nprPerUsd),
  };
});
