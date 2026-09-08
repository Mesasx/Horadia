import Foundation
import Observation
import SwiftUI

/// Coordinates drag-and-drop side effects for the planner (product brief
/// §12, §14, §15). Views own the gestures; this owns the *consequences* —
/// moving, deleting, omitting classes, conflict prompts and undo — so that
/// logic stays out of the view layer (§48).
@Observable
final class PlannerInteraction {

    let store: PlannerStore
    private let calendar: Calendar

    /// The item currently being dragged (for the lift / z-order and the zone label).
    var draggingItem: ScheduledItem?
    /// `true` while the dragged block is over the "quitar" zone.
    var dragOverDelete: Bool = false

    var draggingItemID: UUID? { draggingItem?.id }

    /// A conflict awaiting the user's decision (§15).
    var pendingConflict: PendingConflict?

    /// The transient "· Deshacer" banner (§14).
    var undo: UndoAction?

    /// "Jiggle" organisation mode (§13): personal blocks wobble and can be
    /// rearranged / removed without a long-press.
    var organizationMode = false

    init(store: PlannerStore, calendar: Calendar = HoradiaCalendar.current) {
        self.store = store
        self.calendar = calendar
    }

    // MARK: Types

    struct PendingConflict: Identifiable {
        let id = UUID()
        var conflict: ConflictEngine.Conflict
        /// Restores the moved activity to where it was, for "Cancelar".
        var revert: () -> Void
    }

    struct UndoAction: Identifiable {
        let id = UUID()
        var message: String
        var restore: () -> Void
    }

    // MARK: Organisation mode (§13)

    func enterOrganizationMode() {
        guard !organizationMode else { return }
        organizationMode = true
        Haptics.pick.play()
    }

    func exitOrganizationMode() {
        guard organizationMode else { return }
        organizationMode = false
        endDrag()
        Haptics.drop.play()
    }

    // MARK: Drag lifecycle

    func beginDrag(_ item: ScheduledItem) {
        draggingItem = item
    }

    func endDrag() {
        draggingItem = nil
        dragOverDelete = false
    }

    /// Commit a move to `targetStart` (already snapped by the caller). Immovable
    /// classes are never re-timed (§14) — only their deletion is honoured.
    func commitMove(item: ScheduledItem, targetStart: Date) {
        defer { endDrag() }
        guard item.isPersonal else { return }

        let before = store.item(id: item.id) ?? item
        store.move(id: item.id, to: targetStart)
        Haptics.drop.play()

        guard let moved = store.item(id: item.id) else { return }
        let dayItems = store.timeline(for: moved.start).items
        if let conflict = ConflictEngine.conflict(for: moved, against: dayItems) {
            Haptics.conflict.play()
            pendingConflict = PendingConflict(conflict: conflict) { [weak self] in
                self?.store.replace(before)
            }
        }
    }

    /// Drop onto the "quitar" zone: delete a personal activity, or omit a single
    /// class instance (§14). Both are undoable.
    func commitRemove(item: ScheduledItem) {
        defer { endDrag() }
        Haptics.delete.play()

        if item.isPersonal {
            let snapshot = store.item(id: item.id) ?? item
            store.remove(id: item.id)
            undo = UndoAction(message: "Actividad eliminada") { [weak self] in
                self?.store.add(snapshot)
            }
        } else if let key = item.instanceKey {
            store.omitClass(instanceKey: key)
            undo = UndoAction(message: "Clase quitada de este día") { [weak self] in
                self?.store.restoreClass(instanceKey: key)
            }
        }
    }

    // MARK: Conflict resolution (§15)

    enum ConflictResolution {
        case keepBoth
        case removeClasses
        case cancel
    }

    func resolveConflict(_ resolution: ConflictResolution) {
        guard let pending = pendingConflict else { return }
        switch resolution {
        case .keepBoth:
            break
        case .removeClasses:
            for key in pending.conflict.classInstanceKeys {
                store.omitClass(instanceKey: key)
            }
            let keys = pending.conflict.classInstanceKeys
            undo = UndoAction(message: keys.count > 1 ? "Clases quitadas" : "Clase quitada") { [weak self] in
                keys.forEach { self?.store.restoreClass(instanceKey: $0) }
            }
        case .cancel:
            pending.revert()
        }
        pendingConflict = nil
    }

    // MARK: Undo

    func performUndo() {
        undo?.restore()
        undo = nil
    }

    func dismissUndo() {
        undo = nil
    }
}
