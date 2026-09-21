import { afterEach, describe, expect, it, vi } from "vitest";
import { initialPlannerState, timelineFor } from "@/lib/planner";

afterEach(() => vi.unstubAllGlobals());

describe("existing device updates to G2", () => {
  it("preserves personal data on hydration while loading the new bundled schedule", async () => {
    const day = new Date(2026, 8, 22);
    const saved = initialPlannerState(day);
    saved.preferences.ownerName = "Alba";
    saved.subjectColors.BI = "rose";
    saved.omittedInstanceKeys = ["FGFG|2026-09-23|960"];
    const values = new Map([["horadia.planner.v1", JSON.stringify({ state: saved, version: 2 })]]);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    const { usePlannerStore } = await import("@/store/planner-store");
    await usePlannerStore.persist.rehydrate();
    const state = usePlannerStore.getState();
    expect(state.personalItems).toEqual(saved.personalItems);
    expect(state.preferences).toEqual(saved.preferences);
    expect(state.subjectColors).toEqual(saved.subjectColors);
    expect(state.reminders).toEqual(saved.reminders);
    expect(state.omittedInstanceKeys).toEqual(saved.omittedInstanceKeys);
    expect(state.hydrated).toBe(true);
    expect(timelineFor(state, day).blocks.some((block) => block.kind === "item" &&
      block.item.instanceKey === "FGFG|2026-09-22|960|g2")).toBe(true);
    const persisted = usePlannerStore.persist.getOptions().partialize!(state);
    expect(persisted).not.toHaveProperty("universityEvents");
    expect(persisted).not.toHaveProperty("practiceGroup");
  });
});
