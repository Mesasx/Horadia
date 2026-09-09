/**
 * Builds the checked-in schedule from the three official 2026-27 DAMERO PDFs.
 * Every generated date is explicitly present in those documents. This is not
 * a recurrence engine: week helpers only reduce transcription repetition.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const output = fileURLToPath(
  new URL("../data/university-schedule.json", import.meta.url),
);

const subjects = [
  { code: "FGFG", fullName: "Farmacología y Farmacia Galénica", color: "sky" },
  { code: "BI", fullName: "Bioquímica e Inmunología", color: "mint" },
  { code: "TF II", fullName: "Tecnología Farmacéutica II", color: "lavender" },
  { code: "FFI", fullName: "Fisiología y Fisiopatología", color: "apricot" },
  { code: "SP", fullName: "Salud Pública", color: "rose" },
  { code: "BTF", fullName: "Biotecnología Farmacéutica", color: "butter" },
  { code: "TX", fullName: "Toxicología", color: "peach" },
  {
    code: "AF",
    fullName: "Atención Farmacéutica y Técnicas de Comunicación",
    color: "lilac",
  },
  {
    code: "LGP",
    fullName: "Legislación, Gestión y Planificación Farmacéutica",
    color: "seafoam",
  },
  { code: "FF II", fullName: "Farmacología y Farmacoterapia II", color: "sage" },
  { code: "B&F", fullName: "Biofarmacia y Farmacocinética", color: "mauve" },
  { code: "FCG", fullName: "Farmacognosia y Fitoterapia", color: "citron" },
];

const events = [];
const times = [
  ["09:00", "10:30"],
  ["10:45", "12:15"],
  ["12:30", "14:00"],
];

function addDays(date, amount) {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

function addEvent({
  date,
  subject = null,
  start = "00:00",
  end = "23:59",
  type,
  group = null,
  location = null,
  title = null,
  source,
}) {
  events.push({ date, subject, start, end, type, group, location, title, source });
}

function lectureDay(date, codes, source) {
  codes.forEach((subject, index) =>
    addEvent({ date, subject, start: times[index][0], end: times[index][1], type: "lecture", source }),
  );
}

function selectedLectureDay(date, codes, source) {
  codes.forEach((subject, index) => {
    if (!subject) return;
    addEvent({
      date,
      subject,
      start: times[index][0],
      end: times[index][1],
      type: "lecture",
      source,
    });
  });
}

const firstStandard = [
  ["FGFG", "BI", "TF II"],
  ["FFI", "SP", "BI"],
  ["SP", "TF II", "FGFG"],
  ["BI", "FFI", "SP"],
  ["TF II", "FGFG", "FFI"],
];

const secondStandard = [
  ["AF", "LGP", "BTF"],
  ["BTF", "AF", "TX"],
  ["LGP", "TX", "FF II"],
  ["FF II", "BTF", "AF"],
  ["TX", "FF II", "LGP"],
];

function lectureWeek(monday, matrix, source, dayIndexes = [0, 1, 2, 3, 4]) {
  dayIndexes.forEach((index) => lectureDay(addDays(monday, index), matrix[index], source));
}

function practice(date, subject, start, end, group, location, title, source) {
  addEvent({ date, subject, start, end, type: "practice", group, location, title, source });
}

function exam(date, subject, start, location, source) {
  addEvent({ date, subject, start, end: null, type: "exam", location, source });
}

function holiday(date, title, source, type = "holiday") {
  addEvent({ date, type, title, source });
}

function vacation(from, to, title, source) {
  for (let date = from; date <= to; date = addDays(date, 1)) {
    holiday(date, title, source, "vacation");
  }
}

const C1 = "official-damero-1c";
const C2 = "official-damero-2c";
const C3_2C = "official-damero-third-2c";

// 1C: lectures exactly as printed on pages 1-12.
lectureDay("2026-09-04", ["FGFG", "BI", "TF II"], C1);
lectureDay("2026-09-07", ["FFI", "BI", "SP"], C1);
holiday("2026-09-08", "Festivo", C1);
lectureDay("2026-09-09", firstStandard[2], C1);
lectureDay("2026-09-10", firstStandard[3], C1);
lectureDay("2026-09-11", firstStandard[4], C1);
lectureWeek("2026-09-14", firstStandard, C1);
lectureWeek("2026-09-21", firstStandard, C1);
lectureWeek("2026-09-28", firstStandard, C1);
lectureDay("2026-10-05", firstStandard[0], C1);
holiday("2026-10-12", "Fiesta", C1);
lectureDay("2026-10-26", firstStandard[0], C1);
lectureDay("2026-10-27", ["SP", "FFI", "BI"], C1);
lectureDay("2026-10-28", firstStandard[2], C1);
lectureDay("2026-10-29", firstStandard[3], C1);
lectureDay("2026-10-30", firstStandard[4], C1);
holiday("2026-11-02", "Fiesta", C1);
lectureDay("2026-11-03", ["FFI", "SP", "BI"], C1);
lectureDay("2026-11-04", ["FGFG", "TF II", "SP"], C1);
lectureDay("2026-11-05", ["BI", "FFI", "SP"], C1);
lectureDay("2026-11-06", ["TF II", "FGFG", "BI"], C1);
lectureWeek("2026-11-09", firstStandard, C1);
lectureDay("2026-11-16", firstStandard[0], C1);
lectureDay("2026-11-17", firstStandard[1], C1);
lectureDay("2026-11-18", ["FGFG", "SP", "SP"], C1);
lectureDay("2026-11-19", ["BI", "FFI", "TF II"], C1);
lectureDay("2026-11-20", firstStandard[4], C1);

// 1C: G1 and all-group practices only.
practice("2026-09-23", "FGFG", "16:00", "20:00", "G1", "FarmaLab I", "P1", C1);
practice("2026-09-28", "BI", "16:00", "20:15", "G1", "Aula Informática I", "P_1E y P_2E", C1);
practice("2026-09-29", "BI", "16:00", "18:00", "G1", "Aula Informática I", "P_3E", C1);
practice("2026-10-02", "SP", "16:00", "20:00", "G1", "Aula Informática II", "P1", C1);
practice("2026-10-06", "BI", "09:00", "13:15", "G1", "Aula Informática I", "P_4y5 E", C1);
practice("2026-10-07", "SP", "09:00", "13:00", "G1", "Aula Informática II", "P2", C1);
practice("2026-10-08", "FGFG", "09:00", "13:00", "G1", "FarmaLab I", "P2A", C1);
practice("2026-10-09", "FGFG", "09:00", "13:00", "G1", "FarmaLab I", "P2B", C1);
practice("2026-11-04", "SP", "16:00", "20:00", "G1", "QuimiLab II", "P3", C1);
practice("2026-11-09", "SP", "16:00", "20:00", "G1", "Aula Informática II / QuimiLab II", "P4", C1);
practice("2026-11-10", "FGFG", "16:00", "20:00", "G1", "FarmaLab I", "P3A", C1);
practice("2026-11-12", "FGFG", "16:00", "20:00", "G1", "FarmaLab I", "P3B", C1);
for (let index = 0; index < 5; index += 1) {
  practice(addDays("2026-11-23", index), "TF II", "09:00", "13:00", "Gr1", "TecnoLab", null, C1);
}
practice("2026-11-30", "BI", "09:00", "11:00", "G1", "Aula Informática I", "P_1MV", C1);
practice("2026-12-01", "BI", "09:00", "11:00", "G1", "Aula Informática I", "P_2MV", C1);
practice("2026-12-02", "BI", "09:00", "11:00", "G1", "Aula Informática I", "P_3MV", C1);
practice("2026-12-03", "BI", "09:00", "13:00", "G1", "Aula Informática I", "P_4y5MV", C1);
practice("2026-12-01", "SP", "16:00", "20:00", "G1", "Aula Informática II", "P5", C1);
[
  ["2026-12-14", "Aula Informática II / FarmaLab II"],
  ["2026-12-15", "Aula Informática II / FarmaLab II"],
  ["2026-12-16", "FarmaLab II"],
  ["2026-12-17", "Aula Informática II / FarmaLab II"],
  ["2026-12-18", "Aula de clase / FarmaLab II"],
].forEach(([date, location]) => practice(date, "FFI", "09:00", "13:00", "Gr1", location, null, C1));

// 1C: partial and ordinary exams, plus closures shown in the DAMERO.
exam("2026-10-13", "FFI", "09:00", "Aulas 1-2, 5 y 6", C1);
exam("2026-10-16", "SP", "09:00", "Aulas 3, 5 y Seminario II", C1);
exam("2026-10-19", "TF II", "09:00", "Aulas 4, 5 y 6", C1);
exam("2026-10-21", "FGFG", "16:00", "Aulas 1-2, 5 y 6", C1);
exam("2026-10-23", "BI", "16:00", "Aulas 1-2, 5 y 6", C1);
holiday("2026-12-07", "Festivo del centro", C1);
holiday("2026-12-08", "Festivo", C1);
exam("2026-12-09", "BI", "16:00", "Aulas 4, 6 y Seminario II", C1);
exam("2026-12-11", "FGFG", "16:00", "Aulas 1-2, 3 y 4", C1);
exam("2026-12-22", "TF II", "16:00", "Aulas 3, 4 y 6", C1);
vacation("2026-12-24", "2027-01-07", "Navidad", C1);
exam("2027-01-11", "FFI", "16:00", "Aulas 1-2, 5 y 6", C1);
exam("2027-01-14", "SP", "16:00", "Aulas 1-2, 4 y 5", C1);
exam("2027-01-18", "FGFG", "16:00", "Aulas 4, 5 y 6", C1);
exam("2027-01-20", "BI", "16:00", "Aulas 1, 2 y 5", C1);

// 2C: lectures exactly as printed on pages 1-5 and 13-17.
lectureDay("2027-01-21", secondStandard[3], C2);
lectureDay("2027-01-22", secondStandard[4], C2);
holiday("2027-01-25", "Festividad de Santo Tomás de Aquino", C2);
lectureWeek("2027-01-25", secondStandard, C2, [1, 2, 3, 4]);
lectureWeek("2027-02-01", secondStandard, C2, [0, 1, 2, 4]);
lectureWeek("2027-02-08", secondStandard, C2);
lectureWeek("2027-02-15", secondStandard, C2);
lectureDay("2027-04-13", secondStandard[1], C2);
lectureDay("2027-04-14", secondStandard[2], C2);
lectureDay("2027-04-15", secondStandard[3], C2);
lectureDay("2027-04-16", ["BTF", "FF II", "LGP"], C2);
lectureWeek("2027-04-19", secondStandard, C2);
lectureWeek("2027-04-26", secondStandard, C2, [0, 1, 2, 3]);
lectureDay("2027-05-03", ["AF", "LGP", "BTF"], C2);
lectureDay("2027-05-04", ["BTF", "AF", "FF II"], C2);
lectureDay("2027-05-05", ["LGP", "FF II", "AF"], C2);
lectureDay("2027-05-06", ["FF II", "BTF", "LGP"], C2);
lectureDay("2027-05-10", ["AF", "LGP", "FF II"], C2);
lectureDay("2027-05-11", ["LGP", "TX", "TX"], C2);
lectureDay("2027-05-12", ["TX", "TX", "TX"], C2);

// 2C: G1 and all-group practices/workshops only.
practice("2027-02-04", "TX", "09:00", "12:15", "Todos los grupos", "Visita al Toxicológico", "P1", C2);
addEvent({ date: "2027-01-28", start: "16:00", end: "20:00", type: "lecture", title: "Workshop Investigación", source: C2 });
practice("2027-02-08", "LGP", "16:00", "20:00", "Todos los grupos", "Mediateca", "P1", C2);
practice("2027-02-09", "TX", "16:00", "20:00", "Gr1", "InstrumentaLab", "P2", C2);
practice("2027-02-15", "LGP", "16:00", "20:00", "Todos los grupos", "Mediateca", "P2", C2);
practice("2027-02-19", "TX", "16:00", "20:00", "Gr1", "InstrumentaLab", "P3", C2);
practice("2027-03-02", "TX", "09:00", "13:00", "G1", "InstrumentaLab", "P4", C2);
practice("2027-03-03", "TX", "09:00", "13:00", "G1", "InstrumentaLab", "P5", C2);
practice("2027-03-05", "LGP", "09:00", "13:00", "Gr1", "Aula Informática I", "P3", C2);
for (let index = 0; index < 5; index += 1) {
  practice(addDays("2027-03-08", index), "BTF", "09:00", "13:00", "G1", "TecnoLab", null, C2);
  practice(addDays("2027-03-15", index), "AF", "09:00", "13:00", "Gr1", "Aula Informática II", null, C2);
  practice(addDays("2027-04-05", index), "FF II", "09:00", "13:00", "Gr1", "FarmaLab I", null, C2);
}
addEvent({ date: "2027-03-19", start: "16:00", end: "20:00", type: "lecture", title: "Actividad del centro", source: C2 });
practice("2027-05-03", "LGP", "16:00", "20:00", "Gr1", "Aula Informática II", "P4", C2);
practice("2027-05-13", "LGP", "09:00", "13:00", "Gr1", "Aula Informática II", "P5", C2);

// 2C: vacations, holidays, partial, ordinary and extraordinary exams.
exam("2027-02-22", "LGP", "16:00", "Aulas 1-2, 5 y 6", C2);
exam("2027-02-26", "AF", "12:00", "Aulas 1-2, 3 y 5", C2);
vacation("2027-03-22", "2027-03-26", "Semana Santa", C2);
holiday("2027-03-29", "Festivo", C2);
exam("2027-03-30", "BTF", "09:00", "Aulas 3, Espejo y Seminario II", C2);
exam("2027-04-02", "TX", "09:00", "Aulas 3, Espejo y Seminario II", C2);
exam("2027-04-12", "FF II", "16:00", "Aulas 1-2, 5 y 6", C2);
exam("2027-05-18", "FF II", "16:00", "Aulas 1-2 y 5", C2);
exam("2027-05-21", "LGP", "16:00", "Aulas 1-2 y 5", C2);
exam("2027-05-24", "BTF", "16:00", "Aulas 1-2 y 5", C2);
exam("2027-05-26", "AF", "16:00", "Aulas 1-2 y 5", C2);
holiday("2027-05-27", "Festivo (Corpus)", C2);
holiday("2027-05-31", "Día de Castilla-La Mancha", C2);
exam("2027-06-01", "TX", "16:00", "Aulas 1-2 y 5", C2);
exam("2027-06-03", "SP", "16:00", "Aula 5", C2);
exam("2027-06-08", "FFI", "16:00", "Aula 5", C2);
exam("2027-06-10", "BI", "16:00", "Aula 5", C2);
exam("2027-06-14", "FGFG", "16:00", "Aula 5", C2);
exam("2027-06-16", "TF II", "16:00", "Aula 5", C2);
exam("2027-06-18", "LGP", "16:00", "Aula 5", C2);
exam("2027-06-22", "TX", "16:00", "Aula 5", C2);
holiday("2027-06-24", "San Juan", C2);
exam("2027-06-28", "BTF", "16:00", "Aula 5", C2);
exam("2027-06-30", "AF", "16:00", "Aula 5", C2);
exam("2027-07-02", "FF II", "09:00", "Aula 5", C2);

// 3rd-year 2C: Alba also attends B&F and FCG. Lectures are transcribed
// explicitly because the official timetable changes around partials and breaks.
const thirdSelectedStandard = [
  ["FCG", "B&F", null],
  [null, null, null],
  ["B&F", "FCG", null],
  ["FCG", null, "B&F"],
  [null, null, null],
];

selectedLectureDay("2027-01-20", thirdSelectedStandard[2], C3_2C);
selectedLectureDay("2027-01-21", thirdSelectedStandard[3], C3_2C);
["2027-01-27", "2027-02-03", "2027-02-10"].forEach((date) =>
  selectedLectureDay(date, thirdSelectedStandard[2], C3_2C),
);
["2027-01-28", "2027-02-04", "2027-02-11"].forEach((date) =>
  selectedLectureDay(date, thirdSelectedStandard[3], C3_2C),
);
["2027-02-01", "2027-02-08"].forEach((date) =>
  selectedLectureDay(date, thirdSelectedStandard[0], C3_2C),
);

selectedLectureDay("2027-02-15", ["FCG", "B&F", null], C3_2C);
selectedLectureDay("2027-02-16", [null, null, "B&F"], C3_2C);
selectedLectureDay("2027-02-17", [null, "FCG", null], C3_2C);
selectedLectureDay("2027-02-18", [null, null, "B&F"], C3_2C);

selectedLectureDay("2027-03-31", thirdSelectedStandard[2], C3_2C);
selectedLectureDay("2027-04-01", thirdSelectedStandard[3], C3_2C);
selectedLectureDay("2027-04-02", ["FCG", null, null], C3_2C);
["2027-04-12", "2027-04-19", "2027-04-26"].forEach((monday) => {
  selectedLectureDay(monday, thirdSelectedStandard[0], C3_2C);
  selectedLectureDay(addDays(monday, 2), thirdSelectedStandard[2], C3_2C);
  selectedLectureDay(addDays(monday, 3), thirdSelectedStandard[3], C3_2C);
});

// 3rd-year 2C: only Alba's G1 intensive practices.
for (let index = 0; index < 4; index += 1) {
  practice(addDays("2027-05-03", index), "FCG", "09:00", "13:30", "G1", "Biolab I", null, C3_2C);
}
practice("2027-05-07", "FCG", "09:00", "11:00", "G1", "Biolab I", null, C3_2C);
for (let index = 0; index < 5; index += 1) {
  practice(addDays("2027-05-10", index), "B&F", "16:00", "20:00", "G1", "TecnoLab I y Aula 5", null, C3_2C);
}

// 3rd-year 2C: partial, ordinary and extraordinary exams for Alba's subjects.
exam("2027-03-15", "B&F", "16:00", "Aulas 1-2, Aula de estudio y Seminario II", C3_2C);
exam("2027-03-18", "FCG", "16:00", "Aulas 1-2, 5 y 6", C3_2C);
exam("2027-05-17", "B&F", "16:00", "Aulas 1-2, 5 y 6", C3_2C);
exam("2027-05-20", "FCG", "16:00", "Aulas 1-2, 5 y 6", C3_2C);
exam("2027-06-17", "B&F", "16:00", "Aulas 1-2", C3_2C);
exam("2027-06-21", "FCG", "16:00", "Aulas 1-2", C3_2C);

const kindOrder = { vacation: 0, holiday: 1, lecture: 2, practice: 3, exam: 4 };
events.sort(
  (a, b) =>
    a.date.localeCompare(b.date) ||
    a.start.localeCompare(b.start) ||
    kindOrder[a.type] - kindOrder[b.type] ||
    (a.subject ?? a.title ?? "").localeCompare(b.subject ?? b.title ?? ""),
);

const document = {
  meta: {
    schemaVersion: 2,
    sourceDocument: "DAMEROS 2026-27 - cuarto curso 1C/2C y asignaturas de tercero 2C",
    sourceFiles: [
      "1C CUARTO CURSO DAMERO 26-27.pdf",
      "2C CUARTO CURSO DAMERO 26-27.pdf",
      "2C TERCER CURSO DAMERO 26-27.pdf",
    ],
    coverage: { from: "2026-08-31", to: "2027-07-16" },
    provisional: false,
    practiceGroup: "G1",
    notes: "Transcripción verificada de los tres DAMEROS oficiales. Alba cursa B&F y FCG de tercero; solo G1 y actividades para todos los grupos.",
  },
  subjects,
  events,
};

writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.log(`Wrote ${events.length} official events to ${output}`);
