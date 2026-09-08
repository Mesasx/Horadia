import Foundation

/// Calendar / date helpers shared across Horadia.
///
/// Horadia reasons about *weeks that start on Monday* (European regional layout,
/// section 41 of the product brief) and about wall-clock times snapped to a
/// 15-minute grid (section 11). Everything here is timezone-agnostic: the
/// active timezone comes from `HoradiaCalendar.current`, defaulting to
/// `Europe/Madrid` but never hardcoded into business logic.
enum HoradiaCalendar {

    /// The calendar Horadia uses for every date computation.
    ///
    /// - Monday is the first weekday.
    /// - The timezone follows `TimeZoneProvider.current` so tests can pin it.
    static var current: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZoneProvider.current
        calendar.firstWeekday = 2 // Monday
        calendar.minimumDaysInFirstWeek = 4 // ISO-8601 week rules
        return calendar
    }
}

/// Indirection so the active timezone can be swapped in tests without touching
/// call sites. Production uses `Europe/Madrid`; if that identifier is somehow
/// unavailable we fall back to the device timezone rather than crashing.
enum TimeZoneProvider {
    static var current: TimeZone = TimeZone(identifier: "Europe/Madrid") ?? .autoupdatingCurrent
}

// MARK: - Time-of-day

/// A wall-clock time of day (hour + minute), independent of any calendar date.
///
/// Used by routines, the university schedule JSON and the mock data. Resolving
/// it against a concrete day produces a `Date`.
struct TimeOfDay: Codable, Hashable, Comparable, CustomStringConvertible {
    var hour: Int
    var minute: Int

    init(hour: Int, minute: Int) {
        self.hour = hour
        self.minute = minute
    }

    /// Parses `"HH:mm"` (e.g. `"09:00"`, `"16:45"`). Returns `nil` on malformed input.
    init?(_ string: String) {
        let parts = string.split(separator: ":")
        guard parts.count == 2,
              let hour = Int(parts[0]),
              let minute = Int(parts[1]),
              (0...23).contains(hour),
              (0...59).contains(minute)
        else { return nil }
        self.hour = hour
        self.minute = minute
    }

    var minutesSinceMidnight: Int { hour * 60 + minute }

    static func < (lhs: TimeOfDay, rhs: TimeOfDay) -> Bool {
        lhs.minutesSinceMidnight < rhs.minutesSinceMidnight
    }

    var description: String { String(format: "%02d:%02d", hour, minute) }

    /// 09:00 — the default lower bound of a Horadia day (section 6).
    static let dayStartDefault = TimeOfDay(hour: 9, minute: 0)
}

extension Date {

    /// Resolves a `TimeOfDay` against the calendar day that contains `self`.
    func settingTime(_ time: TimeOfDay, calendar: Calendar = HoradiaCalendar.current) -> Date {
        calendar.date(
            bySettingHour: time.hour,
            minute: time.minute,
            second: 0,
            of: self
        ) ?? self
    }

    /// Start of the calendar day (00:00) containing `self`.
    func startOfDay(calendar: Calendar = HoradiaCalendar.current) -> Date {
        calendar.startOfDay(for: self)
    }

    /// Midnight that *ends* the day containing `self` (00:00 of the next day).
    /// This is the default upper bound of a Horadia day (section 6).
    func endOfDayMidnight(calendar: Calendar = HoradiaCalendar.current) -> Date {
        calendar.date(byAdding: .day, value: 1, to: startOfDay(calendar: calendar)) ?? self
    }

    func adding(days: Int, calendar: Calendar = HoradiaCalendar.current) -> Date {
        calendar.date(byAdding: .day, value: days, to: self) ?? self
    }

    func adding(minutes: Int, calendar: Calendar = HoradiaCalendar.current) -> Date {
        calendar.date(byAdding: .minute, value: minutes, to: self) ?? self
    }

    func isSameDay(as other: Date, calendar: Calendar = HoradiaCalendar.current) -> Bool {
        calendar.isDate(self, inSameDayAs: other)
    }

    /// Monday 00:00 of the week containing `self`.
    func startOfWeek(calendar: Calendar = HoradiaCalendar.current) -> Date {
        let components = calendar.dateComponents(
            [.yearForWeekOfYear, .weekOfYear],
            from: self
        )
        return calendar.date(from: components) ?? startOfDay(calendar: calendar)
    }

    /// The seven days Monday…Sunday of the week containing `self`.
    func weekDays(calendar: Calendar = HoradiaCalendar.current) -> [Date] {
        let monday = startOfWeek(calendar: calendar)
        return (0..<7).map { monday.adding(days: $0, calendar: calendar) }
    }
}

// MARK: - 15-minute grid (section 11)

enum TimeGrid {
    /// Horadia's minimum time unit: 15 minutes.
    static let step: TimeInterval = 15 * 60

    /// Minimum duration of any activity: 15 minutes (section 11).
    static let minimumActivityDuration: TimeInterval = 15 * 60

    /// A gap must be at least this long to surface as a "Libre" block (section 7).
    static let minimumFreeDuration: TimeInterval = 15 * 60

    /// Snaps `date` to the nearest 15-minute boundary of its day.
    static func snap(_ date: Date, calendar: Calendar = HoradiaCalendar.current) -> Date {
        let reference = date.startOfDay(calendar: calendar)
        let elapsed = date.timeIntervalSince(reference)
        let snapped = (elapsed / step).rounded() * step
        return reference.addingTimeInterval(snapped)
    }
}
