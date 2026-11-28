import { Category } from "./financial";
import { AccountInterface } from "./accounts";

export interface ScheduledPaymentInvestmentRef {
  id: number;
  name: string;
  type: string;
}

export interface ScheduledPaymentItem {
  id: number;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  scheduledAt: Date;
  categoryId: number;
  category: Category;
  accountId: number | null;
  account: AccountInterface | null;
  userId: number;
  tags: string[];
  notes: string | null;
  isRecurring: boolean;
  recurringFrequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | null;
  resolution: "ACCEPTED" | "REJECTED" | null;
  resolvedAt: Date | null;
  createdExpenseId: number | null;
  /** When set, accept withholds on this investment instead of debiting account balance. */
  investmentId: number | null;
  investment: ScheduledPaymentInvestmentRef | null;
  createdAt: Date;
  updatedAt: Date;
}
