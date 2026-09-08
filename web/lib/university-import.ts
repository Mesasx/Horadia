/**
 * Decodes the bundled `university-schedule.json` into value types, applying the
 * G1 practice-group filter (§22) — port of the Swift `UniversityScheduleImporter`.
 *
 * The JSON is a *seed* derived from the standard weekly pattern until the real
 * DAMERO is imported; every row is materialised explicitly by date, never by
 * recurrence (§23).
 */

import type { PastelToken } from "./palette";
import { PASTEL_TOKENS } from "./palette";
import type { UniversityEventKind } from "./scheduled-item";
import {
  type TimeOfDay,
  parseTimeOfDay,
  parseDayKey,
  minutesSinceMidnight,
} from "./time";

interface RawDoc {
  meta: { schemaVersion: number; sourceDocument: string; provisional: boolean; practiceGroup?: string; coverage?: { from: string; to: string } };
  subjects: { code: string; fullName: string; color: string }[];
  events: RawEvent[];
}

interface RawEvent {
  date: string;
  subject?: string | null;
  start: string;
  end?: string | null;
  type: string;
  group?: string | null;
  location?: string | null;
  title?: string | null;
}

export interface ImportedSubject {
  code: string;
  fullName: string;
  color: PastelToken;
}

export interface ImportedEvent {
  id: string;
  /** epoch ms, start of day */
  day: number;
  subjectCode: string | null;
  start: TimeOfDay;
  end: TimeOfDay;
  kind: UniversityEventKind;
  location: string | null;
  title: string | null;
}

export interface ImportResult {
  subjects: ImportedSubject[];
  events: ImportedEvent[];
  provisional: boolean;
  coverage?: { from: string; to: string };
}

/**
 * Normalises raw group strings from the DAMERO ("G1", "Gr1", "GRUPO 1", …).
 * Returns `"g1"` only when the group is Alba's; `null` for G2/G3/G4/Gr2… (§22).
 */
export function normalizedGroup(raw: string | null | undefined): "g1" | null {
  if (raw == null) return null;
  const cleaned = raw
    .toUpperCase()
    .replaceAll("GRUPO", "G")
    .replaceAll("GR", "G")
    .replaceAll(" ", "");
  return cleaned === "G1" ? "g1" : null;
}

function mapKind(raw: string): UniversityEventKind | null {
  switch (raw.toLowerCase()) {
    case "lecture":
    case "clase":
      return "lecture";
    case "practice":
    case "practica":
    case "práctica":
      return "practice";
    case "exam":
    case "examen":
      return "exam";
    case "holiday":
    case "festivo":
      return "holiday";
    case "vacation":
    case "vacaciones":
      return "vacation";
    default:
      return null;
  }
}

export function importSchedule(doc: unknown): ImportResult {
  const raw = doc as RawDoc;

  const subjects: ImportedSubject[] = raw.subjects.map((s) => ({
    code: s.code,
    fullName: s.fullName,
    color: (PASTEL_TOKENS as string[]).includes(s.color)
      ? (s.color as PastelToken)
      : "stone",
  }));

  const events: ImportedEvent[] = [];
  for (let i = 0; i < raw.events.length; i++) {
    const dto = raw.events[i];

    // §22: only load practices for Alba's group. A non-null group that does not
    // normalise to G1 is skipped entirely.
    if (dto.group != null && normalizedGroup(dto.group) === null) continue;

    const day = parseDayKey(dto.date);
    if (!day) throw new Error(`bad date ${dto.date}`);

    const start = parseTimeOfDay(dto.start);
    if (!start) throw new Error(`bad start ${dto.start}`);

    // Exams may omit `end` (§24) → default to a 90-minute block.
    let end = dto.end ? parseTimeOfDay(dto.end) : null;
    if (!end) {
      const total = minutesSinceMidnight(start) + 90;
      end = { hour: Math.min(23, Math.floor(total / 60)), minute: total % 60 };
    }

    const kind = mapKind(dto.type);
    if (!kind) throw new Error(`unknown type ${dto.type}`);

    events.push({
      id: `evt-${dto.date}-${dto.subject ?? dto.type}-${dto.start}-${i}`,
      day: day.getTime(),
      subjectCode: dto.subject ?? null,
      start,
      end,
      kind,
      location: dto.location ?? null,
      title: dto.title ?? null,
    });
  }

  return {
    subjects,
    events,
    provisional: raw.meta.provisional,
    coverage: raw.meta.coverage,
  };
}

export function subjectsByCode(
  result: ImportResult,
): Record<string, ImportedSubject> {
  const map: Record<string, ImportedSubject> = {};
  for (const s of result.subjects) if (!(s.code in map)) map[s.code] = s;
  return map;
}
