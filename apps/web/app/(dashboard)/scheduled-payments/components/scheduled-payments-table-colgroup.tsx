import { BULK_SELECT_COLUMN_WIDTH_PX, SCHEDULED_TABLE_COL_PCT } from "../scheduled-payments-table-constants";

export function ScheduledPaymentsTableColgroup() {
  return (
    <colgroup>
      <col
        style={{
          width: BULK_SELECT_COLUMN_WIDTH_PX,
          minWidth: BULK_SELECT_COLUMN_WIDTH_PX,
          maxWidth: BULK_SELECT_COLUMN_WIDTH_PX,
        }}
      />
      <col style={{ width: SCHEDULED_TABLE_COL_PCT.title }} />
      <col style={{ width: SCHEDULED_TABLE_COL_PCT.when }} />
      <col style={{ width: SCHEDULED_TABLE_COL_PCT.amount }} />
      <col style={{ width: SCHEDULED_TABLE_COL_PCT.category }} />
      <col style={{ width: SCHEDULED_TABLE_COL_PCT.account }} />
      <col style={{ width: SCHEDULED_TABLE_COL_PCT.notes }} />
      <col style={{ width: SCHEDULED_TABLE_COL_PCT.recurrence }} />
      <col style={{ width: SCHEDULED_TABLE_COL_PCT.status }} />
      <col style={{ width: SCHEDULED_TABLE_COL_PCT.actions }} />
    </colgroup>
  );
}
