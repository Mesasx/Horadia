import SwiftUI

extension View {
    /// Adds the shared drag-and-drop chrome (product brief §12, §14, §15):
    /// the bottom "quitar" drop zone, the "· Deshacer" banner and the conflict
    /// dialog. Used by both Semana and Hoy.
    func plannerInteractionChrome(_ interaction: PlannerInteraction) -> some View {
        modifier(PlannerInteractionChrome(interaction: interaction))
    }
}

private struct PlannerInteractionChrome: ViewModifier {
    @Bindable var interaction: PlannerInteraction

    func body(content: Content) -> some View {
        content
            .overlay(alignment: .bottom) {
                if let dragging = interaction.draggingItem {
                    DropZonePill(isClass: !dragging.isPersonal, isActive: interaction.dragOverDelete)
                        .padding(.bottom, HoradiaTheme.Spacing.l)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                        .allowsHitTesting(false)
                } else if interaction.organizationMode {
                    Button {
                        withAnimation(HoradiaTheme.Motion.standard) { interaction.exitOrganizationMode() }
                    } label: {
                        Text("Finalizar")
                            .font(.subheadline.weight(.semibold))
                            .padding(.vertical, HoradiaTheme.Spacing.m)
                            .padding(.horizontal, HoradiaTheme.Spacing.xl)
                            .background(Capsule(style: .continuous).fill(.regularMaterial))
                            .overlay(Capsule().strokeBorder(Color.primary.opacity(0.06)))
                            .horadiaRestingShadow()
                    }
                    .padding(.bottom, HoradiaTheme.Spacing.l)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .animation(HoradiaTheme.Motion.quick, value: interaction.draggingItemID)
            .animation(HoradiaTheme.Motion.standard, value: interaction.organizationMode)
            .undoBanner($interaction.undo)
            .confirmationDialog(
                interaction.pendingConflict?.conflict.summary ?? "",
                isPresented: Binding(
                    get: { interaction.pendingConflict != nil },
                    set: { if !$0 { interaction.pendingConflict = nil } }
                ),
                titleVisibility: .visible,
                presenting: interaction.pendingConflict
            ) { pending in
                Button("Mantener ambas") { interaction.resolveConflict(.keepBoth) }
                Button(removeLabel(pending.conflict), role: .destructive) {
                    interaction.resolveConflict(.removeClasses)
                }
                Button("Cancelar", role: .cancel) { interaction.resolveConflict(.cancel) }
            } message: { pending in
                if pending.conflict.isMultiple {
                    Text("Coincide con: " + pending.conflict.classes.map(\.title).joined(separator: " · "))
                }
            }
    }

    private func removeLabel(_ conflict: ConflictEngine.Conflict) -> String {
        conflict.isMultiple ? "Quitar clases" : "Quitar \(conflict.classes.first?.title ?? "clase")"
    }
}
