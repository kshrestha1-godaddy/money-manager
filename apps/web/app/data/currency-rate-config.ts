import { cache } from "react";
import prisma from "@repo/db/client";
import {
  DEFAULT_CURRENCY_ANCHORS,
  buildStaticConversionRates,
} from "../utils/currencyRates";

/**
 * Cached Prisma read for server-side conversion. Do not import this module from client components.
 */
export const getCurrencyRateConfigQuery = cache(async (userId?: number) => {
  const row = userId
    ? await prisma.currencyRateConfig.findUnique({ where: { userId } })
    : null;
  const fallback = row
    ? null
    : await prisma.currencyRateConfig.findUnique({ where: { id: 1 } });
  const resolved = row || fallback;
  const inrToNpr = resolved ? Number(resolved.inrToNpr) : DEFAULT_CURRENCY_ANCHORS.inrToNpr;
  const nprPerUsd = resolved ? Number(resolved.nprPerUsd) : DEFAULT_CURRENCY_ANCHORS.nprPerUsd;
  return {
    inrToNpr,
    nprPerUsd,
    matrix: buildStaticConversionRates(inrToNpr, nprPerUsd),
  };
});
