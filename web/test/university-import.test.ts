import { describe, expect, it } from "vitest";
import {
  importSchedule,
  normalizedGroup,
  subjectsByCode,
} from "@/lib/university-import";
import scheduleJson from "@/data/university-schedule.json";

describe("university import — G1 filter (§22)", () => {
  it("treats Gr1 as G1", () => {
    for (const group of ["G1", "Gr1", "GR1", "Grupo 1", "GRUPO 1", " g1 "]) {
      expect(normalizedGroup(group)).toBe("g1");
    }
  });

  it("drops every other group", () => {
    for (const g of ["G2", "G3", "G4", "Gr2", "Gr3", "Gr4", "GRUPO 4", "B", "1B"]) {
      expect(normalizedGroup(g)).toBeNull();
    }
  });

  it("keeps a practice explicitly tagged G1", () => {
    const doc = {
      meta: { schemaVersion: 1, sourceDocument: "t", provisional: true },
      subjects: [{ code: "BI", fullName: "Bioquímica", color: "mint" }],
      events: [
        { date: "2026-09-14", subject: "BI", start: "16:00", end: "19:00", type: "practice", group: "Gr1" },
        { date: "2026-09-14", subject: "BI", start: "16:00", end: "19:00", type: "practice", group: "G2" },
      ],
    };
    const result = importSchedule(doc);
    const practices = result.events.filter((e) => e.kind === "practice");
    expect(practices).toHaveLength(1);
  });
});

describe("university import — bundled seed", () => {
  const result = importSchedule(scheduleJson);

  it("is marked provisional", () => {
    expect(result.provisional).toBe(true);
  });

  it("has the five 4th-year subjects", () => {
    const codes = result.subjects.map((s) => s.code).sort();
    expect(codes).toEqual(["BI", "FFI", "FGFG", "SP", "TF II"]);
  });

  it("stops before the second term (no events in Feb 2027 or later)", () => {
    const latest = Math.max(...result.events.map((e) => e.day));
    expect(new Date(latest).getFullYear()).toBe(2027);
    expect(new Date(latest).getMonth()).toBeLessThan(1); // < February
  });

  it("Monday 2026-09-07 has FGFG / BI / TF II", () => {
    const monday = new Date(2026, 8, 7).getTime();
    const codes = result.events
      .filter((e) => e.day === monday)
      .map((e) => e.subjectCode);
    expect(codes).toEqual(expect.arrayContaining(["FGFG", "BI", "TF II"]));
  });

  it("subjectsByCode is keyed by code", () => {
    const map = subjectsByCode(result);
    expect(map["BI"].fullName).toContain("Bioquímica");
  });

  it("keeps full subject names and stable workspace identities", () => {
    const map = subjectsByCode(result);
    expect(map.FGFG.fullName).toBe("Farmacología y Farmacia Galénica");
    expect(map.BI.fullName).toBe("Bioquímica e Inmunología");
    expect(map["TF II"].fullName).toBe("Tecnología Farmacéutica II");
    expect(map.FFI.fullName).toBe("Fisiología y Fisiopatología");
    expect(map.SP.fullName).toBe("Salud Pública");
    expect(map.FFI.workspaceId).toBe("subject:FFI");
  });
});
