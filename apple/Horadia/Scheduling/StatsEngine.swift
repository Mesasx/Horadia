import Foundation

/// Aggregates timelines into per-category time totals (product brief section 35).
///
/// Pure function of `[DayTimeline]` → totals, so it is trivially testable and
/// reused by both the Estadísticas screen and (later) widgets.
enum StatsEngine {

    enum Category: String, CaseIterable, Identifiable {
        case university, work, study, sport, nap, free
        var id: String { rawValue }

        var displayName: String {
            switch self {
            case .university: return "Universidad"
            case .work: return "Trabajo"
            case .study: return "Estudio"
            case .sport: return "Deporte"
            case .nap: return "Siesta"
            case .free: return "Libre"
            }
        }

        var palette: PastelColor {
            switch self {
            case .university: return .periwinkle
            case .work: return .sky
            case .study: return .lavender
            case .sport: return .mint
            case .nap: return .peach
            case .free: return .stone
            }
        }
    }

    struct Totals: Equatable {
        /// Seconds per category.
        var byCategory: [Category: TimeInterval]
        /// Section 35 — university time that was scheduled but omitted (section 14).
        var universityOmittedSeconds: TimeInterval

        func seconds(_ category: Category) -> TimeInterval { byCategory[category] ?? 0 }
        func hours(_ category: Category) -> Double { seconds(category) / 3600 }

        static let zero = Totals(byCategory: [:], universityOmittedSeconds: 0)
    }

    static func totals(for timelines: [DayTimeline]) -> Totals {
        var byCategory: [Category: TimeInterval] = [:]

        for timeline in timelines {
            for block in timeline.blocks {
                switch block {
                case .free(let slot):
                    byCategory[.free, default: 0] += slot.duration
                case .item(let item):
                    guard let category = category(for: item.kind) else { continue }
                    byCategory[category, default: 0] += item.duration
                }
            }
        }

        return Totals(byCategory: byCategory, universityOmittedSeconds: 0)
    }

    static func category(for kind: ScheduledItem.Kind) -> Category? {
        switch kind {
        case .university(.lecture), .university(.practice), .university(.exam): return .university
        case .university(.holiday), .university(.vacation): return nil
        case .work: return .work
        case .study: return .study
        case .sport: return .sport
        case .nap: return .nap
        case .externalCalendar, .custom: return nil
        }
    }
}
