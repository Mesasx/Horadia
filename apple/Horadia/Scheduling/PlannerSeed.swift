import Foundation

/// A reusable activity template — the "biblioteca de actividades" (§37).
///
/// Creating one is intentionally minimal: name + colour + icon (§10). It is a
/// plain value type here; it maps onto `ActivityDefinition` in the persistence
/// phase.
struct LibraryActivity: Identifiable, Equatable, Hashable {
    var id = UUID()
    var name: String
    var kind: ActivityKind
    var palette: PastelColor
    var symbolName: String
    var isBuiltIn: Bool = false

    /// Default duration when dropped onto an empty stretch.
    var defaultDuration: TimeInterval = 60 * 60

    func makeItem(day: Date, start: Date, duration: TimeInterval? = nil) -> ScheduledItem {
        ScheduledItem(
            id: UUID(),
            title: name,
            kind: kind.scheduledKind,
            palette: palette,
            symbolName: symbolName,
            start: start,
            end: start.addingTimeInterval(duration ?? defaultDuration)
        )
    }
}

/// Convenience initialiser matching the argument order features use.
extension ScheduledItem {
    init(
        id: UUID = UUID(),
        title: String,
        kind: Kind,
        palette: PastelColor,
        symbolName: String,
        start: Date,
        end: Date,
        isPinned: Bool = false,
        isCompleted: Bool = false
    ) {
        self.init(
            id: id,
            title: title,
            badge: nil,
            fullTitle: nil,
            start: start,
            end: end,
            kind: kind,
            palette: palette,
            symbolName: symbolName,
            instanceKey: nil,
            isImmovable: false,
            isPinned: isPinned,
            isCompleted: isCompleted
        )
    }
}

/// The starting content for a fresh planner: the built-in library and Alba's
/// synthetic personal activities for the current week (Siesta routine §9, plus
/// Deporte / Trabajo / Estudio so every day looks lived-in). Shared by
/// `PlannerStore` and `MockScheduleRepository` so tests and the app agree.
enum PlannerSeed {

    static func library() -> [LibraryActivity] {
        [
            LibraryActivity(name: "Trabajo", kind: .work, palette: .sky, symbolName: "briefcase", isBuiltIn: true, defaultDuration: 4 * 3600),
            LibraryActivity(name: "Deporte", kind: .sport, palette: .mint, symbolName: "figure.run", isBuiltIn: true, defaultDuration: 90 * 60),
            LibraryActivity(name: "Estudio", kind: .study, palette: .lavender, symbolName: "book", isBuiltIn: true, defaultDuration: 2 * 3600),
            LibraryActivity(name: "Siesta", kind: .nap, palette: .peach, symbolName: "moon.zzz", isBuiltIn: true, defaultDuration: 3600),
        ]
    }

    static func personalItems(
        referenceDate: Date = .now,
        calendar: Calendar = HoradiaCalendar.current
    ) -> [ScheduledItem] {
        let monday = referenceDate.startOfWeek(calendar: calendar)
        var items: [ScheduledItem] = []

        func make(
            _ title: String,
            _ kind: ScheduledItem.Kind,
            _ palette: PastelColor,
            _ symbol: String,
            day: Date,
            from start: TimeOfDay,
            to end: TimeOfDay,
            pinned: Bool = false
        ) -> ScheduledItem {
            ScheduledItem(
                title: title,
                kind: kind,
                palette: palette,
                symbolName: symbol,
                start: day.settingTime(start, calendar: calendar),
                end: day.settingTime(end, calendar: calendar),
                isPinned: pinned
            )
        }

        // Siesta routine — every weekday 16:00→17:00 (§9).
        for offset in 0..<5 {
            let day = monday.adding(days: offset, calendar: calendar)
            items.append(make("Siesta", .nap, .peach, "moon.zzz",
                              day: day, from: TimeOfDay(hour: 16, minute: 0), to: TimeOfDay(hour: 17, minute: 0)))
        }

        items.append(make("Deporte", .sport, .mint, "figure.run",
                          day: monday, from: TimeOfDay(hour: 18, minute: 0), to: TimeOfDay(hour: 19, minute: 30)))

        let wednesday = monday.adding(days: 2, calendar: calendar)
        items.append(make("Trabajo", .work, .sky, "briefcase",
                          day: wednesday, from: TimeOfDay(hour: 9, minute: 0), to: TimeOfDay(hour: 13, minute: 30)))

        let thursday = monday.adding(days: 3, calendar: calendar)
        items.append(make("Estudio", .study, .lavender, "book",
                          day: thursday, from: TimeOfDay(hour: 18, minute: 30), to: TimeOfDay(hour: 20, minute: 30)))

        let saturday = monday.adding(days: 5, calendar: calendar)
        items.append(make("Pilates", .custom, .lilac, "figure.pilates",
                          day: saturday, from: TimeOfDay(hour: 11, minute: 0), to: TimeOfDay(hour: 12, minute: 0)))

        return items
    }
}
