import Foundation

/// Read model the feature layer uses to build timelines, decoupled from the
/// persistence backend (section 48). Phase 1 ships an in-memory mock; a
/// SwiftData-backed implementation arrives with the persistence phase.
protocol ScheduleRepository {
    /// Subject metadata keyed by code (`"BI"`, `"TF II"`, …).
    var subjectsByCode: [String: UniversityScheduleImporter.ImportedSubject] { get }

    /// User preferences (owner name, birthday, visible-day count…).
    var preferences: UserPreferences { get }

    /// A fully laid-out timeline for a single calendar day.
    func timeline(for date: Date) -> DayTimeline
}

extension ScheduleRepository {
    /// Convenience: timelines for the Monday–Sunday week containing `date`.
    func week(containing date: Date, calendar: Calendar = HoradiaCalendar.current) -> [DayTimeline] {
        date.weekDays(calendar: calendar).map { timeline(for: $0) }
    }
}
