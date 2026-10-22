export type StockPurchase = {
  id: number;
  title: string;
  date: string;
  amount: number;
  originalAmount: number;
  currency: string;
  description: string | null;
  category: string;
  account: {
    bankName: string;
    holderName: string;
    nickname: string | null;
    accountNumber: string;
  } | null;
  tags: string[];
  location: string[];
  coordinates: { latitude: number; longitude: number } | null;
  notes: string | null;
  receipt: string | null;
  isRecurring: boolean;
  recurringFrequency: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Calendar months, including months with no purchases, in chronological order. */
export function monthlyStockPurchases(
  purchases: StockPurchase[],
  through = new Date().toISOString().slice(0, 7),
) {
  if (!purchases.length) return [];
  const totals = new Map<string, number>();
  for (const purchase of purchases) {
    const month = purchase.date.slice(0, 7);
    totals.set(month, (totals.get(month) ?? 0) + purchase.amount);
  }
  const keys = [...totals.keys()].sort();
  const start = new Date(`${keys[0]}-01T00:00:00Z`);
  const last = [keys[keys.length - 1]!, through].sort()[1]!;
  const result: { month: string; amount: number; change: number | null }[] = [];
  while (start.toISOString().slice(0, 7) <= last) {
    const month = start.toISOString().slice(0, 7);
    const amount = totals.get(month) ?? 0;
    const previous = result[result.length - 1]?.amount;
    result.push({
      month,
      amount,
      change:
        previous && previous > 0
          ? ((amount - previous) / previous) * 100
          : null,
    });
    start.setUTCMonth(start.getUTCMonth() + 1);
  }
  return result;
}
