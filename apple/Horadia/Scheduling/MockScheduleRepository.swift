import Foundation

/// Read-only in-memory schedule used by previews and tests. The running app uses
/// `PlannerStore` (which is mutable); both draw their initial content from
/// `PlannerSeed` so they stay in sync.
struct MockScheduleRepository: ScheduleRepository {

    let preferences: UserPreferences
    let subjectsByCode: [String: UniversityScheduleImporter.ImportedSubject]

    private let calendar: Calendar
    private let universityByDay: [Date: [UniversityScheduleImporter.ImportedEvent]]
    private let personalByDay: [Date: [ScheduledItem]]
    private let omittedInstanceKeys: Set<String>

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
        self.personalByDay = Dictionary(
            grouping: PlannerSeed.personalItems(referenceDate: referenceDate, calendar: calendar)
        ) { calendar.startOfDay(for: $0.start) }
        self.omittedInstanceKeys = []
    }

    func timeline(for date: Date) -> DayTimeline {
        let day = calendar.startOfDay(for: date)
        let context = DayAssembler.DayContext(
            date: day,
            universityEvents: universityByDay[day] ?? [],
            personalActivities: personalByDay[day] ?? [],
            omittedInstanceKeys: omittedInstanceKeys
        )
        return DayAssembler.timeline(for: context, subjectsByCode: subjectsByCode, calendar: calendar)
    }
}
