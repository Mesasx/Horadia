import Foundation
import SwiftData

// MARK: - Personal activity domain (product brief sections 8–10, 16–20, 37)

/// The type of a personal activity. Universidad is deliberately *not* here —
/// that lives in `UniversityEvent`.
enum ActivityKind: String, Codable, CaseIterable, Sendable {
    case work    // Trabajo
    case sport   // Deporte
    case study   // Estudio
    case nap     // Siesta
    case custom  // actividad personalizada

    var defaultTitle: String {
        switch self {
        case .work: return "Trabajo"
        case .sport: return "Deporte"
        case .study: return "Estudio"
        case .nap: return "Siesta"
        case .custom: return "Actividad"
        }
    }

    var defaultSymbol: String {
        switch self {
        case .work: return "briefcase"
        case .sport: return "figure.run"
        case .study: return "book"
        case .nap: return "moon.zzz"
        case .custom: return "sparkles"
        }
    }

    var defaultColor: PastelColor {
        switch self {
        case .work: return .sky
        case .sport: return .mint
        case .study: return .lavender
        case .nap: return .peach
        case .custom: return .stone
        }
    }

    var scheduledKind: ScheduledItem.Kind {
        switch self {
        case .work: return .work
        case .sport: return .sport
        case .study: return .study
        case .nap: return .nap
        case .custom: return .custom
        }
    }
}

/// A reusable activity template in the library (section 37). Creating one is
/// intentionally minimal: name + colour + icon (section 10). Duration, dates and
/// rules are *not* required here.
@Model
final class ActivityDefinition {
    @Attribute(.unique) var id: UUID
    var title: String
    var kindRaw: String
    var colorTokenRaw: String
    var iconSystemName: String
    /// Built-in templates (Trabajo/Deporte/Estudio/Siesta) vs. user-created.
    var isBuiltIn: Bool
    var createdAt: Date

    @Relationship(deleteRule: .cascade, inverse: \ScheduledActivity.definition)
    var scheduledInstances: [ScheduledActivity] = []

    @Relationship(deleteRule: .cascade, inverse: \NotificationPreference.definition)
    var notificationPreference: NotificationPreference?

    init(
        id: UUID = UUID(),
        title: String,
        kind: ActivityKind,
        colorToken: PastelColor,
        iconSystemName: String,
        isBuiltIn: Bool = false,
        createdAt: Date = .now
    ) {
        self.id = id
        self.title = title
        self.kindRaw = kind.rawValue
        self.colorTokenRaw = colorToken.rawValue
        self.iconSystemName = iconSystemName
        self.isBuiltIn = isBuiltIn
        self.createdAt = createdAt
    }

    var kind: ActivityKind {
        get { ActivityKind(rawValue: kindRaw) ?? .custom }
        set { kindRaw = newValue.rawValue }
    }

    var colorToken: PastelColor {
        get { PastelColor(rawValue: colorTokenRaw) ?? .stone }
        set { colorTokenRaw = newValue.rawValue }
    }
}

/// A concrete placement of an activity on a specific day and time.
///
/// May be a one-off, or the instance of a routine (section 16). Instances always
/// win over the routine so a single day can diverge without breaking the rule.
@Model
final class ScheduledActivity {
    @Attribute(.unique) var id: UUID
    var definition: ActivityDefinition?
    var routine: Routine?

    /// The calendar day (00:00, active timezone).
    var day: Date
    var startMinutes: Int
    /// Duration in minutes. Activities crossing midnight simply have
    /// `startMinutes + durationMinutes > 1440` (section 6).
    var durationMinutes: Int

    /// Section 17 — locked against accidental drags.
    var isPinned: Bool
    /// Section 16 — this instance was manually edited away from its routine.
    var isRoutineException: Bool

    /// Optional per-instance title/colour override (e.g. duplicated "Trabajo"
    /// with a different shift). `nil` → inherit from `definition`.
    var titleOverride: String?
    var colorTokenOverride: String?

    var createdAt: Date

