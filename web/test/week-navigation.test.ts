import { describe, expect, it } from "vitest";
import {
  scrollAfterWeekAdvance,
  WEEK_BOUNDARY_TOLERANCE,
} from "@/lib/week-navigation";

describe("continuous week navigation", () => {
  const nextMondayOffset = 1320;

  it("does not recycle while the viewport is still in this week", () => {
    expect(scrollAfterWeekAdvance(1180, nextMondayOffset)).toBeNull();
  });

  it("places next Monday at the same position when it reaches the boundary", () => {
    expect(scrollAfterWeekAdvance(nextMondayOffset, nextMondayOffset)).toBe(0);
  });

  it("preserves the day reached instead of forcing Monday", () => {
    expect(scrollAfterWeekAdvance(nextMondayOffset + 188, nextMondayOffset)).toBe(188);
  });

  it("allows for subpixel and layout rounding at the snap point", () => {
    expect(
      scrollAfterWeekAdvance(
        nextMondayOffset - WEEK_BOUNDARY_TOLERANCE,
        nextMondayOffset,
      ),
    ).toBe(0);
  });

  it("does not accept invalid measurements", () => {
    expect(scrollAfterWeekAdvance(Number.NaN, nextMondayOffset)).toBeNull();
    expect(scrollAfterWeekAdvance(0, Number.POSITIVE_INFINITY)).toBeNull();
    expect(scrollAfterWeekAdvance(0, 0)).toBeNull();
  });
});
