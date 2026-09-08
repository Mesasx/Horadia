import { describe, expect, it } from "vitest";
import { birthdayGreeting, ageOnBirthday, isBirthday } from "@/lib/birthday";
import { startOfWeek, weekDays, addDays } from "@/lib/time";
import { DEFAULT_PREFERENCES } from "@/lib/planner";
import { d } from "./support";

const config = {
  ownerName: DEFAULT_PREFERENCES.ownerName,
  birthdayMonth: DEFAULT_PREFERENCES.birthdayMonth,
  birthdayDay: DEFAULT_PREFERENCES.birthdayDay,
  birthYear: DEFAULT_PREFERENCES.birthYear,
};

describe("birthday (§39 — never hardcode 22)", () => {
  it("age follows the year", () => {
    expect(ageOnBirthday(d(2026, 9, 16), 2004)).toBe(22);
    expect(ageOnBirthday(d(2027, 9, 16), 2004)).toBe(23);
    expect(ageOnBirthday(d(2030, 9, 16), 2004)).toBe(26);
  });

  it("greeting only on the birthday", () => {
    expect(birthdayGreeting(d(2026, 9, 16), config)).toBe("🎂 Feliz 22, Alba");
    expect(birthdayGreeting(d(2026, 9, 15), config)).toBeNull();
    expect(birthdayGreeting(d(2026, 9, 17), config)).toBeNull();
  });

  it("isBirthday matches month + day only", () => {
    expect(isBirthday(d(2099, 9, 16), 9, 16)).toBe(true);
    expect(isBirthday(d(2099, 8, 16), 9, 16)).toBe(false);
  });
});

describe("weeks start on Monday (§41)", () => {
  it("startOfWeek of a Wednesday is that Monday", () => {
    const wed = d(2026, 9, 16);
    const monday = startOfWeek(wed);
    expect(monday.getDay()).toBe(1); // Monday
    expect(monday.getDate()).toBe(14);
    expect(monday.getHours()).toBe(0);
  });

  it("startOfWeek of a Sunday stays in the same week", () => {
    const sun = d(2026, 9, 20);
    expect(startOfWeek(sun).getDate()).toBe(14);
  });

  it("weekDays returns Monday…Sunday", () => {
    const days = weekDays(d(2026, 9, 16));
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1);
    expect(days[6].getDay()).toBe(0);
  });

  it("navigating a week is +7 days", () => {
    const monday = startOfWeek(d(2026, 9, 16));
    const next = addDays(monday, 7);
    expect(next.getDate()).toBe(21);
    expect(startOfWeek(next).getDate()).toBe(21);
  });

  it("month boundary is handled", () => {
    const monday = startOfWeek(d(2026, 10, 1)); // Thursday 1 Oct → Mon 28 Sep
    expect(monday.getMonth()).toBe(8); // September
    expect(monday.getDate()).toBe(28);
  });
});
