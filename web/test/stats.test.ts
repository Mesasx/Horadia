import { describe, expect, it } from "vitest";
import { computeTotals, hoursOf } from "@/lib/stats";
import { buildDayTimeline } from "@/lib/scheduled-item";
import type { ScheduledItem } from "@/lib/scheduled-item";
import { initialPlannerState, timelineFor, weekTimelines } from "@/lib/planner";
import { d, at, HOUR } from "./support";

const MON = d(2026, 9, 14);

function item(
  title: string,
  kind: ScheduledItem["kind"],
  startH: number,
  endH: number,
): ScheduledItem {
  return {
    id: title,
    title,
    start: at(MON, startH, 0).getTime(),
    end: at(MON, endH, 0).getTime(),
    kind,
    palette: "sky",
    symbolName: "book",
  };
}

describe("StatsEngine (§35)", () => {
  it("sums item durations and free time per category", () => {
    const timeline = buildDayTimeline(MON, [
      item("BI", { type: "university", kind: "lecture" }, 9, 11), // 2h uni
      item("Deporte", { type: "sport" }, 18, 19), // 1h sport
    ]);
    const totals = computeTotals([timeline]);
    expect(hoursOf(totals, "university")).toBe(2);
    expect(hoursOf(totals, "sport")).toBe(1);
    // Free = (11:00→18:00) + (19:00→00:00) = 7 + 5 = 12h
    expect(hoursOf(totals, "free")).toBe(12);
  });

  it("an empty day is 15h free", () => {
    const timeline = buildDayTimeline(MON, []);
    const totals = computeTotals([timeline]);
    expect(hoursOf(totals, "free")).toBe(15);
  });

  it("a full seeded week produces positive university and free totals", () => {
    const s = initialPlannerState(MON);
    const totals = computeTotals(weekTimelines(s, MON));
    expect(hoursOf(totals, "university")).toBeGreaterThan(0);
    expect(hoursOf(totals, "nap")).toBeGreaterThan(0); // siesta routine
    expect(hoursOf(totals, "free")).toBeGreaterThan(0);
  });

  it("holiday hides classes so university time is 0 that day", () => {
    const s = initialPlannerState(d(2026, 10, 12)); // Fiesta Nacional
    const holidayTimeline = timelineFor(s, d(2026, 10, 12));
    const totals = computeTotals([holidayTimeline]);
    expect(hoursOf(totals, "university")).toBe(0);
    expect(holidayTimeline.dayNote).toBeTruthy();
  });
});
