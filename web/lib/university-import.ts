/**
 * Decodes the bundled `university-schedule.json` into value types, applying the
 * G1 practice-group filter (§22) — port of the Swift `UniversityScheduleImporter`.
 *
 * The JSON is generated from the three official 2026-27 DAMERO documents; every
 * row is materialised explicitly by date, never as a runtime recurrence.
 */

import type { PastelToken } from "./palette";
import { PASTEL_TOKENS } from "./palette";
import type { UniversityEventKind } from "./scheduled-item";
import { subjectWorkspace } from "./subject-workspace";
import {
  type TimeOfDay,
  parseTimeOfDay,
  parseDayKey,
  minutesSinceMidnight,
} from "./time";

interface RawDoc {
  meta: { schemaVersion: number; sourceDocument: string; sourceFiles?: string[]; provisional: boolean; practiceGroup?: string; coverage?: { from: string; to: string } };
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
  /** Stable relation to the subject's future notes/tasks/files workspace. */
  workspaceId: string;
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
  audience: "all" | "g1";
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
  const match = /^G(?:R|RUPO)?\s*([1-4])$/i.exec(raw.trim());
  return match?.[1] === "1" ? "g1" : null;
}

/** Whether an official row applies to Alba: ungrouped/all-group or G1. */
export function groupAudience(
  raw: string | null | undefined,
): "all" | "g1" | null {
  if (raw == null || raw.trim() === "") return "all";
  const compact = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  if (/^TODOS? (?:(?:LOS|EL) )?GRUPOS?$/.test(compact)) return "all";
  return normalizedGroup(raw);
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
    workspaceId: subjectWorkspace(s.code).id,
    color: (PASTEL_TOKENS as string[]).includes(s.color)
      ? (s.color as PastelToken)
      : "stone",
  }));

  const events: ImportedEvent[] = [];
  for (const dto of raw.events) {

    // Only rows for G1 or all groups apply to Alba. Other groups are discarded.
    const audience = groupAudience(dto.group);
    if (audience === null) continue;

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
      id: `evt-${dto.date}-${dto.subject ?? dto.type}-${dto.start}-${dto.type}`
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-"),
      day: day.getTime(),
      subjectCode: dto.subject ?? null,
      start,
      end,
      kind,
      location: dto.location ?? null,
      title: dto.title ?? null,
      audience,
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
