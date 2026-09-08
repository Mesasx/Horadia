import { describe, expect, it } from "vitest";
import { timeOfDayGreeting } from "@/lib/greeting";
import { d } from "./support";

describe("time-of-day greeting", () => {
  it.each([
    [d(2026, 9, 8, 6), "Buenos días Alba <3"],
    [d(2026, 9, 8, 11, 59), "Buenos días Alba <3"],
    [d(2026, 9, 8, 12), "Qué tal la mañana <3"],
    [d(2026, 9, 8, 14, 59), "Qué tal la mañana <3"],
    [d(2026, 9, 8, 15), "Que se dé bien la tarde <3"],
    [d(2026, 9, 8, 20, 59), "Que se dé bien la tarde <3"],
    [d(2026, 9, 8, 21), "No te acuestes muy tarde <3"],
    [d(2026, 9, 8, 5, 59), "No te acuestes muy tarde <3"],
  ])("returns the expected message at %s", (date, expected) => {
    expect(timeOfDayGreeting(date, "Alba")).toBe(expected);
  });

  it("uses the configured owner name and falls back when it is blank", () => {
    expect(timeOfDayGreeting(d(2026, 9, 8, 8), "Lucía")).toBe(
      "Buenos días Lucía <3",
    );
    expect(timeOfDayGreeting(d(2026, 9, 8, 8), "  ")).toBe(
      "Buenos días Alba <3",
    );
  });
});
