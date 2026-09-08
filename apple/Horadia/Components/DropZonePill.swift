import SwiftUI

/// The "quitar" drop target shown at the bottom of the screen while a block is
/// being dragged (product brief §12, §14).
///
/// Personal activity → "Soltar para quitar". University class → "Soltar para no
/// asistir". Lights up red when the finger is over it.
struct DropZonePill: View {
    let isClass: Bool
    let isActive: Bool

    private var label: String {
        isClass ? "Soltar para no asistir" : "Soltar para quitar"
    }

    var body: some View {
        Label(label, systemImage: isClass ? "xmark.circle" : "trash")
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(isActive ? .white : .red)
            .padding(.vertical, HoradiaTheme.Spacing.m)
            .padding(.horizontal, HoradiaTheme.Spacing.l)
            .background(
                Capsule(style: .continuous)
                    .fill(isActive ? AnyShapeStyle(Color.red) : AnyShapeStyle(.regularMaterial))
            )
            .overlay(
                Capsule(style: .continuous)
                    .strokeBorder(Color.red.opacity(isActive ? 0 : 0.4),
                                  style: StrokeStyle(lineWidth: 1.5, dash: isActive ? [] : [5, 4]))
            )
            .scaleEffect(isActive ? 1.05 : 1)
            .animation(HoradiaTheme.Motion.quick, value: isActive)
            .horadiaRestingShadow()
            .accessibilityLabel(label)
    }
}

#Preview("Drop zone", traits: .sizeThatFitsLayout) {
    VStack(spacing: 16) {
        DropZonePill(isClass: false, isActive: false)
        DropZonePill(isClass: false, isActive: true)
        DropZonePill(isClass: true, isActive: false)
    }
    .padding()
}
