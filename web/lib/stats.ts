/**
 * Aggregates timelines into per-category time totals (§35) — port of Swift
 * `StatsEngine`. Pure function of `DayTimeline[]` → totals.
 */

import type { PastelToken } from "./palette";
import type { DayTimeline, ItemKind } from "./scheduled-item";
import { duration as slotDuration } from "./timeslot";
import { itemSlot } from "./scheduled-item";

export type StatCategory =
  | "university"
  | "work"
  | "study"
  | "sport"
  | "nap"
  | "free";

export const STAT_CATEGORIES: StatCategory[] = [
  "university",
  "work",
  "study",
  "sport",
  "nap",
  "free",
];

export const STAT_CATEGORY_NAME: Record<StatCategory, string> = {
  university: "Universidad",
  work: "Trabajo",
  study: "Estudio",
  sport: "Deporte",
  nap: "Siesta",
  free: "Libre",
};

export const STAT_CATEGORY_PALETTE: Record<StatCategory, PastelToken> = {
  university: "periwinkle",
  work: "sky",
  study: "lavender",
  sport: "mint",
  nap: "peach",
  free: "stone",
};

export function categoryForKind(kind: ItemKind): StatCategory | null {
  switch (kind.type) {
    case "university":
      return kind.kind === "lecture" ||
        kind.kind === "practice" ||
        kind.kind === "exam"
        ? "university"
        : null;
    case "work":
      return "work";
    case "study":
      return "study";
    case "sport":
      return "sport";
    case "nap":
      return "nap";
    default:
      return null;
  }
}

export interface StatTotals {
  /** Milliseconds per category. */
  byCategory: Partial<Record<StatCategory, number>>;
  /** University time that was scheduled but omitted (§14, §35). */
  universityOmittedMs: number;
}

export function computeTotals(timelines: DayTimeline[]): StatTotals {
  const byCategory: Partial<Record<StatCategory, number>> = {};

  for (const timeline of timelines) {
    for (const block of timeline.blocks) {
      if (block.kind === "free") {
        byCategory.free = (byCategory.free ?? 0) + slotDuration(block.slot);
      } else {
        const category = categoryForKind(block.item.kind);
        if (!category) continue;
        byCategory[category] =
          (byCategory[category] ?? 0) + slotDuration(itemSlot(block.item));
      }
    }
  }

  return { byCategory, universityOmittedMs: 0 };
}

export function hoursOf(totals: StatTotals, category: StatCategory): number {
  return (totals.byCategory[category] ?? 0) / 3_600_000;
}
