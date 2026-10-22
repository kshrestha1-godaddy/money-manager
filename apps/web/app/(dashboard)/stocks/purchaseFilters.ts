import type { StockPurchase } from "../investments/utils/stockPurchases";

export const STOCK_PERIODS = [
  "ALL",
  "1M",
  "3M",
  "6M",
  "1Y",
  "YTD",
  "CUSTOM",
] as const;
export type StockPeriod = (typeof STOCK_PERIODS)[number];

export function stockDateRange(
  period: StockPeriod,
  start: string,
  end: string,
  now = new Date(),
) {
  const today = now.toISOString().slice(0, 10);
  if (period === "ALL") return { start: "", end: "" };
  if (period === "CUSTOM") return { start, end };
  if (period === "YTD")
    return { start: `${today.slice(0, 4)}-01-01`, end: today };
  const months = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12 }[period];
  const date = new Date(`${today}T00:00:00Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - months);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return { start: date.toISOString().slice(0, 10), end: today };
}

export function filterStockPurchases(
  purchases: StockPurchase[],
  search: string,
  range: { start: string; end: string },
) {
  const term = search.trim().toLowerCase();
  return purchases.filter((p) => {
    const day = p.date.slice(0, 10);
    if ((range.start && day < range.start) || (range.end && day > range.end))
      return false;
    const text = [
      p.title,
      p.description,
      p.notes,
      p.category,
      String(p.id),
      `#${p.id}`,
      p.currency,
      p.account?.bankName,
      p.account?.nickname,
      p.account?.holderName,
      ...(p.tags ?? []),
      ...(p.location ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return !term || text.includes(term);
  });
}
