/**
 * `ScheduledItem` — the flattened value type that views and the timeline builder
 * consume (port of Swift `ScheduledItem` / `TimelineBlock` / `DayTimeline`).
 *
 * A `ScheduledItem` never touches persistence directly; the store projects the
 * stored models into these.
 */

import type { PastelToken } from "./palette";
import { freeTimeLayout, standardDayBounds } from "./freetime";
import { type TimeSlot, clamped, duration as slotDuration } from "./timeslot";
import { startOfDay } from "./time";

export type UniversityEventKind =
  | "lecture"
  | "practice"
  | "exam"
  | "holiday"
  | "vacation";

export type ItemKind =
  | { type: "university"; kind: UniversityEventKind }
  | { type: "work" }
  | { type: "sport" }
  | { type: "study" }
  | { type: "nap" }
  | { type: "custom" }
  | { type: "externalCalendar" };

export function isPersonalKind(kind: ItemKind): boolean {
  switch (kind.type) {
    case "university":
    case "externalCalendar":
      return false;
    default:
      return true;
  }
}

/** Non-colour accessibility differentiator (§45): a short noun. */
export function accessibilityCategory(kind: ItemKind): string {
  if (kind.type === "university") {
    switch (kind.kind) {
      case "lecture":
        return "Clase";
      case "practice":
        return "Práctica";
      case "exam":
        return "Examen";
      case "holiday":
        return "Festivo";
      case "vacation":
        return "Vacaciones";
    }
  }
  switch (kind.type) {
    case "work":
      return "Trabajo";
    case "sport":
      return "Deporte";
    case "study":
      return "Estudio";
    case "nap":
      return "Siesta";
    case "custom":
      return "Actividad";
    case "externalCalendar":
      return "Calendario";
    default:
      return "Actividad";
  }
}

export interface ScheduledItem {
  id: string;
  /** Compact label shown on the card (e.g. the subject code `"BI"`). */
  title: string;
  /** Optional line shown above the title, e.g. `"EXAMEN · BI"` (§25). */
  badge?: string | null;
  /** Full name for screen readers / detail views when `title` is an abbreviation. */
  fullTitle?: string | null;
  /** epoch ms */
  start: number;
  /** epoch ms */
  end: number;
  kind: ItemKind;
  palette: PastelToken;
  /** Lucide icon name. */
  symbolName: string;
  /** Stable key for a university instance, to omit/restore one class (§14). */
  instanceKey?: string | null;
  /** University lectures: can be lifted visually but never re-timed (§14). */
  isImmovable?: boolean;
  /** Locked against accidental drags until explicitly unlocked (§17). */
  isPinned?: boolean;
  /** Optional "done" mark for personal activities (§20). */
  isCompleted?: boolean;
}

export function itemSlot(item: ScheduledItem): TimeSlot {
  return { start: item.start, end: item.end };
}

export function itemDuration(item: ScheduledItem): number {
  return slotDuration(itemSlot(item));
}

export function isPersonal(item: ScheduledItem): boolean {
  return isPersonalKind(item.kind);
}

// MARK: - Timeline

export type TimelineBlock =
  | { kind: "item"; id: string; item: ScheduledItem }
  | { kind: "free"; id: string; slot: TimeSlot };

export function blockStart(b: TimelineBlock): number {
  return b.kind === "item" ? b.item.start : b.slot.start;
}
export function blockEnd(b: TimelineBlock): number {
  return b.kind === "item" ? b.item.end : b.slot.end;
}

export interface DayTimeline {
  /** epoch ms, start of day */
  date: number;
  /** Effective top of the timeline (09:00, or earlier if an activity beats it). */
  start: number;
  /** Bottom of the timeline (00:00 next day). */
  end: number;
  blocks: TimelineBlock[];
  /** A discreet note shown at the top on holidays / vacation days (§26). */
  dayNote?: string | null;
}

export function timelineItems(t: DayTimeline): ScheduledItem[] {
  return t.blocks.flatMap((b) => (b.kind === "item" ? [b.item] : []));
}

/**
 * Builds a laid-out day from an ordered list of items (already filtered for
 * omitted classes / holidays by the assembler).
 */
export function buildDayTimeline(
  date: Date,
  activities: ScheduledItem[],
  dayNote?: string | null,
): DayTimeline {
  const bounds = standardDayBounds(date);
  const layout = freeTimeLayout(
    activities.map(itemSlot),
    bounds,
  );

  const window: TimeSlot = { start: layout.effectiveStart, end: layout.end };
  const itemBlocks: TimelineBlock[] = activities.flatMap((item) => {
    const visible = clamped(itemSlot(item), window);
    if (!visible) return [];
    return [
      {
        kind: "item" as const,
        id: `item-${item.id}`,
        item: { ...item, start: visible.start, end: visible.end },
      },
    ];
  });
  const freeBlocks: TimelineBlock[] = layout.freeSlots.map((s) => ({
    kind: "free" as const,
    id: `free-${s.start}`,
    slot: s,
  }));

  const blocks = [...itemBlocks, ...freeBlocks].sort(
    (a, b) => blockStart(a) - blockStart(b),
  );

  return {
    date: startOfDay(date).getTime(),
    start: layout.effectiveStart,
    end: layout.end,
    blocks,
    dayNote: dayNote ?? null,
  };
}
