import ExcelJS from "exceljs";
import { loadUnifiedTransactionsForUser } from "../(dashboard)/transactions/actions/transactions";
import { getCurrencyRateConfigQuery } from "../data/currency-rate-config";
import {
  buildBalanceSheetRows,
  computeNetBalance,
  createSyncConvertAmount,
  sortTransactionsAsc,
} from "./balance-sheet-core";

export type {
  BalanceSheetBuildResult,
  ConvertAmountFn,
} from "./balance-sheet-core";

export {
  buildBalanceSheetRows,
  computeNetBalance,
  createSyncConvertAmount,
  isIncomeType,
  isOutflowType,
  sortTransactionsAsc,
} from "./balance-sheet-core";

export async function createServerConvertAmount(displayCurrency: string) {
  const { matrix } = await getCurrencyRateConfigQuery();
  return createSyncConvertAmount(displayCurrency, matrix);
}

export interface BuildBalanceSheetXlsxResult {
  buffer: Buffer;
  filename: string;
  transactionCount: number;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
}

export async function buildBalanceSheetXlsxBuffer(params: {
  userId: number;
  displayCurrency: string;
  rangeStart: Date;
  rangeEnd: Date;
  periodLabel: string;
}): Promise<BuildBalanceSheetXlsxResult | null> {
  const convertAmount = await createServerConvertAmount(params.displayCurrency);

  const periodTransactions = await loadUnifiedTransactionsForUser(params.userId, {
    startDate: params.rangeStart,
    endDate: params.rangeEnd,
  });

  if (periodTransactions.length === 0) return null;

  const preRangeEnd = new Date(params.rangeStart.getTime() - 1);
  const preRangeTransactions = await loadUnifiedTransactionsForUser(params.userId, {
    endDate: preRangeEnd,
  });

  const openingBalance = computeNetBalance(
    preRangeTransactions,
    params.displayCurrency,
    convertAmount
  );

  const sorted = sortTransactionsAsc(periodTransactions);
  const built = buildBalanceSheetRows(
    sorted,
    params.displayCurrency,
    openingBalance,
    convertAmount
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MoneyManager";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Balance Sheet");

  worksheet.addRow(["Balance Sheet"]);
  worksheet.addRow(["Period", params.periodLabel]);
  worksheet.addRow(["Currency", params.displayCurrency]);
  worksheet.addRow(["Opening balance", built.openingBalance]);
  worksheet.addRow(["Closing balance", built.closingBalance]);
  worksheet.addRow(["Transactions", built.transactionCount]);
  worksheet.addRow([]);

  for (const row of built.rows) {
    worksheet.addRow(row);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const filename = `balance-sheet-${params.periodLabel.replace(/\s+/g, "-").toLowerCase()}.xlsx`;

  return {
    buffer,
    filename,
    transactionCount: built.transactionCount,
    openingBalance: built.openingBalance,
    closingBalance: built.closingBalance,
    totalDebit: built.totalDebit,
    totalCredit: built.totalCredit,
  };
}
