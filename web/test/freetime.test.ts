import { describe, expect, it } from "vitest";
import { freeTimeLayout, standardDayBounds } from "@/lib/freetime";
import { duration } from "@/lib/timeslot";
import { d, slotOn, HOUR, MIN } from "./support";

const MON = d(2026, 9, 7);

describe("FreeTimeEngine", () => {
  it("phase-one sample day: classes 09:00–14:00 with 15-min breaks", () => {
    // FGFG 09:00-10:30, BI 10:45-12:15, TF II 12:30-14:00
    const activities = [
      slotOn(MON, 9, 0, 10, 30),
      slotOn(MON, 10, 45, 12, 15),
      slotOn(MON, 12, 30, 14, 0),
    ];
    const layout = freeTimeLayout(activities, standardDayBounds(MON));
    // 2 inter-class 15-min gaps + the big 14:00→00:00 gap = 3 free slots
    // (the ≥15-min rule, §7 — resolved in Phase 1).
    expect(layout.freeSlots).toHaveLength(3);
    expect(duration(layout.freeSlots[0])).toBe(15 * MIN);
    expect(duration(layout.freeSlots[1])).toBe(15 * MIN);
    expect(duration(layout.freeSlots[2])).toBe(10 * HOUR);
  });

  it("a 15-minute gap is Libre", () => {
    const activities = [slotOn(MON, 9, 0, 10, 0), slotOn(MON, 10, 15, 11, 0)];
    const layout = freeTimeLayout(activities, standardDayBounds(MON));
    expect(layout.freeSlots.some((s) => duration(s) === 15 * MIN)).toBe(true);
  });

  it("a gap shorter than 15 minutes is ignored", () => {
    const activities = [slotOn(MON, 9, 0, 10, 0), slotOn(MON, 10, 10, 11, 0)];
    const layout = freeTimeLayout(activities, standardDayBounds(MON));
    expect(layout.freeSlots.some((s) => duration(s) === 10 * MIN)).toBe(false);
  });

  it("a gap is never subdivided", () => {
    const activities = [slotOn(MON, 9, 0, 10, 0)];
    const layout = freeTimeLayout(activities, standardDayBounds(MON));
    // Just one Libre block from 10:00 to midnight.
    expect(layout.freeSlots).toHaveLength(1);
    expect(duration(layout.freeSlots[0])).toBe(14 * HOUR);
  });

  it("an empty day is one Libre block 09:00→00:00", () => {
    const layout = freeTimeLayout([], standardDayBounds(MON));
    expect(layout.freeSlots).toHaveLength(1);
    expect(duration(layout.freeSlots[0])).toBe(15 * HOUR);
    expect(layout.effectiveStart).toBe(standardDayBounds(MON).defaultStart);
  });

  it("an early activity moves the start before 09:00", () => {
    const activities = [slotOn(MON, 8, 0, 9, 30)];
    const layout = freeTimeLayout(activities, standardDayBounds(MON));
    expect(new Date(layout.effectiveStart).getHours()).toBe(8);
  });

  it("a midnight-crossing activity is clamped to this day", () => {
    const start = new Date(MON);
    start.setHours(23, 0, 0, 0);
    const end = new Date(MON);
    end.setDate(end.getDate() + 1);
    end.setHours(1, 0, 0, 0);
    const layout = freeTimeLayout(
      [{ start: start.getTime(), end: end.getTime() }],
      standardDayBounds(MON),
    );
    // The tail past midnight belongs to the next day: the busy interval is
    // clamped to 23:00→00:00, so the only Libre block is 09:00→23:00 and
    // nothing extends past this day's midnight.
    expect(layout.freeSlots).toHaveLength(1);
    expect(new Date(layout.freeSlots[0].end).getHours()).toBe(23);
    expect(layout.freeSlots.every((s) => s.end <= standardDayBounds(MON).end)).toBe(true);
  });

  it("overlapping activities merge before gap maths", () => {
    const activities = [slotOn(MON, 9, 0, 11, 0), slotOn(MON, 10, 0, 12, 0)];
    const layout = freeTimeLayout(activities, standardDayBounds(MON));
    expect(layout.freeSlots).toHaveLength(1);
    expect(new Date(layout.freeSlots[0].start).getHours()).toBe(12);
  });
});
