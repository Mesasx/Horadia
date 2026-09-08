import SwiftUI

/// The transient "· Deshacer" banner shown for a few seconds after a delete /
/// class omission (product brief §14).
///
/// A slim capsule on `.regularMaterial`, bottom-anchored, auto-dismissing.
struct UndoBanner: View {
    let message: String
    var onUndo: () -> Void
    var onDismiss: () -> Void

    var body: some View {
        HStack(spacing: HoradiaTheme.Spacing.m) {
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.primary)
            Spacer(minLength: HoradiaTheme.Spacing.m)
            Button("Deshacer", action: onUndo)
                .font(.subheadline.weight(.semibold))
        }
        .padding(.vertical, HoradiaTheme.Spacing.m)
        .padding(.horizontal, HoradiaTheme.Spacing.l)
        .background(
            Capsule(style: .continuous).fill(.regularMaterial)
        )
        .overlay(
            Capsule(style: .continuous).strokeBorder(Color.primary.opacity(0.06), lineWidth: 1)
        )
        .horadiaRestingShadow()
        .padding(.horizontal, HoradiaTheme.Spacing.l)
        .transition(.move(edge: .bottom).combined(with: .opacity))
        .task {
            try? await Task.sleep(for: .seconds(4))
            onDismiss()
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(message). Toca Deshacer para revertir.")
    }
}

/// Attaches an undo banner (and its dismissal timing) to any view.
extension View {
    func undoBanner(_ action: Binding<PlannerInteraction.UndoAction?>) -> some View {
        overlay(alignment: .bottom) {
            if let value = action.wrappedValue {
                UndoBanner(
                    message: value.message,
                    onUndo: {
                        withAnimation(HoradiaTheme.Motion.quick) {
                            value.restore()
                            action.wrappedValue = nil
                        }
                    },
                    onDismiss: {
                        withAnimation(HoradiaTheme.Motion.quick) { action.wrappedValue = nil }
                    }
                )
                .id(value.id)
                .padding(.bottom, HoradiaTheme.Spacing.s)
            }
        }
        .animation(HoradiaTheme.Motion.standard, value: action.wrappedValue?.id)
    }
}

#Preview("Undo banner", traits: .sizeThatFitsLayout) {
    UndoBanner(message: "Clase quitada de este día", onUndo: {}, onDismiss: {})
        .padding()
}
