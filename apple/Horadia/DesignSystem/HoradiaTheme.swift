import SwiftUI

/// Layout constants, typography and materials for Horadia.
///
/// Keeping these in one place enforces the "diseñada por Apple" look
/// (section 3): gentle corner radii, hairline strokes, extremely subtle
/// shadows, system fonts, native materials.
enum HoradiaTheme {

    // MARK: Spacing scale
    enum Spacing {
        static let xxs: CGFloat = 2
        static let xs: CGFloat = 4
        static let s: CGFloat = 8
        static let m: CGFloat = 12
        static let l: CGFloat = 16
        static let xl: CGFloat = 24
        static let xxl: CGFloat = 32
    }

    // MARK: Corner radii (iOS-native continuous curves)
    enum Radius {
        static let block: CGFloat = 12
        static let card: CGFloat = 16
        static let sheet: CGFloat = 22
    }

    enum Stroke {
        /// A true hairline at any scale.
        static var hairline: CGFloat { 1.0 / max(UIScreen.main.scale, 1) }
        static let block: CGFloat = 1
        static let emphasised: CGFloat = 1.5 // exams (section 25)
    }

    // MARK: Timeline geometry (section 6)
    enum Timeline {
        /// Vertical scale of the day timeline. 1 minute → this many points.
        static let pointsPerMinute: CGFloat = 1.0
        /// Height of the smallest renderable slot (15 min).
        static var minSlotHeight: CGFloat { 15 * pointsPerMinute }
        /// Width of the left-hand hour gutter.
        static let hourGutterWidth: CGFloat = 44
    }

    // MARK: Shadows — "sombras extremadamente sutiles" (section 3)
    struct Shadow {
        var color: Color
        var radius: CGFloat
        var y: CGFloat

        static let resting = Shadow(color: .black.opacity(0.05), radius: 3, y: 1)
        /// While a block is picked up during drag (section 12).
        static let lifted = Shadow(color: .black.opacity(0.16), radius: 18, y: 8)
    }

    // MARK: Animations — "rápidas, naturales, spring-based" (section 44)
    enum Motion {
        static let quick = Animation.spring(response: 0.28, dampingFraction: 0.86)
        static let standard = Animation.spring(response: 0.36, dampingFraction: 0.82)
        static let lift = Animation.spring(response: 0.30, dampingFraction: 0.70)
    }
}

extension View {
    func horadiaRestingShadow() -> some View {
        let s = HoradiaTheme.Shadow.resting
        return shadow(color: s.color, radius: s.radius, x: 0, y: s.y)
    }

    func horadiaLiftedShadow() -> some View {
        let s = HoradiaTheme.Shadow.lifted
        return shadow(color: s.color, radius: s.radius, x: 0, y: s.y)
    }
}
