/** Shared helpers for the engine tests (port of Swift `TestSupport`). */

import { slotFromDates, type TimeSlot } from "@/lib/timeslot";

/** A local `Date` in the pinned Europe/Madrid timezone. */
export function d(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/** `at(base, 9, 30)` → same day as `base`, 09:30. */
export function at(base: Date, hour: number, minute: number): Date {
  const copy = new Date(base);
  copy.setHours(hour, minute, 0, 0);
  return copy;
}

/** A `TimeSlot` on `day` from `sH:sM` to `eH:eM`. */
export function slotOn(
  day: Date,
  sH: number,
  sM: number,
  eH: number,
  eM: number,
): TimeSlot {
  return slotFromDates(at(day, sH, sM), at(day, eH, eM));
}

export const MIN = 60_000;
export const HOUR = 60 * MIN;
