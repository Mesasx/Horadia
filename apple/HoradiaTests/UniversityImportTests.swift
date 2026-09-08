import Testing
import Foundation
@testable import Horadia

/// Product brief sections 22, 24 — G1 filtering and DAMERO import.
@Suite("University import")
struct UniversityImportTests {

    private let calendar = TestClock.calendar

    private func document(_ events: String) -> Data {
        """
        {
          "meta": { "schemaVersion": 1, "sourceDocument": "test", "provisional": true, "practiceGroup": "G1" },
          "subjects": [ { "code": "FGFG", "fullName": "Farmacología", "color": "sky" } ],
          "events": [ \(events) ]
        }
        """.data(using: .utf8)!
    }

    // MARK: G1 / Gr1 equivalence (section 22)

    @Test("Gr1 is treated as G1 and kept")
    func gr1EqualsG1() throws {
        let data = document(#"{ "date": "2026-09-14", "subject": "FGFG", "start": "15:00", "end": "18:00", "type": "practice", "group": "Gr1" }"#)
        let result = try UniversityScheduleImporter.decode(data, calendar: calendar)
        #expect(result.events.count == 1)
        #expect(result.events[0].kind == .practice)
    }

    @Test("Practices for other groups are dropped")
    func otherGroupsDropped() throws {
        let data = document("""
        { "date": "2026-09-14", "subject": "FGFG", "start": "15:00", "end": "18:00", "type": "practice", "group": "G2" },
        { "date": "2026-09-15", "subject": "FGFG", "start": "15:00", "end": "18:00", "type": "practice", "group": "Gr3" },
        { "date": "2026-09-16", "subject": "FGFG", "start": "15:00", "end": "18:00", "type": "practice", "group": "GRUPO 4" }
        """)
        let result = try UniversityScheduleImporter.decode(data, calendar: calendar)
        #expect(result.events.isEmpty)
    }

    @Test("Lectures have no group and are always kept")
    func lecturesKept() throws {
        let data = document(#"{ "date": "2026-09-14", "subject": "FGFG", "start": "09:00", "end": "10:30", "type": "lecture", "group": null }"#)
        let result = try UniversityScheduleImporter.decode(data, calendar: calendar)
        #expect(result.events.count == 1)
    }

    @Test("PracticeGroup.normalized handles the documented spellings")
    func normalizationTable() {
        #expect(PracticeGroup.normalized(from: "G1") == .g1)
        #expect(PracticeGroup.normalized(from: "Gr1") == .g1)
        #expect(PracticeGroup.normalized(from: "GRUPO 1") == .g1)
        #expect(PracticeGroup.normalized(from: "g1") == .g1)
        #expect(PracticeGroup.normalized(from: "G2") == nil)
        #expect(PracticeGroup.normalized(from: "Gr4") == nil)
        #expect(PracticeGroup.normalized(from: nil) == nil)
    }

    // MARK: Bundled seed (section 24)

    @Test("The bundled schedule loads, is provisional, and stops at end of January")
    func bundledSeed() throws {
        let result = try UniversityScheduleImporter.loadBundled(calendar: calendar)
        #expect(result.provisional)
        #expect(!result.events.isEmpty)
        #expect(result.subjects.count == 5)

        let latest = result.events.map(\.day).max()!
        let february = TestClock.date(2027, 2, 1)
        #expect(latest < february) // no invented second term
    }

    @Test("Bundled seed reproduces the standard Monday pattern")
    func mondayPattern() throws {
        let result = try UniversityScheduleImporter.loadBundled(calendar: calendar)
        let monday = TestClock.date(2026, 9, 14)
        let mondayLectures = result.events
            .filter { calendar.isDate($0.day, inSameDayAs: monday) && $0.kind == .lecture }
            .sorted { $0.start < $1.start }
        #expect(mondayLectures.map(\.subjectCode) == ["FGFG", "BI", "TF II"])
        #expect(mondayLectures.first?.start == TimeOfDay(hour: 9, minute: 0))
    }
}
