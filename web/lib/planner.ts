/**
 * The planner's mutable state and the pure mutation functions that operate on it
 * — port of Swift `PlannerStore` (minus the Observation plumbing, which the
 * Zustand wrapper in `store/planner-store.ts` provides).
 *
 * Every mutation is a small named function returning a *new* state, so:
 * - the React store just does `set(fn(get()))`,
 * - the tests exercise the logic without a UI (§49),
 * - persistence is a trivial `JSON.stringify(state)`.
 */

import {
  type ScheduledItem,
  type DayTimeline,
  type ItemKind,
  itemDuration,
} from "./scheduled-item";
import { type LibraryActivity, seedLibrary, seedPersonalItems, newId } from "./seed";
import {
  assembleTimeline,
  type DayContext,
} from "./day-assembler";
import {
  importSchedule,
  subjectsByCode as buildSubjectsByCode,
  type ImportedEvent,
  type ImportedSubject,
} from "./university-import";
import {
  TimeGrid,
  startOfDay,
  isSameDay,
  weekDays,
} from "./time";
import scheduleJson from "@/data/university-schedule.json";

// MARK: - Static university data (immutable, from the bundled JSON)

const imported = importSchedule(scheduleJson);

export const SCHEDULE_PROVISIONAL = imported.provisional;
export const SCHEDULE_COVERAGE = imported.coverage;
export const SUBJECTS_BY_CODE: Record<string, ImportedSubject> =
  buildSubjectsByCode(imported);

const universityByDay = new Map<number, ImportedEvent[]>();
for (const event of imported.events) {
  const key = event.day;
  const list = universityByDay.get(key) ?? [];
  list.push(event);
  universityByDay.set(key, list);
}

export function universityEvents(day: Date): ImportedEvent[] {
  return universityByDay.get(startOfDay(day).getTime()) ?? [];
}

export const ALL_SUBJECTS: ImportedSubject[] = imported.subjects;

// MARK: - Preferences (§2, §39, §40)

export interface Preferences {
  ownerName: string;
  birthdayMonth: number;
  birthdayDay: number;
  birthYear: number;
}

export const DEFAULT_PREFERENCES: Preferences = {
  ownerName: "Alba",
  birthdayMonth: 9,
  birthdayDay: 16,
  birthYear: 2004,
};

/** Per-subject colour overrides (§38 — colour only, never the timetable). */
export type SubjectColors = Record<string, string>;

// MARK: - State

export interface PlannerState {
  personalItems: ScheduledItem[];
  /** University instances the user chose not to attend (§14). */
  omittedInstanceKeys: string[];
  library: LibraryActivity[];
  preferences: Preferences;
  subjectColors: SubjectColors;
}

export function initialPlannerState(referenceDate: Date = new Date()): PlannerState {
  return {
    personalItems: seedPersonalItems(referenceDate),
    omittedInstanceKeys: [],
    library: seedLibrary(),
    preferences: DEFAULT_PREFERENCES,
    subjectColors: {},
  };
}

// MARK: - Read model

export function subjectsWithColors(state: PlannerState): Record<string, ImportedSubject> {
  const map: Record<string, ImportedSubject> = {};
  for (const [code, subject] of Object.entries(SUBJECTS_BY_CODE)) {
    const override = state.subjectColors[code];
    map[code] = override ? { ...subject, color: override as ImportedSubject["color"] } : subject;
  }
  return map;
}

export function personalItemsOn(state: PlannerState, date: Date): ScheduledItem[] {
  return state.personalItems.filter((i) => isSameDay(new Date(i.start), date));
}

export function timelineFor(state: PlannerState, date: Date): DayTimeline {
  const day = startOfDay(date);
  const context: DayContext = {
    date: day,
    universityEvents: universityEvents(day),
    personalActivities: personalItemsOn(state, day),
    omittedInstanceKeys: new Set(state.omittedInstanceKeys),
  };
  return assembleTimeline(context, subjectsWithColors(state));
}

export function weekTimelines(state: PlannerState, date: Date): DayTimeline[] {
  return weekDays(date).map((d) => timelineFor(state, d));
}

export function findItem(state: PlannerState, id: string): ScheduledItem | undefined {
  return state.personalItems.find((i) => i.id === id);
}

// MARK: - Mutations (each returns a new PlannerState)

function withItems(
  state: PlannerState,
  items: ScheduledItem[],
): PlannerState {
  return { ...state, personalItems: [...items].sort((a, b) => a.start - b.start) };
}

export function addItem(state: PlannerState, item: ScheduledItem): PlannerState {
  return withItems(state, [...state.personalItems, item]);
}

export function removeItem(state: PlannerState, id: string): PlannerState {
  return { ...state, personalItems: state.personalItems.filter((i) => i.id !== id) };
}

