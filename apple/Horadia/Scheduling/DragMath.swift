import Foundation
import CoreGraphics

/// Pure geometry for the drag-and-drop layer (product brief §11, §12).
///
/// Keeping the "where does this land?" maths out of the view makes it testable
/// and keeps the gesture code thin.
enum DragMath {

    /// Converts a vertical offset inside a day timeline into a wall-clock start
    /// time, snapped to the 15-minute grid.
    ///
    /// - Parameters:
    ///   - y: points from the top of the timeline content.
    ///   - timelineStart: the wall-clock time at `y == 0`.
    ///   - pointsPerMinute: vertical scale.
    static func time(
        atOffset y: CGFloat,
        timelineStart: Date,
        pointsPerMinute: CGFloat,
        calendar: Calendar = HoradiaCalendar.current
    ) -> Date {
        let minutes = Double(max(0, y) / pointsPerMinute)
        let raw = timelineStart.addingTimeInterval(minutes * 60)
        return TimeGrid.snap(raw, calendar: calendar)
    }

    /// The y offset a given time maps to (inverse of `time(atOffset:)`).
    static func offset(
        for date: Date,
        timelineStart: Date,
        pointsPerMinute: CGFloat
    ) -> CGFloat {
        CGFloat(date.timeIntervalSince(timelineStart) / 60) * pointsPerMinute
    }

    /// Clamps a candidate start so the whole block stays within `[lower, upper)`.
    static func clampStart(
        _ start: Date,
        duration: TimeInterval,
        lower: Date,
        upper: Date
    ) -> Date {
        let latestStart = upper.addingTimeInterval(-duration)
        if start < lower { return lower }
        if start > latestStart { return max(lower, latestStart) }
        return start
    }

    /// How many whole days to shift, given a horizontal drag translation and the
    /// column pitch (width + gap). A drag past half a column jumps one day.
    static func dayShift(forHorizontalTranslation dx: CGFloat, columnPitch: CGFloat) -> Int {
        guard columnPitch > 0 else { return 0 }
        return Int((dx / columnPitch).rounded())
    }

    /// Applies a day shift to a start date, preserving time of day.
    static func shiftDay(
        of date: Date,
        by days: Int,
        calendar: Calendar = HoradiaCalendar.current
    ) -> Date {
        guard days != 0 else { return date }
        return calendar.date(byAdding: .day, value: days, to: date) ?? date
    }
}
