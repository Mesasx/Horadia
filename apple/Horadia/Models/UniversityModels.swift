import Foundation
import SwiftData

// MARK: - University domain (product brief sections 21–26, 38)

/// The five kinds of university event (section 21).
enum UniversityEventKind: String, Codable, CaseIterable, Sendable {
    case lecture   // clase
    case practice  // práctica
    case exam      // examen
    case holiday   // festivo
    case vacation  // vacaciones
}

/// Practice group. Alba is *always* G1, and the source data's `Gr1` is an alias
/// for `G1` (section 22). Any other group is filtered out on import.
enum PracticeGroup: String, Codable, Sendable {
    case g1

    /// Normalises raw strings from the DAMERO ("G1", "Gr1", "GRUPO 1", …).
    /// Returns `nil` for groups Alba does not belong to (G2/G3/G4/Gr2…).
    static func normalized(from raw: String?) -> PracticeGroup? {
        guard let raw else { return nil }
        let cleaned = raw
            .uppercased()
            .replacingOccurrences(of: "GRUPO", with: "G")
            .replacingOccurrences(of: "GR", with: "G")
            .replacingOccurrences(of: " ", with: "")
        return cleaned == "G1" ? .g1 : nil
    }
}

/// A university subject (asignatura). Colour is user-editable (section 38);
/// the official timetable is not.
@Model
final class UniversitySubject {
    /// Short code as used by the DAMERO, e.g. `"BI"`, `"TF II"`, `"FGFG"`.
    @Attribute(.unique) var code: String
    var fullName: String
    var colorTokenRaw: String
    var iconSystemName: String

    init(code: String, fullName: String, colorToken: PastelColor, iconSystemName: String = "book.closed") {
        self.code = code
        self.fullName = fullName
        self.colorTokenRaw = colorToken.rawValue
        self.iconSystemName = iconSystemName
    }

    var colorToken: PastelColor {
        get { PastelColor(rawValue: colorTokenRaw) ?? .stone }
        set { colorTokenRaw = newValue.rawValue }
    }
}

/// A single, explicitly-dated university event. Per section 23 the calendar is
/// **not** generated purely from recurrence — every event is materialised for a
/// concrete date, either from the imported DAMERO or (later) manually.
@Model
final class UniversityEvent {
    var subjectCode: String
    /// The calendar day, normalised to 00:00 in the active timezone.
    var day: Date
    var startMinutes: Int          // minutes since midnight
    var endMinutes: Int            // exams may equal start (open-ended)
    var kindRaw: String
    var location: String?
    /// `true` when this row came from the DAMERO import, `false` if hand-created
    /// (section 24: imported events must be distinguishable).
    var isImported: Bool

    init(
        subjectCode: String,
        day: Date,
        start: TimeOfDay,
        end: TimeOfDay,
        kind: UniversityEventKind,
        location: String? = nil,
        isImported: Bool = true
    ) {
        self.subjectCode = subjectCode
        self.day = day
        self.startMinutes = start.minutesSinceMidnight
        self.endMinutes = end.minutesSinceMidnight
        self.kindRaw = kind.rawValue
        self.location = location
        self.isImported = isImported
    }

    var kind: UniversityEventKind {
        get { UniversityEventKind(rawValue: kindRaw) ?? .lecture }
        set { kindRaw = newValue.rawValue }
    }

    var start: TimeOfDay { TimeOfDay(hour: startMinutes / 60, minute: startMinutes % 60) }
    var end: TimeOfDay { TimeOfDay(hour: endMinutes / 60, minute: endMinutes % 60) }
}

/// Per-instance override of a university event — currently only "omitted"
/// (section 14: "No asistir" removes a class from *one* day without touching the
/// official schedule, and must be restorable).
@Model
final class UniversityEventOverride {
    /// Stable key identifying the overridden instance: `"\(subjectCode)|\(dayKey)|\(startMinutes)"`.
    @Attribute(.unique) var instanceKey: String
    var omitted: Bool
    var createdAt: Date

    init(instanceKey: String, omitted: Bool = true, createdAt: Date = .now) {
        self.instanceKey = instanceKey
        self.omitted = omitted
        self.createdAt = createdAt
    }

    static func key(subjectCode: String, day: Date, startMinutes: Int, calendar: Calendar = HoradiaCalendar.current) -> String {
        let dayKey = DateFormatter.horadiaDayKey.string(from: day.startOfDay(calendar: calendar))
        return "\(subjectCode)|\(dayKey)|\(startMinutes)"
    }
}

extension DateFormatter {
    /// `yyyy-MM-dd`, POSIX locale — stable across regions, used for keys and for
    /// parsing the `"date"` field of `UniversitySchedule.json` (section 24).
    static let horadiaDayKey: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZoneProvider.current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}
