/**
 * Shared, locale-aware formatters (§41) — port of Swift `HoradiaFormat`.
 * Times are always 24h so the timeline grid stays aligned regardless of the
 * device's 12/24h setting.
 */

const WEEKDAY_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const WEEKDAY_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTH_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sept", "oct", "nov", "dic",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** `"09:00"` — 24h wall-clock. */
export function formatTime(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `"09:00–10:30"`. */
export function formatRange(start: Date | number, end: Date | number): string {
  return `${formatTime(start)}–${formatTime(end)}`;
}

/** Localised weekday, full: `"lunes"`. */
export function formatWeekdayLong(date: Date): string {
  return WEEKDAY_LONG[date.getDay()];
}

/** Localised weekday, short: `"lun"`. */
export function formatWeekdayShort(date: Date): string {
  return WEEKDAY_SHORT[date.getDay()];
}

/** `"16 sept"`. */
export function formatDayMonth(date: Date): string {
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

/** `"16 de septiembre"`. */
export function formatDayMonthLong(date: Date): string {
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${date.getDate()} de ${months[date.getMonth()]}`;
}

/** Human duration, e.g. `"1 h 30 min"`, `"45 min"`. `ms` is milliseconds. */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

/** `"en 25 min"`, `"en 2 h"`, `"ahora"`. */
export function formatRelativeStart(from: number, to: number): string {
  const diffMin = Math.round((to - from) / 60_000);
  if (diffMin <= 0) return "ahora";
  if (diffMin < 60) return `en ${diffMin} min`;
  const hours = Math.round(diffMin / 60);
  return `en ${hours} h`;
}
