import { queryOptions } from "@tanstack/react-query";

export function financialItemsKey(type: "INCOME" | "EXPENSE") {
  return [type === "INCOME" ? "incomes" : "expenses"] as const;
}

export function financialItemsQuery<T>(type: "INCOME" | "EXPENSE", getItems: () => Promise<T[]>) {
  return queryOptions({
    queryKey: financialItemsKey(type),
    queryFn: getItems,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
