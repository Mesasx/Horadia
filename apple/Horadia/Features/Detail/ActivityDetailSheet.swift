import SwiftUI

/// Tap an activity → this sheet (product brief §18).
///
/// Personal activities get the full action set; university classes get an
/// info-only view plus "No asistir" (§14). Nothing here re-times a class.
struct ActivityDetailSheet: View {
    let item: ScheduledItem
    var store: PlannerStore
    /// Called after an action that should also dismiss (delete, omit…).
    var onFinished: () -> Void = {}

    @Environment(\.dismiss) private var dismiss
    @State private var showCopyToDay = false
    @State private var showMoveToDay = false

    private var live: ScheduledItem { store.item(id: item.id) ?? item }

    var body: some View {
        NavigationStack {
            List {
                header

                if item.isPersonal {
                    personalActions
                } else {
                    universitySection
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Listo") { dismiss() }
                }
            }
            .sheet(isPresented: $showCopyToDay) {
                DayPickerSheet(anchor: item.start, title: "Copiar a…", confirm: "Copiar") { day in
                    store.copy(id: item.id, toDay: day)
                    Haptics.drop.play()
                    showCopyToDay = false
                    onFinished()
                    dismiss()
                }
            }
            .sheet(isPresented: $showMoveToDay) {
                DayPickerSheet(anchor: item.start, title: "Mover a…", confirm: "Mover") { day in
                    store.move(id: item.id, toDay: day)
                    Haptics.drop.play()
                    showMoveToDay = false
                    onFinished()
                    dismiss()
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    // MARK: Header

    private var header: some View {
        Section {
            HStack(spacing: HoradiaTheme.Spacing.m) {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(item.palette.fill)
                    .overlay(
                        Image(systemName: item.symbolName)
                            .foregroundStyle(item.palette.accent)
                    )
                    .frame(width: 40, height: 40)
                VStack(alignment: .leading, spacing: 2) {
                    if let badge = item.badge {
                        Text(badge)
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(item.palette.accent)
                    }
                    Text(item.fullTitle ?? item.title)
                        .font(.headline)
                    Text(HoradiaFormat.range(live.start, live.end))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if live.isPinned {
                    Image(systemName: "lock.fill").foregroundStyle(.secondary)
                }
            }
            .padding(.vertical, 4)
        }
    }

    // MARK: Personal (§18–20)

    @ViewBuilder
    private var personalActions: some View {
        Section {
            Button {
                store.toggleCompleted(id: item.id)
                Haptics.complete.play()
            } label: {
                Label(
                    live.isCompleted ? "Marcar como no realizada" : "Marcar realizada",
                    systemImage: live.isCompleted ? "circle" : "checkmark.circle"
                )
            }

            Button {
                store.togglePinned(id: item.id)
            } label: {
                Label(
                    live.isPinned ? "Desbloquear" : "Fijar",
                    systemImage: live.isPinned ? "lock.open" : "lock"
                )
            }
        }

        Section {
            Button {
                store.duplicate(id: item.id)
                Haptics.drop.play()
                onFinished()
                dismiss()
            } label: {
                Label("Duplicar", systemImage: "plus.square.on.square")
            }

            Button {
                let nextDay = item.start.adding(days: 1)
                store.copy(id: item.id, toDay: nextDay)
                Haptics.drop.play()
                onFinished()
                dismiss()
            } label: {
                Label("Copiar al día siguiente", systemImage: "arrow.turn.down.right")
            }

            Button {
                showCopyToDay = true
            } label: {
                Label("Copiar a otro día…", systemImage: "calendar")
            }

            if !live.isPinned {
                Button {
                    showMoveToDay = true
                } label: {
                    Label("Mover a otro día…", systemImage: "arrow.left.arrow.right")
                }
            }
        }

        Section {
            Button(role: .destructive) {
                store.remove(id: item.id)
                Haptics.delete.play()
                onFinished()
                dismiss()
            } label: {
                Label("Eliminar", systemImage: "trash")
            }
        }
    }

    // MARK: University (§14)

    @ViewBuilder
    private var universitySection: some View {
        Section {
            if let location = universityLocation {
                LabeledContent("Aula", value: location)
            }
            LabeledContent("Horario", value: "Fijo, no editable")
        } footer: {
            Text("El horario oficial de la asignatura no se puede cambiar.")
        }

        Section {
            if let key = item.instanceKey {
                if store.isOmitted(instanceKey: key) {
                    Button {
                        store.restoreClass(instanceKey: key)
                        onFinished()
                        dismiss()
                    } label: {
                        Label("Volver a asistir", systemImage: "arrow.uturn.backward")
                    }
                } else {
                    Button(role: .destructive) {
                        store.omitClass(instanceKey: key)
                        Haptics.delete.play()
                        onFinished()
                        dismiss()
                    } label: {
                        Label("No asistir este día", systemImage: "xmark.circle")
                    }
                }
            }
        } footer: {
            Text("Solo quita la clase de este día. No afecta al resto del cuatrimestre.")
        }
    }

    private var universityLocation: String? { nil } // wired when events carry location
}

/// Small day picker used by "Copiar / Mover a otro día" (§19).
struct DayPickerSheet: View {
    let anchor: Date
    var title: String = "Elegir día"
    var confirm: String = "Aceptar"
    var onPick: (Date) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var selection: Date

    init(anchor: Date, title: String = "Elegir día", confirm: String = "Aceptar", onPick: @escaping (Date) -> Void) {
        self.anchor = anchor
        self.title = title
        self.confirm = confirm
        self.onPick = onPick
        _selection = State(initialValue: anchor)
    }

    var body: some View {
        NavigationStack {
            DatePicker("Día", selection: $selection, displayedComponents: .date)
                .datePickerStyle(.graphical)
                .padding()
                .navigationTitle(title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancelar") { dismiss() }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button(confirm) { onPick(selection) }
                    }
                }
        }
        .presentationDetents([.medium, .large])
    }
}

#Preview("Detalle · personal") {
    let store = PlannerStore.preview()
    let item = store.personalItems.first { $0.title == "Deporte" }!
    return Color.clear.sheet(isPresented: .constant(true)) {
        ActivityDetailSheet(item: item, store: store)
    }
}
