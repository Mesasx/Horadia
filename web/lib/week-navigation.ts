/** Pixel tolerance for browser rounding around a horizontal snap point. */
export const WEEK_BOUNDARY_TOLERANCE = 16;

/** Whether the horizontal week strip has settled on (or beyond) next Monday. */
export function hasReachedNextWeek(
  scrollLeft: number,
  nextMondayOffset: number,
  tolerance = WEEK_BOUNDARY_TOLERANCE,
): boolean {
  if (!Number.isFinite(scrollLeft) || !Number.isFinite(nextMondayOffset)) return false;
  return scrollLeft + Math.max(0, tolerance) >= nextMondayOffset;
}
