import Foundation
import Observation

/// The app's live, mutable planner state (product brief §12, §14, §18–20, §37).
///
/// Phase 2: everything lives in memory. Every mutation is a small, named method
/// so the SwiftData-backed store in Phase 3 can implement the exact same surface.
/// Views never mutate `ScheduledItem`s directly — they call these methods.
@Observable
final class PlannerStore: ScheduleRepository {

    // MARK: Read-model (ScheduleRepository)

    var preferences: UserPreferences
    let subjectsByCode: [String: UniversityScheduleImporter.ImportedSubject]

    // MARK: Mutable state

    /// All personal activities, flat. Ordered only for stable diffing.
    private(set) var personalItems: [ScheduledItem]
    /// University instances the user has chosen not to attend (§14).
    private(set) var omittedInstanceKeys: Set<String>
    /// Reusable templates shown in the quick-create sheet / library (§37).
    private(set) var library: [LibraryActivity]

    private let calendar: Calendar
    private let universityByDay: [Date: [UniversityScheduleImporter.ImportedEvent]]

    // MARK: Init

    init(
        referenceDate: Date = .now,
        calendar: Calendar = HoradiaCalendar.current
    ) {
        self.calendar = calendar
        self.preferences = UserPreferences()

        let imported = (try? UniversityScheduleImporter.loadBundled(calendar: calendar))
            ?? UniversityScheduleImporter.Result(subjects: [], events: [], provisional: true)
        self.subjectsByCode = Dictionary(
            imported.subjects.map { ($0.code, $0) },
            uniquingKeysWith: { first, _ in first }
        )
        self.universityByDay = Dictionary(grouping: imported.events) {
            calendar.startOfDay(for: $0.day)
        }

        self.personalItems = PlannerSeed.personalItems(referenceDate: referenceDate, calendar: calendar)
        self.omittedInstanceKeys = []
        self.library = PlannerSeed.library()
    }

    // MARK: Read

    func timeline(for date: Date) -> DayTimeline {
        let day = calendar.startOfDay(for: date)
        let context = DayAssembler.DayContext(
            date: day,
            universityEvents: universityByDay[day] ?? [],
            personalActivities: personalItems(on: day),
            omittedInstanceKeys: omittedInstanceKeys
        )
        return DayAssembler.timeline(for: context, subjectsByCode: subjectsByCode, calendar: calendar)
    }

    func personalItems(on date: Date) -> [ScheduledItem] {
        personalItems.filter { calendar.isDate($0.start, inSameDayAs: date) }
    }

    func item(id: UUID) -> ScheduledItem? {
        personalItems.first { $0.id == id }
    }

    // MARK: Mutations — personal activities

    func add(_ item: ScheduledItem) {
        personalItems.append(item)
        sort()
    }

    func remove(id: UUID) {
        personalItems.removeAll { $0.id == id }
    }

    func replace(_ item: ScheduledItem) {
        guard let index = personalItems.firstIndex(where: { $0.id == item.id }) else { return }
        personalItems[index] = item
        sort()
    }

    /// Moves an activity so it starts at `start` (any absolute date-time),
    /// snapped to the 15-min grid (§11) and keeping its duration. The day changes
    /// implicitly when `start` lands on another day. No-op for immovable (§14) or
    /// pinned (§17) items.
    func move(id: UUID, to start: Date) {
        guard var moved = item(id: id), !moved.isImmovable, !moved.isPinned else { return }
        let duration = max(moved.duration, TimeGrid.minimumActivityDuration)
        let snapped = TimeGrid.snap(start, calendar: calendar)
        moved.start = snapped
        moved.end = snapped.addingTimeInterval(duration)
        replace(moved)
    }

    /// Moves an activity to another day, keeping its time of day and duration.
    /// No-op for immovable (§14) or pinned (§17) items.
    func move(id: UUID, toDay day: Date) {
        guard let current = item(id: id), !current.isImmovable, !current.isPinned else { return }
        let dayStart = day.startOfDay(calendar: calendar)
        let offset = current.start.timeIntervalSince(current.start.startOfDay(calendar: calendar))
        move(id: id, to: dayStart.addingTimeInterval(offset))
    }

    /// Changes only the end time, snapped, respecting the 15-min minimum (§11).
    func resize(id: UUID, end: Date) {
        guard var resized = item(id: id), !resized.isImmovable, !resized.isPinned else { return }
        let snappedEnd = TimeGrid.snap(end, calendar: calendar)
        resized.end = max(snappedEnd, resized.start.addingTimeInterval(TimeGrid.minimumActivityDuration))
        replace(resized)
    }

    func togglePinned(id: UUID) {
        guard var target = item(id: id) else { return }
        target.isPinned.toggle()
        replace(target)
    }

    func toggleCompleted(id: UUID) {
        guard var target = item(id: id) else { return }
        target.isCompleted.toggle()
        replace(target)
    }

    /// Duplicates an activity in place, nudged 15 min later so it is visible (§19).
    @discardableResult
    func duplicate(id: UUID) -> ScheduledItem? {
        guard let original = item(id: id) else { return nil }
        let clone = ScheduledItem(
            title: original.title,
            kind: original.kind,
            palette: original.palette,
            symbolName: original.symbolName,
            start: original.start.addingTimeInterval(TimeGrid.step),
            end: original.end.addingTimeInterval(TimeGrid.step),
            isPinned: false,
            isCompleted: false
        )
        add(clone)
        return clone
    }

    /// Copies an activity to another day at the same time (§19). Not a routine.
    @discardableResult
    func copy(id: UUID, toDay day: Date) -> ScheduledItem? {
        guard let original = item(id: id) else { return nil }
        let dayStart = day.startOfDay(calendar: calendar)
        let originalDayStart = original.start.startOfDay(calendar: calendar)
        let offsetStart = original.start.timeIntervalSince(originalDayStart)
        let duration = original.duration
        let newStart = dayStart.addingTimeInterval(offsetStart)
        let clone = ScheduledItem(
            title: original.title,
            kind: original.kind,
            palette: original.palette,
            symbolName: original.symbolName,
            start: newStart,
            end: newStart.addingTimeInterval(duration)
        )
        add(clone)
        return clone
    }

    // MARK: Mutations — university (§14)

    /// Marks a single class instance as "no asistir" for that date only. The
    /// official schedule and future instances are untouched; restorable.
    func omitClass(instanceKey: String) {
        omittedInstanceKeys.insert(instanceKey)
    }

    func restoreClass(instanceKey: String) {
        omittedInstanceKeys.remove(instanceKey)
    }

    func isOmitted(instanceKey: String) -> Bool {
        omittedInstanceKeys.contains(instanceKey)
    }

    // MARK: Mutations — library (§37)

    @discardableResult
    func addToLibrary(name: String, kind: ActivityKind, palette: PastelColor, symbolName: String) -> LibraryActivity {
        let activity = LibraryActivity(name: name, kind: kind, palette: palette, symbolName: symbolName)
        library.append(activity)
        return activity
    }

    // MARK: Helpers

    private func sort() {
        personalItems.sort { $0.start < $1.start }
    }
}

extension PlannerStore {
    /// A store pre-seeded for the week containing `date`, for previews.
    static func preview(referenceDate: Date = .now) -> PlannerStore {
        PlannerStore(referenceDate: referenceDate)
    }
}
