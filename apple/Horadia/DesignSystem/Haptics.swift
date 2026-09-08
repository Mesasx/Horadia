import UIKit

/// Moderate, purposeful haptic feedback (product brief section 43).
///
/// Only the five documented moments trigger haptics: picking up a block,
/// dropping it, deleting, a conflict, and completing. Nothing decorative.
enum Haptics {
    /// Long-press picks up a block (section 12).
    case pick
    /// Block dropped onto a valid target (section 12).
    case drop
    /// Item removed / class omitted (section 14).
    case delete
    /// A personal activity overlaps a class (section 15).
    case conflict
    /// Activity marked done (section 20).
    case complete

    func play() {
        switch self {
        case .pick:
            let generator = UIImpactFeedbackGenerator(style: .rigid)
            generator.prepare()
            generator.impactOccurred(intensity: 0.85)
        case .drop:
            UIImpactFeedbackGenerator(style: .soft).impactOccurred(intensity: 0.7)
        case .delete:
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case .conflict:
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        case .complete:
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
    }
}
