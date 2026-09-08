/**
 * The starting content for a fresh planner — port of Swift `PlannerSeed`.
 *
 * Built-in library (§37) plus Alba's synthetic personal activities for the
 * current week (Siesta routine §9, plus Deporte / Trabajo / Estudio / Pilates so
 * every day looks lived-in).
 */

import type { PastelToken } from "./palette";
import type { ItemKind, ScheduledItem } from "./scheduled-item";
import {
  type TimeOfDay,
  settingTime,
  addDays,
  startOfWeek,
  TimeGrid,
} from "./time";

export type ActivityKind = "work" | "sport" | "study" | "nap" | "custom";

export function activityScheduledKind(kind: ActivityKind): ItemKind {
  return { type: kind };
}

export interface LibraryActivity {
  id: string;
  name: string;
  kind: ActivityKind;
  palette: PastelToken;
  symbolName: string;
  isBuiltIn: boolean;
  /** Default duration in ms when dropped onto an empty stretch. */
  defaultDuration: number;
}

let counter = 0;
export function newId(prefix = "id"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export function makeItemFromLibrary(
  template: LibraryActivity,
  start: Date,
  duration?: number,
): ScheduledItem {
  const startMs = start.getTime();
  return {
    id: newId("act"),
    title: template.name,
    badge: null,
    fullTitle: null,
    start: startMs,
    end: startMs + (duration ?? template.defaultDuration),
    kind: activityScheduledKind(template.kind),
    palette: template.palette,
    symbolName: template.symbolName,
    instanceKey: null,
    isImmovable: false,
    isPinned: false,
    isCompleted: false,
  };
}

const HOUR = 3_600_000;

export function seedLibrary(): LibraryActivity[] {
  return [
    { id: "lib-trabajo", name: "Trabajo", kind: "work", palette: "sky", symbolName: "briefcase", isBuiltIn: true, defaultDuration: 4 * HOUR },
    { id: "lib-deporte", name: "Deporte", kind: "sport", palette: "mint", symbolName: "activity", isBuiltIn: true, defaultDuration: 1.5 * HOUR },
    { id: "lib-estudio", name: "Estudio", kind: "study", palette: "lavender", symbolName: "book-open", isBuiltIn: true, defaultDuration: 2 * HOUR },
    { id: "lib-siesta", name: "Siesta", kind: "nap", palette: "peach", symbolName: "moon", isBuiltIn: true, defaultDuration: 1 * HOUR },
  ];
}

function make(
  title: string,
  kind: ItemKind,
  palette: PastelToken,
  symbol: string,
  day: Date,
  from: TimeOfDay,
  to: TimeOfDay,
  pinned = false,
): ScheduledItem {
  const start = settingTime(day, from);
  const end = settingTime(day, to);
  return {
    id: newId("seed"),
    title,
    badge: null,
    fullTitle: null,
    start: start.getTime(),
    end: end.getTime(),
    kind,
    palette,
    symbolName: symbol,
    instanceKey: null,
    isImmovable: false,
    isPinned: pinned,
    isCompleted: false,
  };
}

export function seedPersonalItems(referenceDate: Date = new Date()): ScheduledItem[] {
  const monday = startOfWeek(referenceDate);
  const items: ScheduledItem[] = [];

  // Siesta routine — every weekday 16:00→17:00 (§9).
  for (let offset = 0; offset < 5; offset++) {
    const day = addDays(monday, offset);
    items.push(make("Siesta", { type: "nap" }, "peach", "moon", day, { hour: 16, minute: 0 }, { hour: 17, minute: 0 }));
  }

  items.push(make("Deporte", { type: "sport" }, "mint", "activity", monday, { hour: 18, minute: 0 }, { hour: 19, minute: 30 }));

  const wednesday = addDays(monday, 2);
  items.push(make("Trabajo", { type: "work" }, "sky", "briefcase", wednesday, { hour: 9, minute: 0 }, { hour: 13, minute: 30 }));

  const thursday = addDays(monday, 3);
  items.push(make("Estudio", { type: "study" }, "lavender", "book-open", thursday, { hour: 18, minute: 30 }, { hour: 20, minute: 30 }));

  const saturday = addDays(monday, 5);
  items.push(make("Pilates", { type: "custom" }, "lilac", "flower", saturday, { hour: 11, minute: 0 }, { hour: 12, minute: 0 }));

  return items;
}

export { TimeGrid };
