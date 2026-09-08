import Testing
import Foundation
import CoreGraphics
@testable import Horadia

/// Product brief §11, §12, §15, §49 — drag geometry and conflict detection.
@Suite("Drag & conflicts")
struct DragAndConflictTests {

    private let calendar = TestClock.calendar
    private var day: Date { TestClock.date(2026, 9, 14) }
    private let ppm: CGFloat = 1.0 // points per minute

    // MARK: DragMath — offset ↔ time, snapping (§11)

    @Test("A vertical offset maps to a 15-minute-snapped time")
    func offsetToTime() {
        let start = day.at(9, 0)
        // 190 pt at 1 pt/min = 190 min → 12:10 → snaps to 12:15.
        let t = DragMath.time(atOffset: 190, timelineStart: start, pointsPerMinute: ppm, calendar: calendar)
        #expect(t == day.at(12, 15))
    }

    @Test("offset(for:) is the inverse of time(atOffset:) on grid points")
    func offsetRoundTrip() {
        let start = day.at(9, 0)
        let target = day.at(17, 30)
        let y = DragMath.offset(for: target, timelineStart: start, pointsPerMinute: ppm)
        #expect(y == 510) // 8.5 h * 60
        let back = DragMath.time(atOffset: y, timelineStart: start, pointsPerMinute: ppm, calendar: calendar)
        #expect(back == target)
    }

    @Test("clampStart keeps the whole block inside the day window")
    func clamp() {
        let lower = day.at(9, 0)
        let upper = day.endOfDayMidnight(calendar: calendar)
        let duration: TimeInterval = 90 * 60

        #expect(DragMath.clampStart(day.at(7, 0), duration: duration, lower: lower, upper: upper) == lower)
        // 23:30 start + 90 min would spill past midnight → pinned to 22:30.
        #expect(DragMath.clampStart(day.at(23, 30), duration: duration, lower: lower, upper: upper) == day.at(22, 30))
        #expect(DragMath.clampStart(day.at(14, 0), duration: duration, lower: lower, upper: upper) == day.at(14, 0))
    }

    // MARK: DragMath — cross-day (§12)

    @Test("Horizontal translation past half a column shifts one day")
    func dayShift() {
        let pitch: CGFloat = 200
        #expect(DragMath.dayShift(forHorizontalTranslation: 30, columnPitch: pitch) == 0)
        #expect(DragMath.dayShift(forHorizontalTranslation: 120, columnPitch: pitch) == 1)
        #expect(DragMath.dayShift(forHorizontalTranslation: -260, columnPitch: pitch) == -1)
        #expect(DragMath.dayShift(forHorizontalTranslation: 420, columnPitch: pitch) == 2)
    }

    @Test("shiftDay preserves the time of day")
    func shiftDayKeepsTime() {
        let t = day.at(18, 0)
        let shifted = DragMath.shiftDay(of: t, by: 2, calendar: calendar)
        #expect(calendar.component(.hour, from: shifted) == 18)
        #expect(calendar.component(.day, from: shifted) == 16)
    }

    // MARK: ConflictEngine (§15)

    private func personal(_ s: (Int, Int), _ e: (Int, Int)) -> ScheduledItem {
        ScheduledItem(title: "Trabajo", kind: .work, palette: .sky, symbolName: "briefcase",
                      start: day.at(s.0, s.1), end: day.at(e.0, e.1))
    }

    private func lecture(_ code: String, _ s: (Int, Int), _ e: (Int, Int)) -> ScheduledItem {
        var item = ScheduledItem(title: code, kind: .university(.lecture), palette: .mint,
                                 symbolName: "book.closed", start: day.at(s.0, s.1), end: day.at(e.0, e.1))
        item.instanceKey = "\(code)|key"
        item.isImmovable = true
        return item
    }

    @Test("One overlapping class → single-class conflict summary")
    func singleConflict() {
        let work = personal((10, 0), (14, 0))
        let items = [lecture("BI", (10, 45), (12, 15)), lecture("SP", (16, 0), (17, 30))]
        let conflict = ConflictEngine.conflict(for: work, against: items)
        #expect(conflict != nil)
        #expect(conflict?.summary == "Trabajo coincide con BI")
        #expect(conflict?.isMultiple == false)
        #expect(conflict?.classInstanceKeys == ["BI|key"])
    }

