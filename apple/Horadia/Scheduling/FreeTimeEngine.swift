import Foundation

/// Computes the "Libre" (free) blocks of a day (product brief section 7).
///
/// Rules implemented here:
/// - A day is bounded below by 09:00, **unless** an activity starts earlier, in
///   which case the day starts at that activity (section 6).
/// - A day is bounded above by 00:00 (next midnight). Activities crossing
///   midnight are clamped for the current day; the remainder belongs to the
///   next day and is handled by the caller (section 6).
/// - Every uncovered stretch **≥ 15 minutes** becomes exactly one `Libre`
///   block — never split into 15/30-minute pieces (section 7).
/// - Uncovered stretches **< 15 minutes** produce no block at all (section 7).
/// - A day with no activities is a single `Libre` block 09:00→00:00 (section 42).
///
/// The engine is pure: value types in, value types out, no clock access.
enum FreeTimeEngine {

    /// The lower/upper wall-clock bounds of a single day's timeline.
    struct DayBounds: Equatable {
        /// Default lower bound, normally 09:00 of the day.
        var defaultStart: Date
        /// Upper bound, normally 00:00 of the following day.
        var end: Date

        /// Builds bounds for the calendar day containing `date`.
        static func standard(
            for date: Date,
            calendar: Calendar = HoradiaCalendar.current
        ) -> DayBounds {
            DayBounds(
                start: date.settingTime(.dayStartDefault, calendar: calendar),
                end: date.endOfDayMidnight(calendar: calendar)
            )
        }

        init(start: Date, end: Date) {
            self.defaultStart = start
            self.end = end
        }
    }

    /// Result of laying out a day: the free gaps, plus the effective start the
    /// timeline should scroll to (may be earlier than 09:00).
    struct Layout: Equatable {
        var effectiveStart: Date
        var end: Date
        var freeSlots: [TimeSlot]
    }

    /// - Parameters:
    ///   - activities: the placed activities for this day. May overlap each
    ///     other and may extend past `bounds.end` (midnight crossing).
    ///   - bounds: the day's wall-clock window.
    ///   - minimumFreeDuration: gaps shorter than this are ignored (default 15m).
    static func layout(
        activities: [TimeSlot],
        bounds: DayBounds,
        minimumFreeDuration: TimeInterval = TimeGrid.minimumFreeDuration
    ) -> Layout {
        let dayWindow = TimeSlot(start: earliestPossibleStart(bounds), end: bounds.end)

        // Project every activity onto the day window (drops anything fully
        // outside it, clamps midnight-crossing tails to `bounds.end`).
        let clamped = activities.compactMap { $0.clamped(to: dayWindow) }
        let busy = clamped.mergedBusyIntervals()

        // The day starts at 09:00, or earlier if an activity beats it (section 6).
        let effectiveStart: Date
        if let firstBusyStart = busy.first?.start, firstBusyStart < bounds.defaultStart {
            effectiveStart = firstBusyStart
        } else {
            effectiveStart = bounds.defaultStart
        }

        // Empty day → one full-height Libre block (section 42).
        guard !busy.isEmpty else {
            return Layout(
                effectiveStart: effectiveStart,
                end: bounds.end,
                freeSlots: [TimeSlot(start: effectiveStart, end: bounds.end)]
            )
        }

        var freeSlots: [TimeSlot] = []
        var cursor = effectiveStart

        for interval in busy {
            appendGap(from: cursor, to: interval.start, into: &freeSlots, minimum: minimumFreeDuration)
            cursor = max(cursor, interval.end)
        }
        appendGap(from: cursor, to: bounds.end, into: &freeSlots, minimum: minimumFreeDuration)

        return Layout(effectiveStart: effectiveStart, end: bounds.end, freeSlots: freeSlots)
    }

    /// Convenience returning just the free slots.
    static func freeSlots(
        activities: [TimeSlot],
        bounds: DayBounds,
        minimumFreeDuration: TimeInterval = TimeGrid.minimumFreeDuration
    ) -> [TimeSlot] {
        layout(
            activities: activities,
            bounds: bounds,
            minimumFreeDuration: minimumFreeDuration
        ).freeSlots
    }

    // MARK: - Private

    /// An activity may legitimately start before 09:00 (e.g. 08:00). Allow the
    /// window to open up to 12 hours earlier so such activities are not dropped,
    /// without letting a stray far-past timestamp swallow the whole day.
    private static func earliestPossibleStart(_ bounds: DayBounds) -> Date {
        bounds.defaultStart.addingTimeInterval(-12 * 3600)
    }

    private static func appendGap(
        from start: Date,
        to end: Date,
        into slots: inout [TimeSlot],
        minimum: TimeInterval
    ) {
        let gap = end.timeIntervalSince(start)
        guard gap >= minimum else { return } // < 15 min → no Libre block
        slots.append(TimeSlot(start: start, end: end))
    }
}
