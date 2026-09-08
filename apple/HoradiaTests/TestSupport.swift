import Foundation
@testable import Horadia

/// Shared helpers for the Horadia test suite.
enum TestClock {
    /// A fixed, timezone-stable calendar (Europe/Madrid, Monday-first) so date
    /// math in tests is deterministic (product brief section 41).
    static var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Madrid")!
        calendar.firstWeekday = 2
        calendar.minimumDaysInFirstWeek = 4
        return calendar
    }

    /// Builds a `Date` for the given wall-clock components in Europe/Madrid.
    static func date(_ y: Int, _ mo: Int, _ d: Int, _ h: Int = 0, _ mi: Int = 0) -> Date {
        var components = DateComponents()
        components.year = y; components.month = mo; components.day = d
        components.hour = h; components.minute = mi
        return calendar.date(from: components)!
    }
}

extension Date {
    /// `at(9, 30)` → same calendar day, 09:30 (Europe/Madrid).
    func at(_ hour: Int, _ minute: Int) -> Date {
        TestClock.calendar.date(bySettingHour: hour, minute: minute, second: 0, of: self)!
    }
}

func slot(_ day: Date, _ startH: Int, _ startM: Int, _ endH: Int, _ endM: Int) -> TimeSlot {
    TimeSlot(start: day.at(startH, startM), end: day.at(endH, endM))
}
