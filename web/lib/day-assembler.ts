/**
 * Combines a day's sources — imported university events (minus per-instance
 * omissions, §14) and personal activities — into one ordered list, then hands
 * off to `buildDayTimeline` for gap computation. Port of Swift `DayAssembler`.
 */

import type { ImportedEvent, ImportedSubject } from "./university-import";
import {
  type ScheduledItem,
  type DayTimeline,
  buildDayTimeline,
} from "./scheduled-item";
import {
  settingTime,
  startOfDay,
  dayKey,
  minutesSinceMidnight,
} from "./time";

export interface DayContext {
  date: Date;
  universityEvents: ImportedEvent[];
  personalActivities: ScheduledItem[];
  /** Instance keys marked "no asistir" (§14). */
  omittedInstanceKeys: Set<string>;
}

/** Stable key identifying one class instance on one day. */
export function instanceKey(
  subjectCode: string,
  day: Date,
  startMinutes: number,
): string {
  return `${subjectCode}|${dayKey(day)}|${startMinutes}`;
}

export function makeUniversityItem(
  event: ImportedEvent,
  day: Date,
  subjects: Record<string, ImportedSubject>,
): ScheduledItem {
  const subject = event.subjectCode ? subjects[event.subjectCode] : undefined;
  const palette = subject?.color ?? "stone";
  const code = event.subjectCode ?? event.title ?? "Universidad";

  let badge: string | null = null;
  let symbol = "book";
  if (event.kind === "exam") {
    badge = `EXAMEN · ${code}`;
    symbol = "clipboard-list";
  } else if (event.kind === "practice") {
    badge = `PRÁCTICA · ${code}`;
    symbol = "flask-conical";
  }

  const start = settingTime(day, event.start);
  const end = settingTime(day, event.end);

  return {
    id: event.id,
    title: code,
    badge,
    fullTitle: subject?.fullName ?? null,
    subjectCode: event.subjectCode,
    location: event.location,
    start: start.getTime(),
    end: end.getTime(),
    kind: { type: "university", kind: event.kind },
    palette,
    symbolName: symbol,
    instanceKey: instanceKey(
      event.subjectCode ?? code,
      day,
      minutesSinceMidnight(event.start),
    ),
    isImmovable: true,
    isPinned: false,
    isCompleted: false,
  };
}

export function assembleTimeline(
  context: DayContext,
  subjects: Record<string, ImportedSubject>,
): DayTimeline {
  const day = startOfDay(context.date);

  const holiday = context.universityEvents.find(
    (e) => e.kind === "holiday" || e.kind === "vacation",
  );

  const items: ScheduledItem[] = [];

  if (!holiday) {
    for (const event of context.universityEvents) {
      if (
        event.kind !== "lecture" &&
        event.kind !== "practice" &&
        event.kind !== "exam"
      ) {
        continue;
      }
      const item = makeUniversityItem(event, day, subjects);
      if (item.instanceKey && context.omittedInstanceKeys.has(item.instanceKey)) {
        continue;
      }
      items.push(item);
    }
  }

  items.push(...context.personalActivities);
  items.sort((a, b) => a.start - b.start);

  const note = holiday
    ? holiday.title ?? (holiday.kind === "vacation" ? "Vacaciones" : "Festivo")
    : null;

  return buildDayTimeline(day, items, note);
}
