import { describe, expect, it } from "vitest";
import {
  hasReachedNextWeek,
  WEEK_BOUNDARY_TOLERANCE,
} from "@/lib/week-navigation";

describe("continuous week navigation", () => {
  const nextMondayOffset = 1320;

  it("does not change weeks while Sunday is still in view", () => {
    expect(hasReachedNextWeek(1180, nextMondayOffset)).toBe(false);
  });

  it("changes weeks when scrolling settles on next Monday", () => {
    expect(hasReachedNextWeek(nextMondayOffset, nextMondayOffset)).toBe(true);
  });

  it("allows for subpixel and layout rounding at the snap point", () => {
    expect(
      hasReachedNextWeek(
        nextMondayOffset - WEEK_BOUNDARY_TOLERANCE,
        nextMondayOffset,
      ),
    ).toBe(true);
  });

  it("does not accept invalid measurements", () => {
    expect(hasReachedNextWeek(Number.NaN, nextMondayOffset)).toBe(false);
    expect(hasReachedNextWeek(0, Number.POSITIVE_INFINITY)).toBe(false);
  });
});