export function replaceItem(state: PlannerState, item: ScheduledItem): PlannerState {
  const exists = state.personalItems.some((i) => i.id === item.id);
  if (!exists) return state;
  return withItems(
    state,
    state.personalItems.map((i) => (i.id === item.id ? item : i)),
  );
}

/**
 * Moves an activity so it starts at `start` (any absolute time), snapped to the
 * 15-min grid (§11) and keeping its duration. The day changes implicitly when
 * `start` lands on another day. No-op for immovable (§14) / pinned (§17) items.
 */
export function moveItem(state: PlannerState, id: string, start: number): PlannerState {
  const item = findItem(state, id);
  if (!item || item.isImmovable || item.isPinned) return state;
  const duration = Math.max(itemDuration(item), TimeGrid.minimumActivityDuration);
  const snapped = TimeGrid.snap(new Date(start)).getTime();
  return replaceItem(state, { ...item, start: snapped, end: snapped + duration });
}

/** Moves an activity to another day, keeping its time of day and duration. */
export function moveItemToDay(state: PlannerState, id: string, day: Date): PlannerState {
  const item = findItem(state, id);
  if (!item || item.isImmovable || item.isPinned) return state;
  const dayStart = startOfDay(day).getTime();
  const offset = item.start - startOfDay(new Date(item.start)).getTime();
  return moveItem(state, id, dayStart + offset);
}

/** Changes only the end time, snapped, respecting the 15-min minimum (§11). */
export function resizeItem(state: PlannerState, id: string, end: number): PlannerState {
  const item = findItem(state, id);
  if (!item || item.isImmovable || item.isPinned) return state;
  const snappedEnd = TimeGrid.snap(new Date(end)).getTime();
  const minEnd = item.start + TimeGrid.minimumActivityDuration;
  return replaceItem(state, { ...item, end: Math.max(snappedEnd, minEnd) });
}

export function togglePinned(state: PlannerState, id: string): PlannerState {
  const item = findItem(state, id);
  if (!item) return state;
  return replaceItem(state, { ...item, isPinned: !item.isPinned });
}

export function toggleCompleted(state: PlannerState, id: string): PlannerState {
  const item = findItem(state, id);
  if (!item) return state;
  return replaceItem(state, { ...item, isCompleted: !item.isCompleted });
}

/** Duplicates an activity in place, nudged 15 min later so it is visible (§19). */
export function duplicateItem(
  state: PlannerState,
  id: string,
): { state: PlannerState; clone?: ScheduledItem } {
  const original = findItem(state, id);
  if (!original) return { state };
  const clone: ScheduledItem = {
    ...original,
    id: newId("act"),
    start: original.start + TimeGrid.step,
    end: original.end + TimeGrid.step,
    isPinned: false,
    isCompleted: false,
  };
  return { state: addItem(state, clone), clone };
}

/** Copies an activity to another day at the same time (§19). Not a routine. */
export function copyItemToDay(
  state: PlannerState,
  id: string,
  day: Date,
): { state: PlannerState; clone?: ScheduledItem } {
  const original = findItem(state, id);
  if (!original) return { state };
  const dayStart = startOfDay(day).getTime();
  const offsetStart = original.start - startOfDay(new Date(original.start)).getTime();
  const duration = itemDuration(original);
  const newStart = dayStart + offsetStart;
  const clone: ScheduledItem = {
    ...original,
    id: newId("act"),
    start: newStart,
    end: newStart + duration,
    isPinned: false,
    isCompleted: false,
  };
  return { state: addItem(state, clone), clone };
}

// MARK: - Mutations — university (§14)

export function omitClass(state: PlannerState, instanceKey: string): PlannerState {
  if (state.omittedInstanceKeys.includes(instanceKey)) return state;
  return { ...state, omittedInstanceKeys: [...state.omittedInstanceKeys, instanceKey] };
}

export function restoreClass(state: PlannerState, instanceKey: string): PlannerState {
  return {
    ...state,
    omittedInstanceKeys: state.omittedInstanceKeys.filter((k) => k !== instanceKey),
  };
}

export function isOmitted(state: PlannerState, instanceKey: string): boolean {
  return state.omittedInstanceKeys.includes(instanceKey);
}

// MARK: - Mutations — library (§37) & subjects (§38)

export function addToLibrary(
  state: PlannerState,
  input: { name: string; kind: LibraryActivity["kind"]; palette: LibraryActivity["palette"]; symbolName: string },
): { state: PlannerState; created: LibraryActivity } {
  const created: LibraryActivity = {
    id: newId("lib"),
    name: input.name,
    kind: input.kind,
    palette: input.palette,
    symbolName: input.symbolName,
    isBuiltIn: false,
    defaultDuration: 60 * 60_000,
  };
  return { state: { ...state, library: [...state.library, created] }, created };
}

export function setSubjectColor(
  state: PlannerState,
  code: string,
  color: string,
): PlannerState {
  return { ...state, subjectColors: { ...state.subjectColors, [code]: color } };
}

export type { ItemKind };
