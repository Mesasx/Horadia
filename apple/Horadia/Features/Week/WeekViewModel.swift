import Foundation
import Observation

/// Drives the Semana screen (product brief section 5).
///
/// Owns the currently-anchored week and exposes ready-to-render `DayTimeline`s.
/// All scheduling logic lives in the repository / engine, not here (section 48).
@Observable
final class WeekViewModel {

    private let repository: ScheduleRepository
    private let calendar: Calendar
    /// Injected clock so "today" is testable.
    private let now: () -> Date

    /// Monday 00:00 of the week currently on screen.
    private(set) var weekStart: Date

    init(
        repository: ScheduleRepository,
        calendar: Calendar = HoradiaCalendar.current,
        now: @escaping () -> Date = { .now }
    ) {
        self.repository = repository
        self.calendar = calendar
        self.now = now
        self.weekStart = now().startOfWeek(calendar: calendar)
    }

    // MARK: Derived state

    var days: [DayTimeline] {
        weekDates.map { repository.timeline(for: $0) }
    }

    var weekDates: [Date] {
        (0..<7).map { weekStart.adding(days: $0, calendar: calendar) }
    }

    /// Laid-out timeline for one day. Reads flow through to the store so the
    /// view re-renders when an activity is added / moved / removed.
    func timeline(for date: Date) -> DayTimeline {
        repository.timeline(for: date)
    }

    var today: Date { calendar.startOfDay(for: now()) }

    var isViewingCurrentWeek: Bool {
        calendar.isDate(weekStart, equalTo: now().startOfWeek(calendar: calendar), toGranularity: .day)
    }

    /// Discreet birthday greeting for any day in the visible week (sections 2, 39).
    var birthdayGreeting: String? {
        for date in weekDates {
            if let greeting = BirthdayGreeting.greeting(for: date, preferences: repository.preferences, calendar: calendar) {
                return greeting
            }
        }
        return nil
    }

    /// Title like `"8–14 sept"` or spanning months.
    var weekTitle: String {
        let end = weekStart.adding(days: 6, calendar: calendar)
        let startText = HoradiaFormat.dayMonth(weekStart)
        let endText = HoradiaFormat.dayMonth(end)
        return "\(startText) – \(endText)"
    }

    func isToday(_ date: Date) -> Bool {
        calendar.isDate(date, inSameDayAs: now())
    }

    func isWeekend(_ date: Date) -> Bool {
        calendar.isDateInWeekend(date)
    }

    /// `nowIndicatorDate(for:)` returns the current time only for today's column.
    func nowIndicatorDate(for date: Date) -> Date? {
        isToday(date) ? now() : nil
    }

    // MARK: Navigation (section 5)

    func goToPreviousWeek() { shiftWeek(by: -1) }
    func goToNextWeek() { shiftWeek(by: 1) }

    func goToToday() {
        withMotion { weekStart = now().startOfWeek(calendar: calendar) }
    }

    func showWeek(containing date: Date) {
        withMotion { weekStart = date.startOfWeek(calendar: calendar) }
    }

    private func shiftWeek(by delta: Int) {
        withMotion {
            weekStart = weekStart.adding(days: delta * 7, calendar: calendar)
        }
    }

    private func withMotion(_ mutate: () -> Void) {
        mutate()
    }
}
