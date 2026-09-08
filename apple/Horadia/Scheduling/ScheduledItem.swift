import Foundation

/// A concrete, placed block on a day's timeline — the value type that views and
/// the timeline builder consume. It is a flattened projection of the persistence
/// models (`ScheduledActivity`, `UniversityEvent`, routines, external calendar
/// events) so the UI never touches SwiftData directly (section 48).
struct ScheduledItem: Identifiable, Equatable {
    let id: UUID
    /// Compact label shown on the card (e.g. the subject code `"BI"`).
    var title: String
    /// Optional line shown above the title, e.g. `"EXAMEN · BI"` (section 25).
    var badge: String?
    /// Full name for VoiceOver / detail views, when `title` is an abbreviation.
    var fullTitle: String? = nil
    var start: Date
    var end: Date
    var kind: Kind
    var palette: PastelColor
    var symbolName: String

    /// Stable key for a university instance (`UniversityEventOverride.key`), used
    /// to omit/restore a single class on a single day (section 14). `nil` for
    /// personal activities.
    var instanceKey: String? = nil

    // Flags (sections 14, 17, 20)
    /// University lectures: can be lifted visually but never re-timed (section 14).
    var isImmovable: Bool = false
    /// Locked against accidental drags until explicitly unlocked (section 17).
    var isPinned: Bool = false
    /// Optional "done" mark for personal activities (section 20).
    var isCompleted: Bool = false

    var slot: TimeSlot { TimeSlot(start: start, end: end) }
    var duration: TimeInterval { slot.duration }

    /// `true` for anything the user may freely move / resize / delete.
    var isPersonal: Bool { kind.isPersonal }

    enum Kind: Equatable, Hashable {
        case university(UniversityEventKind)
        case work
        case sport
        case study
        case nap
        case custom
        case externalCalendar

        var isPersonal: Bool {
            switch self {
            case .university, .externalCalendar: return false
            case .work, .sport, .study, .nap, .custom: return true
            }
        }

        /// Non-colour accessibility differentiator (section 45): a short noun.
        var accessibilityCategory: String {
            switch self {
            case .university(.lecture): return "Clase"
            case .university(.practice): return "Práctica"
            case .university(.exam): return "Examen"
            case .university(.holiday): return "Festivo"
            case .university(.vacation): return "Vacaciones"
            case .work: return "Trabajo"
            case .sport: return "Deporte"
            case .study: return "Estudio"
            case .nap: return "Siesta"
            case .custom: return "Actividad"
            case .externalCalendar: return "Calendario"
            }
        }
    }
}

/// One row of a laid-out day: either a real item or a computed "Libre" gap.
enum TimelineBlock: Identifiable, Equatable {
    case item(ScheduledItem)
    case free(TimeSlot)

    var id: String {
        switch self {
        case .item(let item): return "item-\(item.id.uuidString)"
        case .free(let slot): return "free-\(slot.start.timeIntervalSinceReferenceDate)"
        }
    }

    var slot: TimeSlot {
        switch self {
        case .item(let item): return item.slot
        case .free(let slot): return slot
        }
    }

    var start: Date { slot.start }
    var end: Date { slot.end }
}

/// A fully laid-out single day, ready to render (section 5, 33).
struct DayTimeline: Equatable {
    var date: Date
    /// Effective top of the timeline (09:00, or earlier if an activity beats it).
    var start: Date
    /// Bottom of the timeline (00:00 next day).
    var end: Date
    var blocks: [TimelineBlock]
    /// A discreet note shown at the top on holidays / vacation days (section 26).
    var dayNote: String?

    var items: [ScheduledItem] {
        blocks.compactMap { if case .item(let i) = $0 { return i } else { return nil } }
    }

    static func build(
        date: Date,
        activities: [ScheduledItem],
        dayNote: String? = nil,
        calendar: Calendar = HoradiaCalendar.current
    ) -> DayTimeline {
        let bounds = FreeTimeEngine.DayBounds.standard(for: date, calendar: calendar)
        let layout = FreeTimeEngine.layout(
            activities: activities.map(\.slot),
            bounds: bounds
        )

        // Clamp item display to the day window so a midnight-crosser paints only
        // its portion of *this* day.
        let window = TimeSlot(start: layout.effectiveStart, end: layout.end)
        let itemBlocks: [TimelineBlock] = activities.compactMap { item in
            guard let visible = item.slot.clamped(to: window) else { return nil }
            var projected = item
            projected.start = visible.start
            projected.end = visible.end
            return .item(projected)
        }
        let freeBlocks = layout.freeSlots.map { TimelineBlock.free($0) }

        let blocks = (itemBlocks + freeBlocks).sorted { $0.start < $1.start }
        return DayTimeline(
            date: date,
            start: layout.effectiveStart,
            end: layout.end,
            blocks: blocks,
            dayNote: dayNote
        )
    }
}
