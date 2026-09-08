/**
 * Detects when a personal activity overlaps one or more university classes
 * (§15) — port of Swift `ConflictEngine`.
 *
 * Horadia *allows* the overlap to happen (the activity is placed), then offers
 * a choice: keep both, remove the class(es), or cancel.
 */

import { type ScheduledItem, itemSlot, isPersonal } from "./scheduled-item";
import { overlaps } from "./timeslot";

export interface Conflict {
  activity: ScheduledItem;
  /** The classes it now overlaps, in time order. */
  classes: ScheduledItem[];
}

export function isMultiple(c: Conflict): boolean {
  return c.classes.length > 1;
}

/** "Deporte coincide con BI" / "Deporte coincide con 2 clases" (§15). */
export function conflictSummary(c: Conflict): string {
  const first = c.classes[0];
  if (!first) return c.activity.title;
  if (c.classes.length === 1) {
    return `${c.activity.title} coincide con ${first.title}`;
  }
  return `${c.activity.title} coincide con ${c.classes.length} clases`;
}

export function conflictClassKeys(c: Conflict): string[] {
  return c.classes.flatMap((k) => (k.instanceKey ? [k.instanceKey] : []));
}

/** Returns a conflict if `activity` overlaps any class among `dayItems`. */
export function detectConflict(
  activity: ScheduledItem,
  dayItems: ScheduledItem[],
): Conflict | null {
  if (!isPersonal(activity)) return null;

  const overlapping = dayItems
    .filter(
      (item) =>
        item.kind.type === "university" &&
        overlaps(itemSlot(item), itemSlot(activity)),
    )
    .sort((a, b) => a.start - b.start);

  return overlapping.length === 0
    ? null
    : { activity, classes: overlapping };
}
