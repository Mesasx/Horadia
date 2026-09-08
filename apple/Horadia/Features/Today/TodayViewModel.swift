import Foundation
import Observation

/// Drives the Hoy screen (product brief section 33).
@Observable
final class TodayViewModel {

    private let repository: ScheduleRepository
    private let calendar: Calendar
    private let clock: () -> Date

    init(
        repository: ScheduleRepository,
        calendar: Calendar = HoradiaCalendar.current,
        now: @escaping () -> Date = { .now }
    ) {
        self.repository = repository
        self.calendar = calendar
        self.clock = now
    }

    var now: Date { clock() }

    var todayTimeline: DayTimeline {
        repository.timeline(for: calendar.startOfDay(for: now))
    }

    var birthdayGreeting: String? {
        BirthdayGreeting.greeting(for: now, preferences: repository.preferences, calendar: calendar)
    }

    /// The next activity that has not yet started (section 33).
    var nextItem: ScheduledItem? {
        todayTimeline.items
            .filter { $0.start > now }
            .min { $0.start < $1.start }
    }

    /// The activity happening right now, if any.
    var currentItem: ScheduledItem? {
        todayTimeline.items.first { $0.start <= now && now < $0.end }
    }

    func relativeStart(for item: ScheduledItem) -> String {
        let interval = item.start.timeIntervalSince(now)
        guard interval > 0 else { return "ahora" }
        let minutes = Int((interval / 60).rounded())
        if minutes < 60 { return "en \(minutes) min" }
        return "en \(HoradiaFormat.duration(interval))"
    }
}
