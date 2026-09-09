import { describe, expect, it } from "vitest";
import {
  initialPlannerState,
  timelineFor,
  personalItemsOn,
  findItem,
  addItem,
  removeItem,
  moveItem,
  rescheduleItem,
  moveItemToDay,
  resizeItem,
  togglePinned,
  toggleCompleted,
  duplicateItem,
  copyItemToDay,
  omitClass,
  restoreClass,
  universityEvents,
} from "@/lib/planner";
import { makeUniversityItem } from "@/lib/day-assembler";
import { SUBJECTS_BY_CODE } from "@/lib/planner";
import { d, at, HOUR, MIN } from "./support";

// A Monday inside the seed's coverage.
const MON = d(2026, 9, 14);

function state() {
  return initialPlannerState(MON);
}

function deporte(s = state()) {
  return personalItemsOn(s, MON).find((i) => i.title === "Deporte")!;
}

describe("PlannerStore parity", () => {
  it("move snaps to the 15-minute grid", () => {
    const s0 = state();
    const item = deporte(s0);
    const target = at(MON, 15, 7).getTime(); // 15:07 → 15:00
    const s1 = moveItem(s0, item.id, target);
    const moved = findItem(s1, item.id)!;
    expect(new Date(moved.start).getMinutes()).toBe(0);
    expect(new Date(moved.start).getHours()).toBe(15);
    // duration preserved (90 min)
    expect(moved.end - moved.start).toBe(90 * MIN);
  });

  it("move across days changes the day", () => {
    const s0 = state();
    const item = deporte(s0);
    const wed = d(2026, 9, 16, 10, 0);
    const s1 = moveItem(s0, item.id, wed.getTime());
    const moved = findItem(s1, item.id)!;
    expect(new Date(moved.start).getDate()).toBe(16);
    expect(personalItemsOn(s1, MON).some((i) => i.id === item.id)).toBe(false);
    expect(personalItemsOn(s1, d(2026, 9, 16)).some((i) => i.id === item.id)).toBe(true);
  });

  it("personal activities remain movable and resizable", () => {
    const s0 = state();
    const item = deporte(s0);
    const moved = moveItem(s0, item.id, at(MON, 15, 0).getTime());
    expect(findItem(moved, item.id)!.start).not.toBe(item.start);
    const resized = resizeItem(moved, item.id, at(MON, 17, 0).getTime());
    expect(findItem(resized, item.id)!.end).toBe(at(MON, 17, 0).getTime());
  });

  it("reschedules start and end atomically on the 15-minute grid", () => {
    const s0 = state();
    const item = deporte(s0);
    const s1 = rescheduleItem(
      s0,
      item.id,
      at(MON, 19, 7).getTime(),
      at(MON, 20, 38).getTime(),
    );
    const changed = findItem(s1, item.id)!;
    expect(changed.start).toBe(at(MON, 19, 0).getTime());
    expect(changed.end).toBe(at(MON, 20, 45).getTime());
  });

  it("moveItemToDay keeps the time of day", () => {
    const s0 = state();
    const item = deporte(s0);
    const startHour = new Date(item.start).getHours();
    const s1 = moveItemToDay(s0, item.id, d(2026, 9, 17));
    const moved = findItem(s1, item.id)!;
    expect(new Date(moved.start).getHours()).toBe(startHour);
    expect(new Date(moved.start).getDate()).toBe(17);
  });

  it("a pinned item is immovable", () => {
    let s = state();
    const item = deporte(s);
    s = togglePinned(s, item.id);
    const before = findItem(s, item.id)!.start;
    s = moveItem(s, item.id, at(MON, 22, 0).getTime());
    expect(findItem(s, item.id)!.start).toBe(before);
  });

  it("resize enforces the 15-minute minimum", () => {
    const s0 = state();
    const item = deporte(s0);
    const s1 = resizeItem(s0, item.id, item.start + 60_000); // 1 min
    const resized = findItem(s1, item.id)!;
    expect(resized.end - resized.start).toBe(15 * MIN);
  });

  it("duplicate nudges 15 minutes later", () => {
    const s0 = state();
    const item = deporte(s0);
    const { state: s1, clone } = duplicateItem(s0, item.id);
    expect(clone).toBeDefined();
    expect(clone!.start).toBe(item.start + 15 * MIN);
    expect(personalItemsOn(s1, MON).filter((i) => i.title === "Deporte")).toHaveLength(2);
  });

  it("copy to another day places it at the same time", () => {
    const s0 = state();
    const item = deporte(s0);
    const { clone } = copyItemToDay(s0, item.id, d(2026, 9, 18));
    expect(new Date(clone!.start).getHours()).toBe(new Date(item.start).getHours());
    expect(new Date(clone!.start).getDate()).toBe(18);
  });

  it("completion toggles", () => {
    const s0 = state();
    const item = deporte(s0);
    const s1 = toggleCompleted(s0, item.id);
    expect(findItem(s1, item.id)!.isCompleted).toBe(true);
  });

  it("remove deletes the item", () => {
    const s0 = state();
    const item = deporte(s0);
    const s1 = removeItem(s0, item.id);
    expect(findItem(s1, item.id)).toBeUndefined();
  });

  it("add then timeline reflects it", () => {
    const s0 = state();
    const start = at(d(2026, 9, 15), 15, 0);
    const s1 = addItem(s0, {
      id: "x1",
      title: "Cita",
      start: start.getTime(),
      end: start.getTime() + HOUR,
      kind: { type: "custom" },
      palette: "lilac",
      symbolName: "flower",
    });
    const items = timelineFor(s1, d(2026, 9, 15)).blocks.filter((b) => b.kind === "item");
    expect(items.some((b) => b.kind === "item" && b.item.title === "Cita")).toBe(true);
  });
});

