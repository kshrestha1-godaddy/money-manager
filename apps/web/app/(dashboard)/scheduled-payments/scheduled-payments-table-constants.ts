/** Fixed width incl. horizontal padding (`box-border`); remaining cols share the rest. */
export const BULK_SELECT_COLUMN_WIDTH_PX = 52;

/**
 * `table-fixed` widths (sum 100%). When column kept wider for `DD Month YYYY | HH:MM:SS`.
 */
export const SCHEDULED_TABLE_COL_PCT = {
  title: "18%",
  when: "14%",
  amount: "9%",
  category: "8%",
  account: "12%",
  notes: "11%",
  recurrence: "6%",
  status: "7%",
  actions: "15%",
} as const;

export const TABLE_CELL_X = "px-4 sm:px-5";
/** Body / footer row vertical padding */
export const TABLE_CELL_Y = "py-[1.125rem] sm:py-5";
export const TABLE_HEAD_Y = "py-4 sm:py-[1.125rem]";
