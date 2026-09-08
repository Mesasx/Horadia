import { describe, expect, it } from "vitest";
import { addWeeks, dayKey, startOfWeek } from "@/lib/time";
import { d } from "./support";

describe("European week navigation", () => {
  const nextWeekCases: [Date, string][] = [
    [d(2026, 9, 7), "2026-09-14"],
    [d(2026, 9, 14), "2026-09-21"],
    [d(2026, 9, 28), "2026-10-05"],
    [d(2026, 12, 28), "2027-01-04"],
  ];
  const previousWeekCases: [Date, string][] = [
    [d(2026, 9, 14), "2026-09-07"],
    [d(2026, 9, 21), "2026-09-14"],
    [d(2026, 10, 5), "2026-09-28"],
    [d(2027, 1, 4), "2026-12-28"],
  ];

  it.each(nextWeekCases)("moves exactly one calendar week from %#", (from, expected) => {
    expect(dayKey(addWeeks(from, 1))).toBe(expected);
  });

  it.each(previousWeekCases)("previous week is exactly symmetric from %#", (from, expected) => {
    expect(dayKey(addWeeks(from, -1))).toBe(expected);
  });

  it("always normalizes week start to Monday at local midnight", () => {
    const monday = startOfWeek(d(2026, 9, 13, 18, 45));
    expect(dayKey(monday)).toBe("2026-09-07");
    expect(monday.getDay()).toBe(1);
    expect(monday.getHours()).toBe(0);
  });

  it("Today resolves to the current date's normalized week", () => {
    const now = d(2026, 9, 10, 12, 30);
    expect(dayKey(startOfWeek(now))).toBe("2026-09-07");
  });
});
