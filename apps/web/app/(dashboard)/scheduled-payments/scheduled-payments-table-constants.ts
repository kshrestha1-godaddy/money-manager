/** Fixed width incl. horizontal padding (`box-border`); remaining cols share the rest. */
export const BULK_SELECT_COLUMN_WIDTH_PX = 52;

/**
 * `table-fixed` widths (sum 100%). When column kept wider for `DD Month YYYY | HH:MM:SS`.
 */
export const SCHEDULED_TABLE_COL_PCT = {
  title: "17%",
  when: "13%",
  amount: "8%",
  category: "7%",
  account: "11%",
  notes: "10%",
  recurrence: "6%",
  status: "6%",
  postpone: "8%",
  actions: "14%",
} as const;

export const TABLE_CELL_X = "px-4 sm:px-5";
/** Body / footer row vertical padding */
export const TABLE_CELL_Y = "py-[1.125rem] sm:py-5";
export const TABLE_HEAD_Y = "py-4 sm:py-[1.125rem]";
