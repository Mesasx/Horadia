import { describe, expect, it } from "vitest";
import {
  groupAudience,
  importSchedule,
  normalizedGroup,
  subjectsByCode,
} from "@/lib/university-import";
import scheduleJson from "@/data/university-schedule.json";

describe("university import - G2 filter", () => {
  it("normalizes every supported G2 spelling", () => {
    for (const group of ["G2", "Gr2", "GR2", "Grupo 2", "GRUPO 2", " g2 "]) {
      expect(normalizedGroup(group)).toBe("g2");
    }
  });

  it("drops every other group", () => {
    for (const group of ["G1", "G3", "G4", "Gr1", "Gr3", "Gr4", "GRUPO 4", "B", "1B"]) {
      expect(normalizedGroup(group)).toBeNull();
    }
  });

  it("includes ungrouped and all-group activities", () => {
    expect(groupAudience(null)).toBe("all");
    expect(groupAudience("Todos los grupos")).toBe("all");
    expect(groupAudience("TODO EL GRUPO")).toBe("all");
    expect(groupAudience("Gr2")).toBe("g2");
    expect(groupAudience("Gr1")).toBeNull();
  });

  it("keeps G2 and all-group practices but drops G1", () => {
    const doc = {
      meta: { schemaVersion: 2, sourceDocument: "test", provisional: false },
      subjects: [{ code: "BI", fullName: "Bioquímica", color: "mint" }],
      events: [
        { date: "2026-09-14", subject: "BI", start: "16:00", end: "19:00", type: "practice", group: "Gr2" },
        { date: "2026-09-15", subject: "BI", start: "16:00", end: "19:00", type: "practice", group: "Todos los grupos" },
        { date: "2026-09-16", subject: "BI", start: "16:00", end: "19:00", type: "practice", group: "G1" },
      ],
    };
    const practices = importSchedule(doc).events.filter((event) => event.kind === "practice");
    expect(practices.map((event) => event.audience)).toEqual(["g2", "all"]);
  });
});

describe("university import - official 2026-27 DAMERO", () => {
  const result = importSchedule(scheduleJson);

  it("is marked official and covers both terms", () => {
    expect(result.provisional).toBe(false);
    expect(result.coverage).toEqual({ from: "2026-08-31", to: "2027-07-16" });
  });

  it("has all fourth-year subjects plus Alba's two third-year subjects", () => {
    const codes = result.subjects.map((subject) => subject.code).sort();
    expect(codes).toEqual([
      "AF", "B&F", "BI", "BTF", "FCG", "FF II", "FFI", "FGFG", "LGP", "SP", "TF II", "TX",
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
    expect(practices.every((event) => event.audience === "g2")).toBe(true);
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
    expect(map.FGFG.fullName).toBe("Farmacogenética y Farmacogenómica");
    expect(map.BI.fullName).toBe("Bioinformática");
    expect(map["TF II"].fullName).toBe("Tecnología Farmacéutica II");
    expect(map.FFI.fullName).toBe("Farmacología y Farmacoterapia I");
    expect(map.SP.fullName).toBe("Salud Pública");
    expect(map.BTF.fullName).toBe("Biotecnología Farmacéutica");
    expect(map.TX.fullName).toBe("Toxicología");
    expect(map.AF.fullName).toContain("Atención Farmacéutica");
    expect(map.LGP.fullName).toContain("Legislación, Gestión");
    expect(map["FF II"].fullName).toBe("Farmacología y Farmacoterapia II");
    expect(map["B&F"].fullName).toBe("Biofarmacia y Farmacocinética");
    expect(map.FCG.fullName).toBe("Farmacognosia y Fitoterapia");
    expect(map.FFI.workspaceId).toBe("subject:FFI");
  });

  it("adds every B&F and FCG event from the third-year second-term DAMERO", () => {
    const added = result.events.filter(
      (event) => event.subjectCode === "B&F" || event.subjectCode === "FCG",
    );
    expect(added).toHaveLength(64);
    expect(added.filter((event) => event.subjectCode === "B&F")).toHaveLength(32);
    expect(added.filter((event) => event.subjectCode === "FCG")).toHaveLength(32);
  });

  it("keeps only Alba's G2 intensive practices with the printed times", () => {
    const may3 = new Date(2027, 4, 3).getTime();
    const may7 = new Date(2027, 4, 7).getTime();
    const may10 = new Date(2027, 4, 10).getTime();
    const practices = result.events.filter(
      (event) =>
        (event.subjectCode === "B&F" || event.subjectCode === "FCG") &&
        event.kind === "practice",
    );
    expect(practices).toHaveLength(10);
    expect(practices.every((event) => event.audience === "g2")).toBe(true);
    expect(
      practices.find((event) => event.day === may3 && event.subjectCode === "FCG")?.end,
    ).toEqual({ hour: 13, minute: 30 });
    expect(
      practices.find((event) => event.day === may7 && event.subjectCode === "FCG")?.end,
    ).toEqual({ hour: 11, minute: 0 });
    expect(
      practices.find((event) => event.day === may10 && event.subjectCode === "B&F")?.start,
    ).toEqual({ hour: 16, minute: 0 });
  });

  it("includes both partial, ordinary and extraordinary exams", () => {
    const exams = result.events.filter(
      (event) =>
        (event.subjectCode === "B&F" || event.subjectCode === "FCG") &&
        event.kind === "exam",
    );
    expect(exams).toHaveLength(6);
    expect(exams.map((event) => event.day)).toEqual(
      ["2027-03-15", "2027-03-18", "2027-05-17", "2027-05-20", "2027-06-17", "2027-06-21"].map(
        (date) => new Date(`${date}T00:00:00`).getTime(),
      ),
    );
  });
});


describe("first-term G2 DAMERO regression", () => {
  const practices = scheduleJson.events.filter((event) => event.type === "practice" && event.date < "2027-01-01");

  it("contains the five subjects and all 28 printed sessions", () => {
    expect(practices).toHaveLength(28);
    expect([...new Set(practices.map((event) => event.subject))].sort()).toEqual(["BI", "FFI", "FGFG", "SP", "TF II"]);
    expect(practices.every((event) => /^(G2|Gr2)$/.test(event.group ?? ""))).toBe(true);
  });

  it("keeps the actual BI break and exceptional finishing time", () => {
    expect(practices.filter((event) => event.date === "2026-09-23").map((event) => [event.start, event.end]))
      .toEqual([["16:00", "18:00"], ["18:15", "20:15"]]);
    expect(practices.find((event) => event.date === "2026-10-07")?.end).toBe("13:15");
  });

  it("moves intensive weeks to G2 dates and times", () => {
    expect(practices.filter((event) => event.subject === "FFI").map((event) => [event.date, event.start, event.end])).toEqual([
      ["2026-11-16", "16:00", "20:00"], ["2026-11-17", "16:00", "20:00"],
      ["2026-11-18", "16:00", "20:00"], ["2026-11-19", "16:00", "20:00"],
      ["2026-11-20", "16:00", "20:00"],
    ]);
    expect(practices.filter((event) => event.subject === "TF II").map((event) => event.date)).toEqual([
      "2026-12-14", "2026-12-15", "2026-12-16", "2026-12-17", "2026-12-18",
    ]);
  });
});
