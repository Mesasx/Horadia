/**
 * Birthday helpers (§2 & §39) — port of Swift `BirthdayGreeting`.
 *
 * The greeting must show the **correct age automatically** each year — never a
 * hardcoded "22".
 */

export interface BirthdayConfig {
  ownerName: string;
  birthdayMonth: number; // 1-12
  birthdayDay: number;
  birthYear: number;
}

export function isBirthday(
  date: Date,
  month: number,
  day: number,
): boolean {
  return date.getMonth() + 1 === month && date.getDate() === day;
}

/**
 * The age the owner reaches on the birthday occurring in `date`'s year.
 * Example: born 2004-09-16, `date` in 2026 → 22.
 */
export function ageOnBirthday(
  date: Date,
  birthYear: number,
): number {
  return date.getFullYear() - birthYear;
}

/** `"🎂 Feliz 22, Alba"` (§39), or `null` when `date` is not the birthday. */
export function birthdayGreeting(
  date: Date,
  config: BirthdayConfig,
): string | null {
  if (!isBirthday(date, config.birthdayMonth, config.birthdayDay)) return null;
  const age = ageOnBirthday(date, config.birthYear);
  return `🎂 Feliz ${age}, ${config.ownerName}`;
}