describe("omitting a class (§14)", () => {
  it("university items expose full metadata and cannot be moved or resized", () => {
    const s0 = state();
    const event =
      universityEvents(MON).find((candidate) => candidate.subjectCode === "FFI") ??
      universityEvents(MON)[0];
    const item = makeUniversityItem(event, MON, SUBJECTS_BY_CODE);
    const withUniversity = addItem(s0, item);
    const moved = moveItem(withUniversity, item.id, at(MON, 20, 0).getTime());
    const resized = resizeItem(moved, item.id, at(MON, 22, 0).getTime());
    const rescheduled = rescheduleItem(
      resized,
      item.id,
      at(MON, 18, 0).getTime(),
      at(MON, 20, 0).getTime(),
    );
    expect(findItem(rescheduled, item.id)!.start).toBe(item.start);
    expect(findItem(rescheduled, item.id)!.end).toBe(item.end);
    expect(item.fullTitle).toBeTruthy();
    expect(item.subjectCode).toBe(item.title);
  });

  it("omit removes just that instance; restore brings it back", () => {
    const s0 = state();
    // pick a real class on this Monday
    const events = universityEvents(MON).filter((e) => e.kind === "lecture");
    expect(events.length).toBeGreaterThan(0);
    const item = makeUniversityItem(events[0], MON, SUBJECTS_BY_CODE);
    const key = item.instanceKey!;

    const before = timelineFor(s0, MON).blocks.filter((b) => b.kind === "item").length;
    const s1 = omitClass(s0, key);
    const after = timelineFor(s1, MON).blocks.filter((b) => b.kind === "item").length;
    expect(after).toBe(before - 1);

    const s2 = restoreClass(s1, key);
    expect(timelineFor(s2, MON).blocks.filter((b) => b.kind === "item").length).toBe(before);
  });

  it("omitting one day does not affect the next week", () => {
    const s0 = state();
    const events = universityEvents(MON).filter((e) => e.kind === "lecture");
    const item = makeUniversityItem(events[0], MON, SUBJECTS_BY_CODE);
    const s1 = omitClass(s0, item.instanceKey!);
    const nextMon = d(2026, 9, 21);
    const nextEvents = universityEvents(nextMon).filter((e) => e.kind === "lecture");
    if (nextEvents.length) {
      const nextItem = makeUniversityItem(nextEvents[0], nextMon, SUBJECTS_BY_CODE);
      expect(s1.omittedInstanceKeys.includes(nextItem.instanceKey!)).toBe(false);
    }
  });
});
