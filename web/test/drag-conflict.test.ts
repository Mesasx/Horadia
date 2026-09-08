import { describe, expect, it } from "vitest";
import {
  timeAtOffset,
  offsetForTime,
  clampStart,
  dayShift,
  shiftDay,
} from "@/lib/dragmath";
import {
  detectConflict,
  conflictSummary,
  isMultiple,
  conflictClassKeys,
} from "@/lib/conflict";
import type { ScheduledItem } from "@/lib/scheduled-item";
import { d, at, HOUR, MIN } from "./support";

const MON = d(2026, 9, 14);

describe("DragMath", () => {
  it("offset → time snaps to 15 min", () => {
    const start = at(MON, 9, 0).getTime();
    // 92 px at 1 px/min = 92 min → 90 min → 10:30
    const t = timeAtOffset(92, start, 1);
    expect(new Date(t).getHours()).toBe(10);
    expect(new Date(t).getMinutes()).toBe(30);
  });

  it("offset round-trips", () => {
    const start = at(MON, 9, 0).getTime();
    const time = at(MON, 13, 15).getTime();
    const y = offsetForTime(time, start, 1.5);
    expect(timeAtOffset(y, start, 1.5)).toBe(time);
  });

  it("clampStart keeps the whole block inside the window", () => {
    const lower = at(MON, 9, 0).getTime();
    const upper = at(MON, 24, 0).getTime(); // next midnight via 24h
    const duration = 2 * HOUR;
    expect(clampStart(lower - HOUR, duration, lower, upper)).toBe(lower);
    expect(clampStart(upper, duration, lower, upper)).toBe(upper - duration);
  });

  it("dayShift jumps a day past half a column", () => {
    expect(dayShift(0, 200)).toBe(0);
    expect(dayShift(120, 200)).toBe(1);
    expect(dayShift(-120, 200)).toBe(-1);
    expect(dayShift(80, 200)).toBe(0);
  });

  it("shiftDay preserves the time of day", () => {
    const t = at(MON, 16, 45).getTime();
    const shifted = shiftDay(t, 2);
    expect(new Date(shifted).getHours()).toBe(16);
    expect(new Date(shifted).getMinutes()).toBe(45);
    expect(new Date(shifted).getDate()).toBe(16);
  });
});

function personal(startH: number, endH: number): ScheduledItem {
  return {
    id: "p1",
    title: "Deporte",
    start: at(MON, startH, 0).getTime(),
    end: at(MON, endH, 0).getTime(),
    kind: { type: "sport" },
    palette: "mint",
    symbolName: "activity",
  };
}

function klass(id: string, title: string, startH: number, startM: number, endH: number, endM: number): ScheduledItem {
  return {
    id,
    title,
    start: at(MON, startH, startM).getTime(),
    end: at(MON, endH, endM).getTime(),
    kind: { type: "university", kind: "lecture" },
    palette: "sky",
    symbolName: "book",
    instanceKey: `${title}|k|${startH * 60 + startM}`,
    isImmovable: true,
  };
}

describe("ConflictEngine (§15)", () => {
  const bi = klass("c1", "BI", 10, 45, 12, 15);
  const tf = klass("c2", "TF II", 12, 30, 14, 0);

  it("detects a single-class conflict", () => {
    const c = detectConflict(personal(11, 13), [bi, tf]);
    // 11:00–13:00 overlaps BI (10:45–12:15) and TF II (12:30–14:00) → 2
    expect(c).not.toBeNull();
    expect(isMultiple(c!)).toBe(true);
    expect(conflictSummary(c!)).toBe("Deporte coincide con 2 clases");
    expect(conflictClassKeys(c!)).toHaveLength(2);
  });

  it("detects exactly one", () => {
    const c = detectConflict(personal(11, 12), [bi, tf]);
    expect(c).not.toBeNull();
    expect(isMultiple(c!)).toBe(false);
    expect(conflictSummary(c!)).toBe("Deporte coincide con BI");
  });

  it("no conflict when clear", () => {
    const c = detectConflict(personal(14, 15), [bi, tf]);
    expect(c).toBeNull();
  });

  it("class vs class is ignored (only personal activities conflict)", () => {
    const c = detectConflict(bi, [tf]);
    expect(c).toBeNull();
  });
});
