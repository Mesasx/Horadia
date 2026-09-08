import Testing
import Foundation
@testable import Horadia

/// Product brief sections 14, 15, 35, 49 — stats totals and class omission.
@Suite("Stats & overrides")
struct StatsAndOverrideTests {

    private let calendar = TestClock.calendar
    private var day: Date { TestClock.date(2026, 9, 14) }

    private func item(_ title: String, _ kind: ScheduledItem.Kind, _ s: (Int, Int), _ e: (Int, Int), immovable: Bool = false) -> ScheduledItem {
        ScheduledItem(id: UUID(), title: title, badge: nil,
                      start: day.at(s.0, s.1), end: day.at(e.0, e.1),
                      kind: kind, palette: .stone, symbolName: "circle", isImmovable: immovable)
    }

    @Test("Category totals sum activity and free durations correctly")
    func totalsSum() {
        let timeline = DayTimeline.build(date: day, activities: [
            item("FGFG", .university(.lecture), (9, 0), (10, 30)),
            item("BI", .university(.lecture), (10, 45), (12, 15)),
            item("Siesta", .nap, (16, 0), (17, 0)),
            item("Deporte", .sport, (18, 0), (19, 30)),
        ], calendar: calendar)

        let totals = StatsEngine.totals(for: [timeline])
        #expect(totals.hours(.university) == 3.0)   // 1.5 + 1.5
        #expect(totals.hours(.nap) == 1.0)
        #expect(totals.hours(.sport) == 1.5)
        // Free blocks (15-min rule): 10:30–10:45, 12:15–16:00, 17:00–18:00, 19:30–00:00
        let expectedFree = 0.25 + 3.75 + 1.0 + 4.5
        #expect(abs(totals.hours(.free) - expectedFree) < 0.0001)
    }

    @Test("Whole-day free when nothing is scheduled: 15 h of Libre")
    func emptyDayFree() {
        let timeline = DayTimeline.build(date: day, activities: [], calendar: calendar)
        let totals = StatsEngine.totals(for: [timeline])
        #expect(totals.hours(.free) == 15.0) // 09:00 → 00:00
    }

    // MARK: Omitting a single class instance (section 14)

    @Test("An omitted instance key removes only that class from that day")
    func omitSingleInstance() {
        let events: [UniversityScheduleImporter.ImportedEvent] = [
            .init(day: day, subjectCode: "FGFG", start: TimeOfDay(hour: 9, minute: 0), end: TimeOfDay(hour: 10, minute: 30), kind: .lecture),
            .init(day: day, subjectCode: "BI", start: TimeOfDay(hour: 10, minute: 45), end: TimeOfDay(hour: 12, minute: 15), kind: .lecture),
        ]
        let omitKey = UniversityEventOverride.key(subjectCode: "BI", day: day, startMinutes: 10 * 60 + 45, calendar: calendar)

        let context = DayAssembler.DayContext(
            date: day,
            universityEvents: events,
            personalActivities: [],
            omittedInstanceKeys: [omitKey]
        )
        let timeline = DayAssembler.timeline(for: context, subjectsByCode: [:], calendar: calendar)

        let titles = timeline.items.map(\.title)
        #expect(titles.contains("FGFG"))
        #expect(!titles.contains("BI"))
    }

    @Test("Holidays hide classes but keep personal activities and mark the day")
    func holidayHidesClasses() {
        let events: [UniversityScheduleImporter.ImportedEvent] = [
            .init(day: day, subjectCode: nil, start: TimeOfDay(hour: 9, minute: 0), end: TimeOfDay(hour: 0, minute: 0), kind: .holiday, location: nil, title: "Festivo"),
            .init(day: day, subjectCode: "FGFG", start: TimeOfDay(hour: 9, minute: 0), end: TimeOfDay(hour: 10, minute: 30), kind: .lecture),
        ]
        let personal = [item("Trabajo", .work, (9, 0), (13, 0))]
        let context = DayAssembler.DayContext(date: day, universityEvents: events, personalActivities: personal, omittedInstanceKeys: [])
        let timeline = DayAssembler.timeline(for: context, subjectsByCode: [:], calendar: calendar)

        #expect(timeline.dayNote == "Festivo")
        #expect(timeline.items.map(\.title) == ["Trabajo"])
    }
}
