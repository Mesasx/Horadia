import Foundation

/// Detects when a personal activity overlaps one or more university classes
/// (product brief §15).
///
/// Horadia *allows* the overlap to happen (the activity is placed), then offers
/// the user a choice: keep both, remove the class(es), or cancel.
enum ConflictEngine {

    struct Conflict: Equatable {
        /// The personal activity that was moved / created.
        var activity: ScheduledItem
        /// The classes it now overlaps, in time order.
        var classes: [ScheduledItem]

        var isMultiple: Bool { classes.count > 1 }

        /// "Trabajo coincide con BI" / "Trabajo coincide con 2 clases" (§15).
        var summary: String {
            guard let first = classes.first else { return activity.title }
            if classes.count == 1 {
                return "\(activity.title) coincide con \(first.title)"
            }
            return "\(activity.title) coincide con \(classes.count) clases"
        }

        /// The instance keys of the overlapping classes (for one-shot removal).
        var classInstanceKeys: [String] { classes.compactMap(\.instanceKey) }
    }

    /// Returns a conflict if `activity` overlaps any non-omitted class among
    /// `dayItems`, else `nil`.
    static func conflict(
        for activity: ScheduledItem,
        against dayItems: [ScheduledItem]
    ) -> Conflict? {
        guard activity.isPersonal else { return nil }

        let overlapping = dayItems
            .filter { item in
                guard case .university = item.kind else { return false }
                return item.slot.overlaps(activity.slot)
            }
            .sorted { $0.start < $1.start }

        return overlapping.isEmpty ? nil : Conflict(activity: activity, classes: overlapping)
    }
}