    init(
        id: UUID = UUID(),
        definition: ActivityDefinition?,
        routine: Routine? = nil,
        day: Date,
        start: TimeOfDay,
        durationMinutes: Int,
        isPinned: Bool = false,
        isRoutineException: Bool = false,
        createdAt: Date = .now
    ) {
        self.id = id
        self.definition = definition
        self.routine = routine
        self.day = day
        self.startMinutes = start.minutesSinceMidnight
        self.durationMinutes = durationMinutes
        self.isPinned = isPinned
        self.isRoutineException = isRoutineException
        self.createdAt = createdAt
    }

    var start: TimeOfDay { TimeOfDay(hour: (startMinutes / 60) % 24, minute: startMinutes % 60) }

    var title: String { titleOverride ?? definition?.title ?? kind.defaultTitle }

    var kind: ActivityKind { definition?.kind ?? .custom }

    var colorToken: PastelColor {
        if let raw = colorTokenOverride, let token = PastelColor(rawValue: raw) { return token }
        return definition?.colorToken ?? kind.defaultColor
    }

    var iconSystemName: String { definition?.iconSystemName ?? kind.defaultSymbol }
}

/// Recurrence rule for an activity (section 16).
@Model
final class Routine {
    @Attribute(.unique) var id: UUID
    var definition: ActivityDefinition?
    var frequencyRaw: String
    /// For `.custom` frequency: weekday numbers (1 = Sunday … 7 = Saturday,
    /// Foundation convention). Monday–Friday is `[2,3,4,5,6]`.
    var customWeekdays: [Int]
    var startMinutes: Int
    var durationMinutes: Int
    var isActive: Bool

    @Relationship(deleteRule: .nullify, inverse: \ScheduledActivity.routine)
    var instances: [ScheduledActivity] = []

    init(
        id: UUID = UUID(),
        definition: ActivityDefinition?,
        frequency: Frequency,
        customWeekdays: [Int] = [],
        start: TimeOfDay,
        durationMinutes: Int,
        isActive: Bool = true
    ) {
        self.id = id
        self.definition = definition
        self.frequencyRaw = frequency.rawValue
        self.customWeekdays = customWeekdays
        self.startMinutes = start.minutesSinceMidnight
        self.durationMinutes = durationMinutes
        self.isActive = isActive
    }

    var frequency: Frequency {
        get { Frequency(rawValue: frequencyRaw) ?? .none }
        set { frequencyRaw = newValue.rawValue }
    }

    var start: TimeOfDay { TimeOfDay(hour: startMinutes / 60, minute: startMinutes % 60) }

    enum Frequency: String, Codable, CaseIterable, Sendable {
        case none          // No repetir
        case daily         // Todos los días
        case weekdays      // De lunes a viernes
        case weeklyOnDay   // Cada semana este día
        case custom        // Personalizado

        var displayName: String {
            switch self {
            case .none: return "No repetir"
            case .daily: return "Todos los días"
            case .weekdays: return "De lunes a viernes"
            case .weeklyOnDay: return "Cada semana este día"
            case .custom: return "Personalizado"
            }
        }
    }
}

/// Optional "realizada" mark for a personal activity instance (section 20).
@Model
final class ActivityCompletion {
    @Attribute(.unique) var scheduledActivityID: UUID
    var completedAt: Date

    init(scheduledActivityID: UUID, completedAt: Date = .now) {
        self.scheduledActivityID = scheduledActivityID
        self.completedAt = completedAt
    }
}

/// Per-activity notification configuration (section 27). Defaults differ by
/// kind; the user can override any of them.
@Model
final class NotificationPreference {
    @Attribute(.unique) var id: UUID
    var definition: ActivityDefinition?
    /// Minutes-before-start at which to fire reminders. Empty = no alert.
    var leadMinutes: [Int]

    init(id: UUID = UUID(), definition: ActivityDefinition?, leadMinutes: [Int]) {
        self.id = id
        self.definition = definition
        self.leadMinutes = leadMinutes
    }

    /// Section 27 defaults.
    static func defaultLeadMinutes(for kind: ActivityKind) -> [Int] {
        switch kind {
        case .work: return [30]
        case .sport, .study, .nap, .custom: return []
        }
    }

    /// Exams: 24 h + 1 h before (section 25 / 27).
    static let examLeadMinutes = [24 * 60, 60]
}
