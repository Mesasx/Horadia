import Foundation

/// Combines the different sources of a day's blocks into a single ordered list of
/// `ScheduledItem`s, then hands off to `DayTimeline` for gap computation.
///
/// Phase 1 sources: imported university events (minus per-instance omissions,
/// section 14) and personal activities. Routines, external calendar and
/// midnight-crossing carry-over land in later phases but the shape is ready.
enum DayAssembler {

    /// Weekday note for holidays / vacation (section 26): classes are hidden,
    /// the day stays usable for personal activities.
    struct DayContext {
        var date: Date
        var universityEvents: [UniversityScheduleImporter.ImportedEvent]
        var personalActivities: [ScheduledItem]
        /// Instance keys (see `UniversityEventOverride.key`) marked omitted.
        var omittedInstanceKeys: Set<String>
    }

    static func timeline(
        for context: DayContext,
        subjectsByCode: [String: UniversityScheduleImporter.ImportedSubject],
        calendar: Calendar = HoradiaCalendar.current
    ) -> DayTimeline {
        let day = calendar.startOfDay(for: context.date)

        let holiday = context.universityEvents.first {
            $0.kind == .holiday || $0.kind == .vacation
        }

        var items: [ScheduledItem] = []

        if holiday == nil {
            for event in context.universityEvents where event.kind == .lecture || event.kind == .practice || event.kind == .exam {
                let item = makeItem(from: event, day: day, subjects: subjectsByCode, calendar: calendar)
                if let key = item.instanceKey, context.omittedInstanceKeys.contains(key) { continue }
                items.append(item)
            }
        }

        items.append(contentsOf: context.personalActivities)
        items.sort { $0.start < $1.start }

        let note: String? = holiday.map { $0.title ?? ($0.kind == .vacation ? "Vacaciones" : "Festivo") }

        return DayTimeline.build(
            date: day,
            activities: items,
            dayNote: note,
            calendar: calendar
        )
    }

    static func makeItem(
        from event: UniversityScheduleImporter.ImportedEvent,
        day: Date,
        subjects: [String: UniversityScheduleImporter.ImportedSubject],
        calendar: Calendar = HoradiaCalendar.current
    ) -> ScheduledItem {
        let subject = event.subjectCode.flatMap { subjects[$0] }
        let palette = subject?.color ?? .stone
        let code = event.subjectCode ?? (event.title ?? "Universidad")

        let badge: String?
        let symbol: String
        switch event.kind {
        case .exam:
            badge = "EXAMEN · \(code)"
            symbol = "pencil.and.list.clipboard"
        case .practice:
            badge = "PRÁCTICA · \(code)"
            symbol = "flask"
        default:
            badge = nil
            symbol = "book.closed"
        }

        let start = day.settingTime(event.start, calendar: calendar)
        let instanceKey = UniversityEventOverride.key(
            subjectCode: event.subjectCode ?? code,
            day: day,
            startMinutes: event.start.minutesSinceMidnight,
            calendar: calendar
        )

        return ScheduledItem(
            id: event.id,
            // Week view shows the short code ("FGFG", "BI", "TF II") per §5; the
            // full subject name rides along for VoiceOver and detail views.
            title: code,
            badge: badge,
            fullTitle: subject?.fullName,
            start: start,
            end: day.settingTime(event.end, calendar: calendar),
            kind: .university(event.kind),
            palette: palette,
            symbolName: symbol,
            instanceKey: instanceKey,
            isImmovable: true,
            isPinned: false,
            isCompleted: false
        )
    }
}
