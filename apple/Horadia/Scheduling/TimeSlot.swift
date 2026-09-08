import Foundation

/// A half-open time interval `[start, end)` on the wall clock.
///
/// This is the currency of the scheduling layer. It is a plain value type with
/// no SwiftData / SwiftUI dependencies so the `FreeTimeEngine` and its tests
/// stay pure (section 48: business logic out of views, section 49: testable).
struct TimeSlot: Equatable, Hashable {
    var start: Date
    var end: Date

    init(start: Date, end: Date) {
        self.start = start
        self.end = end
    }

    var duration: TimeInterval { max(0, end.timeIntervalSince(start)) }
    var isEmpty: Bool { end <= start }

    func overlaps(_ other: TimeSlot) -> Bool {
        start < other.end && other.start < end
    }

    /// Clamps the slot to `bounds`, returning `nil` if nothing remains.
    /// Used to project a midnight-crossing activity onto a single day (section 6).
    func clamped(to bounds: TimeSlot) -> TimeSlot? {
        let clamped = TimeSlot(
            start: Swift.max(start, bounds.start),
            end: Swift.min(end, bounds.end)
        )
        return clamped.isEmpty ? nil : clamped
    }
}

extension Array where Element == TimeSlot {

    /// Sorts by start and merges overlapping or touching slots into a minimal
    /// set of disjoint busy intervals. Identity is intentionally discarded —
    /// this is only used for gap math, never for rendering.
    func mergedBusyIntervals() -> [TimeSlot] {
        let sorted = filter { !$0.isEmpty }.sorted { $0.start < $1.start }
        guard var current = sorted.first else { return [] }

        var result: [TimeSlot] = []
        for slot in sorted.dropFirst() {
            if slot.start <= current.end {
                current.end = Swift.max(current.end, slot.end)
            } else {
                result.append(current)
                current = slot
            }
        }
        result.append(current)
        return result
    }
}
