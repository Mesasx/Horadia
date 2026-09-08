import Foundation
import Observation

/// Drives the Estadísticas screen (product brief section 35).
@Observable
final class StatsViewModel {

    enum Range: CaseIterable {
        case week, month
        var displayName: String { self == .week ? "Semana" : "Mes" }
    }

    struct Row: Identifiable {
        var category: StatsEngine.Category
        var hours: Double
        var id: String { category.rawValue }
        var valueText: String {
            let rounded = (hours * 10).rounded() / 10
            return "\(rounded.formatted(.number.precision(.fractionLength(0...1)))) h"
        }
    }

    private let repository: ScheduleRepository
    private let calendar: Calendar
    private let clock: () -> Date

    var range: Range = .week

    init(
        repository: ScheduleRepository,
        calendar: Calendar = HoradiaCalendar.current,
        now: @escaping () -> Date = { .now }
    ) {
        self.repository = repository
        self.calendar = calendar
        self.clock = now
    }

    private var dates: [Date] {
        let today = clock()
        switch range {
        case .week:
            return today.weekDays(calendar: calendar)
        case .month:
            guard let monthInterval = calendar.dateInterval(of: .month, for: today) else {
                return today.weekDays(calendar: calendar)
            }
            var days: [Date] = []
            var cursor = monthInterval.start
            while cursor < monthInterval.end {
                days.append(cursor)
                cursor = cursor.adding(days: 1, calendar: calendar)
            }
            return days
        }
    }

    var rows: [Row] {
        let totals = StatsEngine.totals(for: dates.map { repository.timeline(for: $0) })
        return StatsEngine.Category.allCases.map { category in
            Row(category: category, hours: totals.hours(category))
        }
    }
}
