import { describe, expect, it } from "vitest";
import {
  groupAudience,
  importSchedule,
  normalizedGroup,
  subjectsByCode,
} from "@/lib/university-import";
import scheduleJson from "@/data/university-schedule.json";

describe("university import - G1 filter", () => {
  it("normalizes every supported G1 spelling", () => {
    for (const group of ["G1", "Gr1", "GR1", "Grupo 1", "GRUPO 1", " g1 "]) {
      expect(normalizedGroup(group)).toBe("g1");
    }
  });

  it("drops every other group", () => {
    for (const group of ["G2", "G3", "G4", "Gr2", "Gr3", "Gr4", "GRUPO 4", "B", "1B"]) {
      expect(normalizedGroup(group)).toBeNull();
    }
  });

  it("includes ungrouped and all-group activities", () => {
    expect(groupAudience(null)).toBe("all");
    expect(groupAudience("Todos los grupos")).toBe("all");
    expect(groupAudience("TODO EL GRUPO")).toBe("all");
    expect(groupAudience("Gr1")).toBe("g1");
    expect(groupAudience("Gr2")).toBeNull();
  });

  it("keeps G1 and all-group practices but drops G2", () => {
    const doc = {
      meta: { schemaVersion: 2, sourceDocument: "test", provisional: false },
      subjects: [{ code: "BI", fullName: "Bioquímica", color: "mint" }],
      events: [
        { date: "2026-09-14", subject: "BI", start: "16:00", end: "19:00", type: "practice", group: "Gr1" },
        { date: "2026-09-15", subject: "BI", start: "16:00", end: "19:00", type: "practice", group: "Todos los grupos" },
        { date: "2026-09-16", subject: "BI", start: "16:00", end: "19:00", type: "practice", group: "G2" },
      ],
    };
    const practices = importSchedule(doc).events.filter((event) => event.kind === "practice");
    expect(practices.map((event) => event.audience)).toEqual(["g1", "all"]);
  });
});

describe("university import - official 2026-27 DAMERO", () => {
  const result = importSchedule(scheduleJson);

  it("is marked official and covers both terms", () => {
    expect(result.provisional).toBe(false);
    expect(result.coverage).toEqual({ from: "2026-08-31", to: "2027-07-16" });
  });

  it("has all ten fourth-year subjects", () => {
    const codes = result.subjects.map((subject) => subject.code).sort();
    expect(codes).toEqual([
      "AF", "BI", "BTF", "FF II", "FFI", "FGFG", "LGP", "SP", "TF II", "TX",
    ]);
  });

  it("includes the second term and the July extraordinary exam", () => {
    const july2 = new Date(2027, 6, 2).getTime();
    expect(
      result.events.some(
        (event) => event.day === july2 && event.subjectCode === "FF II" && event.kind === "exam",
      ),
    ).toBe(true);
  });

  it("matches the official row for Monday 2026-09-07", () => {
    const monday = new Date(2026, 8, 7).getTime();
    const codes = result.events
      .filter((event) => event.day === monday)
      .map((event) => event.subjectCode);
    expect(codes).toEqual(["FFI", "BI", "SP"]);
  });

  it("keeps only Alba's intensive practice on 2027-03-08", () => {
    const march8 = new Date(2027, 2, 8).getTime();
    const practices = result.events.filter(
      (event) => event.day === march8 && event.kind === "practice",
    );
    expect(practices.map((event) => event.subjectCode)).toEqual(["BTF"]);
    expect(practices.every((event) => event.audience === "g1")).toBe(true);
  });

  it("includes practices scheduled for all groups", () => {
    const feb8 = new Date(2027, 1, 8).getTime();
    const practice = result.events.find(
      (event) => event.day === feb8 && event.subjectCode === "LGP" && event.kind === "practice",
    );
    expect(practice?.audience).toBe("all");
  });

  it("keeps full names and stable workspace identities", () => {
    const map = subjectsByCode(result);
    expect(map.FGFG.fullName).toBe("Farmacología y Farmacia Galénica");
    expect(map.BI.fullName).toBe("Bioquímica e Inmunología");
    expect(map["TF II"].fullName).toBe("Tecnología Farmacéutica II");
    expect(map.FFI.fullName).toBe("Fisiología y Fisiopatología");
    expect(map.SP.fullName).toBe("Salud Pública");
    expect(map.BTF.fullName).toBe("Biotecnología Farmacéutica");
    expect(map.TX.fullName).toBe("Toxicología");
    expect(map.AF.fullName).toContain("Atención Farmacéutica");
    expect(map.LGP.fullName).toContain("Legislación, Gestión");
    expect(map["FF II"].fullName).toBe("Farmacología y Farmacoterapia II");
    expect(map.FFI.workspaceId).toBe("subject:FFI");
  });
});
