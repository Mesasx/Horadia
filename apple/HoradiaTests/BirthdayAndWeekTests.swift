import Testing
import Foundation
@testable import Horadia

/// Product brief sections 2, 39, 41, 49 — birthday age maths and week navigation.
@Suite("Birthday & weeks")
struct BirthdayAndWeekTests {

    private let calendar = TestClock.calendar
    private let prefs = UserPreferences(birthdayMonth: 9, birthdayDay: 16, birthYear: 2004)

    // MARK: Age (section 39 — never hardcode "22")

    @Test("Age is computed for the birthday's year, not hardcoded")
    func ageFollowsYear() {
        #expect(BirthdayGreeting.age(on: TestClock.date(2026, 9, 16), birthYear: 2004, birthdayMonth: 9, birthdayDay: 16, calendar: calendar) == 22)
        #expect(BirthdayGreeting.age(on: TestClock.date(2027, 9, 16), birthYear: 2004, birthdayMonth: 9, birthdayDay: 16, calendar: calendar) == 23)
        #expect(BirthdayGreeting.age(on: TestClock.date(2030, 9, 16), birthYear: 2004, birthdayMonth: 9, birthdayDay: 16, calendar: calendar) == 26)
    }

    @Test("Greeting only appears on 16 September")
    func greetingOnlyOnBirthday() {
        #expect(BirthdayGreeting.greeting(for: TestClock.date(2026, 9, 16, 10, 0), preferences: prefs, calendar: calendar) == "🎂 Feliz 22, Alba")
        #expect(BirthdayGreeting.greeting(for: TestClock.date(2026, 9, 15, 10, 0), preferences: prefs, calendar: calendar) == nil)
        #expect(BirthdayGreeting.greeting(for: TestClock.date(2026, 9, 17, 10, 0), preferences: prefs, calendar: calendar) == nil)
    }

    // MARK: Weeks (section 41 — Monday to Sunday)

    @Test("Weeks run Monday to Sunday")
    func weekStartsMonday() {
        let wednesday = TestClock.date(2026, 9, 16)
        let days = wednesday.weekDays(calendar: calendar)
        #expect(days.count == 7)
        #expect(calendar.component(.weekday, from: days[0]) == 2)  // Monday
        #expect(calendar.component(.day, from: days[0]) == 14)
        #expect(calendar.component(.day, from: days[6]) == 20)     // Sunday
    }

    @Test("Week navigation moves in 7-day steps and returns to today")
    func weekNavigation() {
        let repo = MockScheduleRepository(referenceDate: TestClock.date(2026, 9, 16), calendar: calendar)
        let model = WeekViewModel(repository: repo, calendar: calendar, now: { TestClock.date(2026, 9, 16, 12, 0) })

        let start = model.weekStart
        #expect(model.isViewingCurrentWeek)

        model.goToNextWeek()
        #expect(calendar.dateComponents([.day], from: start, to: model.weekStart).day == 7)
        #expect(!model.isViewingCurrentWeek)

        model.goToPreviousWeek()
        model.goToPreviousWeek()
        #expect(calendar.dateComponents([.day], from: model.weekStart, to: start).day == 7)

        model.goToToday()
        #expect(model.weekStart == start)
        #expect(model.isViewingCurrentWeek)
    }

    @Test("Crossing a month boundary keeps 7-day steps")
    func monthBoundary() {
        let repo = MockScheduleRepository(referenceDate: TestClock.date(2026, 9, 28), calendar: calendar)
        let model = WeekViewModel(repository: repo, calendar: calendar, now: { TestClock.date(2026, 9, 28, 12, 0) })
        let start = model.weekStart // Monday 2026-09-28
        model.goToNextWeek()        // → Monday 2026-10-05
        #expect(calendar.component(.month, from: model.weekStart) == 10)
        #expect(calendar.component(.day, from: model.weekStart) == 5)
        #expect(calendar.dateComponents([.day], from: start, to: model.weekStart).day == 7)
    }
}
