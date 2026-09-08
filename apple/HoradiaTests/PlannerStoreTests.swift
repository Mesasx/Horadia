import Testing
import Foundation
@testable import Horadia

/// Product brief §11, §14, §17, §19, §20, §49 — mutations on the live planner.
@Suite("PlannerStore")
struct PlannerStoreTests {

    private let calendar = TestClock.calendar
    private var monday: Date { TestClock.date(2026, 9, 14) }

    private func makeStore() -> PlannerStore {
        PlannerStore(referenceDate: TestClock.date(2026, 9, 14, 12, 0), calendar: calendar)
    }

    private func deporte(in store: PlannerStore) -> ScheduledItem {
        store.personalItems.first { $0.title == "Deporte" }!
    }

    // MARK: Move + 15-min grid (§11)

    @Test("Moving an activity snaps its start to the 15-minute grid and keeps duration")
    func moveSnaps() {
        let store = makeStore()
        let item = deporte(in: store)                // Monday 18:00–19:30, 90 min
        let target = monday.at(20, 7)               // 20:07 → snaps to 20:00
        store.move(id: item.id, to: target)

        let moved = store.item(id: item.id)!
        #expect(moved.start == monday.at(20, 0))
        #expect(moved.duration == 90 * 60)
    }

    @Test("Moving to another day relocates the activity")
    func moveAcrossDays() {
        let store = makeStore()
        let item = deporte(in: store)
        let wednesday = monday.adding(days: 2, calendar: calendar)
        store.move(id: item.id, to: wednesday.at(10, 0))

        #expect(store.personalItems(on: monday).contains { $0.title == "Deporte" } == false)
        #expect(store.personalItems(on: wednesday).contains { $0.title == "Deporte" })
    }

    @Test("A pinned activity cannot be moved (§17)")
    func pinnedIsImmovable() {
        let store = makeStore()
        let item = deporte(in: store)
        store.togglePinned(id: item.id)
        let before = store.item(id: item.id)!.start
        store.move(id: item.id, to: monday.at(21, 0))
        #expect(store.item(id: item.id)!.start == before)
    }

    // MARK: Resize (§11)

    @Test("Resize snaps and enforces the 15-minute minimum")
    func resizeMinimum() {
        let store = makeStore()
        let item = deporte(in: store)               // starts 18:00
        store.resize(id: item.id, end: monday.at(18, 3)) // would be 3 min
        #expect(store.item(id: item.id)!.end == monday.at(18, 15))
    }

    // MARK: Duplicate / copy (§19)

    @Test("Duplicate creates a second activity 15 min later")
    func duplicate() {
        let store = makeStore()
        let item = deporte(in: store)
        let countBefore = store.personalItems.count
        let dup = store.duplicate(id: item.id)!
        #expect(store.personalItems.count == countBefore + 1)
        #expect(dup.start == item.start.addingTimeInterval(15 * 60))
        #expect(dup.id != item.id)
    }

    @Test("Copy to another day keeps the same wall-clock time")
    func copyToDay() {
        let store = makeStore()
        let item = deporte(in: store)               // 18:00–19:30
        let friday = monday.adding(days: 4, calendar: calendar)
        store.copy(id: item.id, toDay: friday)

        let copy = store.personalItems(on: friday).first { $0.title == "Deporte" }!
        #expect(calendar.component(.hour, from: copy.start) == 18)
        #expect(copy.duration == item.duration)
        // Original untouched.
        #expect(store.personalItems(on: monday).contains { $0.id == item.id })
    }

    // MARK: Completion / delete (§20)

    @Test("Toggle completed is reversible and optional")
    func completion() {
        let store = makeStore()
        let item = deporte(in: store)
        #expect(item.isCompleted == false)
        store.toggleCompleted(id: item.id)
        #expect(store.item(id: item.id)!.isCompleted)
        store.toggleCompleted(id: item.id)
        #expect(store.item(id: item.id)!.isCompleted == false)
    }

    @Test("Remove deletes only the target activity")
    func remove() {
        let store = makeStore()
        let item = deporte(in: store)
        let othersBefore = store.personalItems.filter { $0.id != item.id }.map(\.id)
        store.remove(id: item.id)
        #expect(store.item(id: item.id) == nil)
        #expect(store.personalItems.map(\.id) == othersBefore)
    }

    // MARK: Class omission via the store (§14)

    @Test("Omitting a class hides it from that day's timeline but not others")
    func omitClass() {
        let store = makeStore()
        let mondayBI = store.timeline(for: monday).items.first { $0.title == "BI" }!
        let key = mondayBI.instanceKey!

        store.omitClass(instanceKey: key)
        #expect(store.timeline(for: monday).items.contains { $0.title == "BI" } == false)

        // Tuesday also has a BI lecture — still there.
        let tuesday = monday.adding(days: 1, calendar: calendar)
        #expect(store.timeline(for: tuesday).items.contains { $0.title == "BI" })

        store.restoreClass(instanceKey: key)
        #expect(store.timeline(for: monday).items.contains { $0.title == "BI" })
    }

    // MARK: Quick create from a free slot (§7)

    @Test("Creating from a library template fills the free slot, capped and snapped")
    func quickCreateFillsSlot() {
        let store = makeStore()
        // Monday free 14:00–16:00 (between TF II and Siesta).
        let slot = TimeSlot(start: monday.at(14, 0), end: monday.at(16, 0))
        let estudio = store.library.first { $0.name == "Estudio" }! // default 2 h

        let item = estudio.makeItem(day: monday, start: slot.start, duration: min(estudio.defaultDuration, slot.duration))
        store.add(item)

        let placed = store.personalItems(on: monday).first { $0.title == "Estudio" }!
        #expect(placed.start == monday.at(14, 0))
        #expect(placed.end <= monday.at(16, 0))
    }
}
