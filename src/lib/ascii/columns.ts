import { pad, progressBar, truncate } from "@/lib/ascii/box";

/** Column after the bar — percent or active count. */
export const COL_PCT = 5;

/** Bar spans two column units (2 × 12). */
export const COL_BAR_UNIT = 12;
export const COL_BAR = COL_BAR_UNIT * 2;

/** Last column — project status or done/canceled counts. */
export const COL_STATUS = 16;

const GRID_GUTTER = 2;
const GRID_FIXED = 1 + COL_PCT + GRID_GUTTER + GRID_GUTTER + COL_STATUS;

export interface ProgressGrid {
  block: string;
  pctCol: string;
  bar: string;
  statusCol: string;
}

export function barWidthForGrid(usable: number): number {
  if (GRID_FIXED + COL_BAR <= usable) return COL_BAR;
  return Math.max(COL_BAR_UNIT, usable - GRID_FIXED);
}

export function gridBlockWidth(usable: number): number {
  return GRID_FIXED + barWidthForGrid(usable);
}

export function formatDoneCanceledColumn(completed: number, canceled: number): string {
  const text = `${completed} done · ${canceled} cncl`;
  return pad(truncate(text, COL_STATUS), COL_STATUS);
}

export function buildProgressGrid(
  fillRatio: number,
  pct: number | null,
  status: string,
  usable: number,
  pctColumn?: string,
): ProgressGrid {
  const barWidth = barWidthForGrid(usable);
  const pctCol = pctColumn
    ? pad(truncate(pctColumn, COL_PCT), COL_PCT, "right")
    : pad(pct == null ? "—" : `${pct}%`, COL_PCT, "right");
  const bar = progressBar(fillRatio, barWidth);
  const statusCol = pad(truncate(status, COL_STATUS), COL_STATUS);
  const block = ` ${bar}  ${pctCol}  ${statusCol}`;
  return { block, pctCol, bar, statusCol };
}
