import { ACTIONS_COLUMN_WIDTH_PX, BULK_SELECT_COLUMN_WIDTH_PX } from "../scheduled-payments-table-constants";
import type { ScheduledColumnWidths } from "../scheduled-payments-table-types";

export function ScheduledPaymentsTableColgroup({ columnWidths }: { columnWidths: ScheduledColumnWidths }) {
  return (
    <colgroup>
      <col style={{ width: BULK_SELECT_COLUMN_WIDTH_PX }} />
      {Object.entries(columnWidths).map(([column, width]) => (
        <col key={column} style={{ width }} />
      ))}
      <col style={{ width: ACTIONS_COLUMN_WIDTH_PX }} />
    </colgroup>
  );
}
