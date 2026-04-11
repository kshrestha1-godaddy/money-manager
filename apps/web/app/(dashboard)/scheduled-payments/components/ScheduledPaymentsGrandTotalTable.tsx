"use client";

import { formatCurrency } from "../../../utils/currency";
import {
  BULK_SELECT_COLUMN_WIDTH_PX,
  TABLE_CELL_X,
  TABLE_CELL_Y,
} from "../scheduled-payments-table-constants";
import { ScheduledPaymentsTableColgroup } from "./scheduled-payments-table-colgroup";

interface ScheduledPaymentsGrandTotalTableProps {
  paymentCount: number;
  totalAmount: number;
  tableDisplayCurrency: string;
}

export function ScheduledPaymentsGrandTotalTable({
  paymentCount,
  totalAmount,
  tableDisplayCurrency,
}: ScheduledPaymentsGrandTotalTableProps) {
  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-[1100px] table-fixed text-sm leading-relaxed">
        <ScheduledPaymentsTableColgroup />
        <tbody>
          <tr className="border-t-[3px] border-gray-300/90 bg-gray-100/95 shadow-[0_-6px_16px_-10px_rgba(15,23,42,0.12)]">
            <td
              className={`border-r border-gray-100/80 bg-gray-100/95 ${TABLE_CELL_X} ${TABLE_CELL_Y}`}
              style={{
                width: BULK_SELECT_COLUMN_WIDTH_PX,
                minWidth: BULK_SELECT_COLUMN_WIDTH_PX,
                maxWidth: BULK_SELECT_COLUMN_WIDTH_PX,
                boxSizing: "border-box",
              }}
              aria-hidden
            />
            <td
              colSpan={2}
              className={`${TABLE_CELL_X} ${TABLE_CELL_Y} text-left text-sm font-semibold text-gray-900`}
            >
              <span className="text-gray-800">Grand total</span>
              <span className="ml-2 font-medium text-gray-600">
                ({paymentCount} {paymentCount === 1 ? "payment" : "payments"})
              </span>
            </td>
            <td
              className={`${TABLE_CELL_X} ${TABLE_CELL_Y} text-sm font-bold tabular-nums text-gray-900`}
            >
              {formatCurrency(totalAmount, tableDisplayCurrency)}
            </td>
            <td
              colSpan={5}
              className={`${TABLE_CELL_X} ${TABLE_CELL_Y} bg-gray-100/95`}
              aria-hidden
            />
            <td
              className={`sticky right-0 z-10 min-w-[12rem] border-l border-gray-200 bg-gray-100/95 ${TABLE_CELL_X} ${TABLE_CELL_Y} text-center shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] sm:min-w-[13.5rem]`}
              aria-hidden
            />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
