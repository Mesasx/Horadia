/** Pixel tolerance for browser rounding around a horizontal snap point. */
export const WEEK_BOUNDARY_TOLERANCE = 16;

/**
 * Returns the equivalent scroll position after recycling the next week into
 * the first seven columns. `null` means the viewport is still in this week.
 */
export function scrollAfterWeekAdvance(
  scrollLeft: number,
  nextMondayOffset: number,
  tolerance = WEEK_BOUNDARY_TOLERANCE,
): number | null {
  if (!Number.isFinite(scrollLeft) || !Number.isFinite(nextMondayOffset)) return null;
  if (nextMondayOffset <= 0) return null;
  if (scrollLeft + Math.max(0, tolerance) < nextMondayOffset) return null;
  return Math.max(0, scrollLeft - nextMondayOffset);
}
