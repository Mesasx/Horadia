import Foundation

/// Shared, locale-aware formatters (product brief section 41).
enum HoradiaFormat {

    /// `"09:00"` — 24h wall-clock, fixed so the timeline grid stays aligned
    /// regardless of the device's 12/24h setting.
    static func time(_ date: Date, calendar: Calendar = HoradiaCalendar.current) -> String {
        let components = calendar.dateComponents([.hour, .minute], from: date)
        return String(format: "%02d:%02d", components.hour ?? 0, components.minute ?? 0)
    }

    /// `"09:00–10:30"`.
    static func range(_ start: Date, _ end: Date, calendar: Calendar = HoradiaCalendar.current) -> String {
        "\(time(start, calendar: calendar))–\(time(end, calendar: calendar))"
    }

    /// Localised weekday, full: `"lunes"`.
    static func weekdayLong(_ date: Date, locale: Locale = .current) -> String {
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.calendar = HoradiaCalendar.current
        formatter.setLocalizedDateFormatFromTemplate("EEEE")
        return formatter.string(from: date)
    }

    /// Localised weekday, short: `"lun"`.
    static func weekdayShort(_ date: Date, locale: Locale = .current) -> String {
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.calendar = HoradiaCalendar.current
        formatter.setLocalizedDateFormatFromTemplate("EEE")
        return formatter.string(from: date).replacingOccurrences(of: ".", with: "")
    }

    /// `"16 sept"`.
    static func dayMonth(_ date: Date, locale: Locale = .current) -> String {
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.calendar = HoradiaCalendar.current
        formatter.setLocalizedDateFormatFromTemplate("d MMM")
        return formatter.string(from: date)
    }

    /// Human duration, e.g. `"1 h 30 min"`, `"45 min"`.
    static func duration(_ interval: TimeInterval) -> String {
        let totalMinutes = Int((interval / 60).rounded())
        let hours = totalMinutes / 60
        let minutes = totalMinutes % 60
        switch (hours, minutes) {
        case (0, _): return "\(minutes) min"
        case (_, 0): return "\(hours) h"
        default: return "\(hours) h \(minutes) min"
        }
    }
}
