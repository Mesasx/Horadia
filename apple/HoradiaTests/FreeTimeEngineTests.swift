import Testing
import Foundation
@testable import Horadia

/// Product brief sections 6, 7, 42, 49 — the "Libre" gap engine.
@Suite("FreeTimeEngine")
struct FreeTimeEngineTests {

    private let calendar = TestClock.calendar
    private var day: Date { TestClock.date(2026, 9, 14) } // a Monday

    private func bounds() -> FreeTimeEngine.DayBounds {
        .standard(for: day, calendar: calendar)
    }

    // MARK: Matches the Phase 1 visual objective

    /// The Phase 1 visual sketch in the brief omits the two 15-minute breaks
    /// between classes, but §7 ("hueco igual o superior a 15 minutos → Libre"),
    /// §11 and §49 ("huecos <15 min") make the threshold unambiguous: a
    /// 15-minute gap *is* a Libre block. So the sample day yields five, not
    /// three — the three from the sketch plus the two inter-class breaks.
    @Test("Phase 1 sample day: five Libre blocks per the 15-minute rule")
    func phaseOneSampleDay() {
        let activities = [
            slot(day, 9, 0, 10, 30),   // FGFG
            slot(day, 10, 45, 12, 15), // BI
            slot(day, 12, 30, 14, 0),  // TF II
            slot(day, 16, 0, 17, 0),   // Siesta
            slot(day, 18, 0, 19, 30),  // Deporte
        ]

        let free = FreeTimeEngine.freeSlots(activities: activities, bounds: bounds())

        #expect(free == [
            slot(day, 10, 30, 10, 45),
            slot(day, 12, 15, 12, 30),
            slot(day, 14, 0, 16, 0),
            slot(day, 17, 0, 18, 0),
            TimeSlot(start: day.at(19, 30), end: day.endOfDayMidnight(calendar: calendar)),
        ])
    }

    // MARK: The 15-minute rule (section 7)

    @Test("A gap of exactly 15 minutes becomes a Libre block")
    func fifteenMinuteGapIsFree() {
        let activities = [slot(day, 9, 0, 10, 0), slot(day, 10, 15, 11, 0)]
        let free = FreeTimeEngine.freeSlots(activities: activities, bounds: bounds())
        #expect(free.contains(slot(day, 10, 0, 10, 15)))
    }

    @Test("A gap under 15 minutes produces no Libre block")
    func shortGapIsIgnored() {
        let activities = [slot(day, 9, 0, 10, 0), slot(day, 10, 10, 11, 0)] // 10-min gap
        let free = FreeTimeEngine.freeSlots(activities: activities, bounds: bounds())
        #expect(!free.contains { $0.start == day.at(10, 0) })
    }

    @Test("The gap between classes is one block, never split into pieces")
    func gapIsNotSubdivided() {
        let activities = [slot(day, 12, 30, 14, 0), slot(day, 16, 0, 17, 0)]
        let free = FreeTimeEngine.freeSlots(activities: activities, bounds: bounds())
        let fourteenToSixteen = free.first { $0.start == day.at(14, 0) }
        #expect(fourteenToSixteen?.end == day.at(16, 0))
    }

    // MARK: Day bounds (section 6)

    @Test("Empty day is a single Libre block 09:00 to midnight")
    func emptyDay() {
        let free = FreeTimeEngine.freeSlots(activities: [], bounds: bounds())
        #expect(free.count == 1)
        #expect(free[0].start == day.at(9, 0))
        #expect(free[0].end == day.endOfDayMidnight(calendar: calendar))
    }

    @Test("Day starts at 09:00 by default; no Libre before the first 09:00 class")
    func defaultStartNineAM() {
        let activities = [slot(day, 9, 0, 10, 30)]
        let layout = FreeTimeEngine.layout(activities: activities, bounds: bounds())
        #expect(layout.effectiveStart == day.at(9, 0))
        #expect(!layout.freeSlots.contains { $0.end <= day.at(9, 0) })
    }

    @Test("An activity before 09:00 moves the day start earlier")
    func earlyActivityMovesStart() {
        let activities = [slot(day, 8, 0, 9, 0)]
        let layout = FreeTimeEngine.layout(activities: activities, bounds: bounds())
        #expect(layout.effectiveStart == day.at(8, 0))
        // 08:00-09:00 is busy, 09:00→midnight is free.
        #expect(layout.freeSlots == [TimeSlot(start: day.at(9, 0), end: day.endOfDayMidnight(calendar: calendar))])
    }

    @Test("A leading gap appears when the first activity is later than 09:00")
    func leadingGap() {
        let activities = [slot(day, 16, 0, 17, 0)] // nap-only day
        let free = FreeTimeEngine.freeSlots(activities: activities, bounds: bounds())
        #expect(free.first == slot(day, 9, 0, 16, 0))
    }

    // MARK: Midnight crossing (section 6)

    @Test("An activity crossing midnight is clamped to midnight for the day")
    func midnightCrossingClamped() {
        let activities = [
            TimeSlot(start: day.at(22, 0), end: day.adding(days: 1, calendar: calendar).at(2, 0))
        ]
        let layout = FreeTimeEngine.layout(activities: activities, bounds: bounds())
        // Free 09:00→22:00, nothing after (22:00→00:00 is busy).
        #expect(layout.freeSlots == [slot(day, 9, 0, 22, 0)])
        #expect(layout.end == day.endOfDayMidnight(calendar: calendar))
    }

    // MARK: Overlaps

    @Test("Overlapping activities are unioned when computing gaps")
    func overlappingActivities() {
        let activities = [slot(day, 10, 0, 14, 0), slot(day, 10, 45, 12, 15)]
        let free = FreeTimeEngine.freeSlots(activities: activities, bounds: bounds())
        #expect(free.contains(slot(day, 9, 0, 10, 0)))
        #expect(free.contains { $0.start == day.at(14, 0) })
        #expect(!free.contains { $0.start >= day.at(10, 0) && $0.end <= day.at(14, 0) })
    }

    @Test("DayTimeline interleaves items and free blocks in chronological order")
    func timelineOrdering() {
        let base = day
        let items: [ScheduledItem] = [
            ScheduledItem(id: UUID(), title: "BI", badge: nil,
                          start: base.at(10, 45), end: base.at(12, 15),
                          kind: .university(.lecture), palette: .mint, symbolName: "book.closed"),
            ScheduledItem(id: UUID(), title: "Siesta", badge: nil,
                          start: base.at(16, 0), end: base.at(17, 0),
                          kind: .nap, palette: .peach, symbolName: "moon.zzz"),
        ]
        let timeline = DayTimeline.build(date: base, activities: items, calendar: calendar)
        let starts = timeline.blocks.map(\.start)
        #expect(starts == starts.sorted())
        #expect(timeline.blocks.first?.start == base.at(9, 0)) // leading Libre
    }
}
