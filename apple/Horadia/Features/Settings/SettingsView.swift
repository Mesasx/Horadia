import SwiftUI

/// The Ajustes screen (product brief sections 4, 28, 29, 38).
///
/// Phase 1: a native `Form` shell. Toggles for Apple Calendar (off by default,
/// section 28) and iCloud sync (section 29) are shown but inert until their
/// phases; the Universidad section lists subjects read-only with their colours
/// (section 38) — colour editing and the rest land later.
struct SettingsView: View {
    let repository: ScheduleRepository

    private var subjects: [UniversityScheduleImporter.ImportedSubject] {
        repository.subjectsByCode.values.sorted { $0.code < $1.code }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Perfil") {
                    LabeledContent("Nombre", value: repository.preferences.ownerName)
                    LabeledContent("Cumpleaños", value: "16 de septiembre")
                }

                Section {
                    ForEach(subjects, id: \.code) { subject in
                        HStack(spacing: HoradiaTheme.Spacing.m) {
                            RoundedRectangle(cornerRadius: 5, style: .continuous)
                                .fill(subject.color.fill)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 5, style: .continuous)
                                        .strokeBorder(subject.color.border, lineWidth: 1)
                                )
                                .frame(width: 22, height: 22)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(subject.code).font(.body)
                                Text(subject.fullName)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                } header: {
                    Text("Universidad")
                } footer: {
                    Text("El horario oficial no se puede editar. El color sí (próximamente).")
                }

                Section("Integraciones") {
                    Toggle("Apple Calendar", isOn: .constant(repository.preferences.externalCalendarEnabled))
                        .disabled(true)
                    Toggle("Sincronizar con iCloud", isOn: .constant(repository.preferences.iCloudSyncEnabled))
                        .disabled(true)
                }

                Section {
                    LabeledContent("Versión", value: "0.1 · Fase 1")
                } footer: {
                    Text("Datos de universidad provisionales, derivados del patrón semanal. Pendiente de importar el DAMERO real.")
                }
            }
            .navigationTitle("Ajustes")
        }
    }
}

#Preview("Settings") {
    SettingsView(repository: MockScheduleRepository())
}