    @Test("Two overlapping classes → 'coincide con 2 clases'")
    func multiConflict() {
        let work = personal((10, 0), (14, 0))
        let items = [lecture("BI", (10, 45), (12, 15)), lecture("TF II", (12, 30), (14, 0))]
        let conflict = ConflictEngine.conflict(for: work, against: items)
        #expect(conflict?.summary == "Trabajo coincide con 2 clases")
        #expect(conflict?.isMultiple == true)
        #expect(conflict?.classes.map(\.title) == ["BI", "TF II"])
    }

    @Test("No overlap → no conflict")
    func noConflict() {
        let work = personal((14, 30), (16, 0))
        let items = [lecture("BI", (10, 45), (12, 15))]
        #expect(ConflictEngine.conflict(for: work, against: items) == nil)
    }

    @Test("A class dropped on another class is not a conflict (only personal vs class)")
    func classVsClassIgnored() {
        let aClass = lecture("BI", (10, 0), (12, 0))
        let items = [lecture("SP", (10, 45), (12, 15))]
        #expect(ConflictEngine.conflict(for: aClass, against: items) == nil)
    }

    // MARK: Interaction — remove / undo (§14)

    @Test("Dropping a personal activity on the zone removes it, with undo")
    func removePersonalUndo() {
        let store = PlannerStore(referenceDate: TestClock.date(2026, 9, 14, 12, 0), calendar: calendar)
        let interaction = PlannerInteraction(store: store, calendar: calendar)
        let deporte = store.personalItems.first { $0.title == "Deporte" }!

        interaction.beginDrag(deporte)
        interaction.commitRemove(item: deporte)
        #expect(store.item(id: deporte.id) == nil)
        #expect(interaction.undo != nil)

        interaction.performUndo()
        #expect(store.personalItems.contains { $0.title == "Deporte" })
    }

    @Test("Dropping a class on the zone omits that instance only, with undo")
    func omitClassUndo() {
        let store = PlannerStore(referenceDate: TestClock.date(2026, 9, 14, 12, 0), calendar: calendar)
        let interaction = PlannerInteraction(store: store, calendar: calendar)
        let monday = TestClock.date(2026, 9, 14)
        let bi = store.timeline(for: monday).items.first { $0.title == "BI" }!

        interaction.beginDrag(bi)
        interaction.commitRemove(item: bi)
        #expect(store.timeline(for: monday).items.contains { $0.title == "BI" } == false)
        #expect(interaction.undo != nil)

        interaction.performUndo()
        #expect(store.timeline(for: monday).items.contains { $0.title == "BI" })
    }

    @Test("Moving onto a class raises a conflict; 'removeClasses' omits it")
    func moveCreatesConflictThenRemove() {
        let store = PlannerStore(referenceDate: TestClock.date(2026, 9, 14, 12, 0), calendar: calendar)
        let interaction = PlannerInteraction(store: store, calendar: calendar)
        let monday = TestClock.date(2026, 9, 14)
        let deporte = store.personalItems(on: monday).first { $0.title == "Deporte" }!

        // Move Deporte onto the 10:45 BI lecture.
        interaction.commitMove(item: deporte, targetStart: monday.at(10, 45))
        #expect(interaction.pendingConflict?.conflict.classes.first?.title == "BI")

        interaction.resolveConflict(.removeClasses)
        #expect(store.timeline(for: monday).items.contains { $0.title == "BI" } == false)
        #expect(interaction.pendingConflict == nil)
    }

    @Test("Conflict 'cancel' reverts the move")
    func conflictCancelReverts() {
        let store = PlannerStore(referenceDate: TestClock.date(2026, 9, 14, 12, 0), calendar: calendar)
        let interaction = PlannerInteraction(store: store, calendar: calendar)
        let monday = TestClock.date(2026, 9, 14)
        let deporte = store.personalItems(on: monday).first { $0.title == "Deporte" }!
        let originalStart = deporte.start

        interaction.commitMove(item: deporte, targetStart: monday.at(10, 45))
        interaction.resolveConflict(.cancel)
        #expect(store.item(id: deporte.id)?.start == originalStart)
    }
}
