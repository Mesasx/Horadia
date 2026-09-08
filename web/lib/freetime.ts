/**
 * Computes the "Libre" (free) blocks of a day (product brief §7) — port of the
 * Swift `FreeTimeEngine`.
 *
 * Rules:
 * - A day is bounded below by 09:00, unless an activity starts earlier (§6).
 * - A day is bounded above by 00:00 (next midnight); midnight-crossers are
 *   clamped for the current day (§6).
 * - Every uncovered stretch **≥ 15 minutes** becomes exactly one `Libre` block —
 *   never split into pieces (§7).
 * - Uncovered stretches **< 15 minutes** produce no block at all (§7).
 * - A day with no activities is a single `Libre` block 09:00→00:00 (§42).
 *
 * Pure: numbers in, numbers out, no clock access.
 */

import { HOUR, TimeGrid, settingTime, endOfDayMidnight, DAY_START_DEFAULT } from "./time";
import {
  type TimeSlot,
  clamped,
  mergedBusyIntervals,
} from "./timeslot";

export interface DayBounds {
  /** Default lower bound, normally 09:00 of the day (epoch ms). */
  defaultStart: number;
  /** Upper bound, normally 00:00 of the following day (epoch ms). */
  end: number;
}

export function standardDayBounds(date: Date): DayBounds {
  return {
    defaultStart: settingTime(date, DAY_START_DEFAULT).getTime(),
    end: endOfDayMidnight(date).getTime(),
  };
}

export interface FreeLayout {
  /** Effective top of the timeline (may be earlier than 09:00). */
  effectiveStart: number;
  end: number;
  freeSlots: TimeSlot[];
}

/**
 * An activity may legitimately start before 09:00. Allow the window to open up
 * to 12 hours earlier so such activities are not dropped, without letting a
 * stray far-past timestamp swallow the whole day.
 */
function earliestPossibleStart(bounds: DayBounds): number {
  return bounds.defaultStart - 12 * HOUR;
}

function appendGap(
  start: number,
  end: number,
  out: TimeSlot[],
  minimum: number,
): void {
  if (end - start >= minimum) out.push({ start, end });
}

export function freeTimeLayout(
  activities: TimeSlot[],
  bounds: DayBounds,
  minimumFreeDuration: number = TimeGrid.minimumFreeDuration,
): FreeLayout {
  const dayWindow: TimeSlot = {
    start: earliestPossibleStart(bounds),
    end: bounds.end,
  };

  const clampedSlots = activities
    .map((a) => clamped(a, dayWindow))
    .filter((a): a is TimeSlot => a !== null);
  const busy = mergedBusyIntervals(clampedSlots);

  const firstBusyStart = busy[0]?.start;
  const effectiveStart =
    firstBusyStart !== undefined && firstBusyStart < bounds.defaultStart
      ? firstBusyStart
      : bounds.defaultStart;

  if (busy.length === 0) {
    return {
      effectiveStart,
      end: bounds.end,
      freeSlots: [{ start: effectiveStart, end: bounds.end }],
    };
  }

  const freeSlots: TimeSlot[] = [];
  let cursor = effectiveStart;
  for (const interval of busy) {
    appendGap(cursor, interval.start, freeSlots, minimumFreeDuration);
    cursor = Math.max(cursor, interval.end);
  }
  appendGap(cursor, bounds.end, freeSlots, minimumFreeDuration);

  return { effectiveStart, end: bounds.end, freeSlots };
}
