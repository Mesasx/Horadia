/**
 * A half-open time interval `[start, end)` on the wall clock — the currency of
 * the scheduling layer (port of Swift `TimeSlot`). Times are epoch milliseconds
 * so the engine stays a pure function of numbers.
 */

export interface TimeSlot {
  /** epoch ms */
  start: number;
  /** epoch ms */
  end: number;
}

export function slot(start: number, end: number): TimeSlot {
  return { start, end };
}

export function slotFromDates(start: Date, end: Date): TimeSlot {
  return { start: start.getTime(), end: end.getTime() };
}

export function duration(s: TimeSlot): number {
  return Math.max(0, s.end - s.start);
}

export function isEmpty(s: TimeSlot): boolean {
  return s.end <= s.start;
}

export function overlaps(a: TimeSlot, b: TimeSlot): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Clamps `s` to `bounds`, returning `null` if nothing remains. */
export function clamped(s: TimeSlot, bounds: TimeSlot): TimeSlot | null {
  const result: TimeSlot = {
    start: Math.max(s.start, bounds.start),
    end: Math.min(s.end, bounds.end),
  };
  return isEmpty(result) ? null : result;
}

/**
 * Sorts by start and merges overlapping or touching slots into a minimal set of
 * disjoint busy intervals. Identity is intentionally discarded — this is only
 * used for gap maths, never for rendering.
 */
export function mergedBusyIntervals(slots: TimeSlot[]): TimeSlot[] {
  const sorted = slots.filter((s) => !isEmpty(s)).sort((a, b) => a.start - b.start);
  if (sorted.length === 0) return [];

  let current: TimeSlot = { ...sorted[0] };
  const result: TimeSlot[] = [];
  for (const s of sorted.slice(1)) {
    if (s.start <= current.end) {
      current.end = Math.max(current.end, s.end);
    } else {
      result.push(current);
      current = { ...s };
    }
  }
  result.push(current);
  return result;
}
