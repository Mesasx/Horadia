/**
 * Calendar / date helpers — the TypeScript port of the Swift `Date+Horadia`
 * layer (product brief §6, §11, §41).
 *
 * Horadia reasons about **weeks that start on Monday** and about wall-clock
 * times snapped to a **15-minute grid**. The web app runs on Alba's phone in
 * Spain, so the browser's local timezone already *is* `Europe/Madrid`; we use
 * local `Date` arithmetic throughout rather than fighting timezone conversions.
 * All date maths lives here so the rest of the app never touches `Date`
 * internals directly.
 */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

/** A wall-clock time of day (hour + minute), independent of any calendar date. */
export interface TimeOfDay {
  hour: number;
  minute: number;
}

export function timeOfDay(hour: number, minute: number): TimeOfDay {
  return { hour, minute };
}

/** Parses `"HH:mm"` (e.g. `"09:00"`, `"16:45"`). Returns `null` on bad input. */
export function parseTimeOfDay(value: string): TimeOfDay | null {
  const parts = value.split(":");
  if (parts.length !== 2) return null;
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function minutesSinceMidnight(t: TimeOfDay): number {
  return t.hour * 60 + t.minute;
}

export function formatTimeOfDay(t: TimeOfDay): string {
  return `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
}

/** 09:00 — the default lower bound of a Horadia day (§6). */
export const DAY_START_DEFAULT: TimeOfDay = { hour: 9, minute: 0 };

// MARK: - Date helpers (local time)

/** Start of the calendar day (00:00) containing `date`. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 00:00 of the day *after* `date` — the default upper bound of a day (§6). */
export function endOfDayMidnight(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

/** Resolves a `TimeOfDay` against the calendar day that contains `date`. */
export function settingTime(date: Date, t: TimeOfDay): Date {
  const d = new Date(date);
  d.setHours(t.hour, t.minute, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Monday 00:00 of the week containing `date` (European weeks, §41). */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  // JS: 0 = Sunday … 6 = Saturday. Shift so Monday = 0.
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

/** The seven days Monday…Sunday of the week containing `date`. */
export function weekDays(date: Date): Date[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** `true` for Saturday / Sunday. */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// MARK: - 15-minute grid (§11)

export const TimeGrid = {
  /** Horadia's minimum time unit: 15 minutes, in milliseconds. */
  step: 15 * MINUTE,
  /** Minimum duration of any activity: 15 minutes. */
  minimumActivityDuration: 15 * MINUTE,
  /** A gap must be at least this long to surface as a "Libre" block (§7). */
  minimumFreeDuration: 15 * MINUTE,

  /** Snaps `date` to the nearest 15-minute boundary of its day. */
  snap(date: Date): Date {
    const reference = startOfDay(date);
    const elapsed = date.getTime() - reference.getTime();
    const snapped = Math.round(elapsed / this.step) * this.step;
    return new Date(reference.getTime() + snapped);
  },
} as const;

/** `yyyy-MM-dd` in local time — stable key used for overrides and JSON dates. */
export function dayKey(date: Date): string {
  const d = startOfDay(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Parses a `yyyy-MM-dd` string into a local `Date` at 00:00. */
export function parseDayKey(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}
