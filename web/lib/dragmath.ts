/**
 * Pure geometry for the drag-and-drop layer (§11, §12) — port of Swift `DragMath`.
 * Keeps the "where does this land?" maths out of the components so it is testable.
 */

import { TimeGrid, addDays } from "./time";

/**
 * Converts a vertical offset inside a day timeline into a wall-clock start time,
 * snapped to the 15-minute grid.
 *
 * @param y              pixels from the top of the timeline content
 * @param timelineStart  epoch ms at `y === 0`
 * @param pxPerMinute    vertical scale
 */
export function timeAtOffset(
  y: number,
  timelineStart: number,
  pxPerMinute: number,
): number {
  const minutes = Math.max(0, y) / pxPerMinute;
  const raw = timelineStart + minutes * 60_000;
  return TimeGrid.snap(new Date(raw)).getTime();
}

/** The y offset a given time maps to (inverse of `timeAtOffset`). */
export function offsetForTime(
  date: number,
  timelineStart: number,
  pxPerMinute: number,
): number {
  return ((date - timelineStart) / 60_000) * pxPerMinute;
}

/** Clamps a candidate start so the whole block stays within `[lower, upper)`. */
export function clampStart(
  start: number,
  duration: number,
  lower: number,
  upper: number,
): number {
  const latestStart = upper - duration;
  if (start < lower) return lower;
  if (start > latestStart) return Math.max(lower, latestStart);
  return start;
}

/**
 * How many whole days to shift, given a horizontal drag translation and the
 * column pitch (width + gap). A drag past half a column jumps one day.
 */
export function dayShift(dx: number, columnPitch: number): number {
  if (columnPitch <= 0) return 0;
  return Math.round(dx / columnPitch);
}

/** Applies a day shift to a start date (epoch ms), preserving time of day. */
export function shiftDay(date: number, days: number): number {
  if (days === 0) return date;
  return addDays(new Date(date), days).getTime();
}
