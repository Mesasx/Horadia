import Foundation
import SwiftData

/// Single-row model holding app-wide user settings (product brief section 40).
///
/// Kept deliberately small for Phase 1. External-calendar / iCloud toggles are
/// declared but unused until their phases.
@Model
final class UserPreferences {
    @Attribute(.unique) var id: String
    var ownerName: String
    /// Birthday, stored as month/day; the year is only used to compute age.
    var birthdayMonth: Int
    var birthdayDay: Int
    var birthYear: Int

    /// Section 28 — Apple Calendar integration, off by default.
    var externalCalendarEnabled: Bool
    /// Section 29 — iCloud sync, on by default but degrades gracefully offline.
    var iCloudSyncEnabled: Bool

    /// Section 5 — how many day columns the Semana view shows at once.
    var weekVisibleDayCount: Int

    init(
        id: String = "primary",
        ownerName: String = "Alba",
        birthdayMonth: Int = 9,
        birthdayDay: Int = 16,
        birthYear: Int = 2004,
        externalCalendarEnabled: Bool = false,
        iCloudSyncEnabled: Bool = true,
        weekVisibleDayCount: Int = 3
    ) {
        self.id = id
        self.ownerName = ownerName
        self.birthdayMonth = birthdayMonth
        self.birthdayDay = birthdayDay
        self.birthYear = birthYear
        self.externalCalendarEnabled = externalCalendarEnabled
        self.iCloudSyncEnabled = iCloudSyncEnabled
        self.weekVisibleDayCount = weekVisibleDayCount
    }
}

/// Birthday helpers (product brief sections 2 & 39).
///
/// The greeting must show the *correct* age automatically each year — never a
/// hardcoded "22" (section 39).
enum BirthdayGreeting {

    /// Whether `date` falls on the owner's birthday.
    static func isBirthday(
        _ date: Date,
        month: Int,
        day: Int,
        calendar: Calendar = HoradiaCalendar.current
    ) -> Bool {
        let components = calendar.dateComponents([.month, .day], from: date)
        return components.month == month && components.day == day
    }

    /// The age the owner reaches on the birthday occurring in `date`'s year.
    ///
    /// Example: born 2004-09-16, `date` in 2026 → 22.
    static func age(
        on date: Date,
        birthYear: Int,
        birthdayMonth: Int,
        birthdayDay: Int,
        calendar: Calendar = HoradiaCalendar.current
    ) -> Int {
        let year = calendar.component(.year, from: date)
        var birthday = DateComponents()
        birthday.year = birthYear
        birthday.month = birthdayMonth
        birthday.day = birthdayDay
        guard let birthDate = calendar.date(from: birthday) else { return 0 }

        var thisYearBirthday = DateComponents()
        thisYearBirthday.year = year
        thisYearBirthday.month = birthdayMonth
        thisYearBirthday.day = birthdayDay
        guard let occurrence = calendar.date(from: thisYearBirthday) else { return 0 }

        return calendar.dateComponents([.year], from: birthDate, to: occurrence).year ?? 0
    }

    /// The discreet greeting string, e.g. `"🎂 Feliz 22, Alba"` (section 39),
    /// or `nil` when `date` is not the birthday.
    static func greeting(
        for date: Date,
        preferences: UserPreferences,
        calendar: Calendar = HoradiaCalendar.current
    ) -> String? {
        guard isBirthday(
            date,
            month: preferences.birthdayMonth,
            day: preferences.birthdayDay,
            calendar: calendar
        ) else { return nil }

        let age = age(
            on: date,
            birthYear: preferences.birthYear,
            birthdayMonth: preferences.birthdayMonth,
            birthdayDay: preferences.birthdayDay,
            calendar: calendar
        )
        return "🎂 Feliz \(age), \(preferences.ownerName)"
    }
}
