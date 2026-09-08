import SwiftUI

/// Tap a "Libre" block → quick create (product brief §7, §37).
///
/// Offers the built-in library (Trabajo / Deporte / Estudio / Siesta …) plus
/// "Crear actividad" for a brand-new one (name + colour + icon only, §10). The
/// new activity fills the tapped free slot, capped at the template's default
/// duration and snapped to the 15-min grid.
struct QuickCreateSheet: View {
    let slot: TimeSlot
    let day: Date
    var store: PlannerStore
    var onCreated: (ScheduledItem) -> Void = { _ in }

    @Environment(\.dismiss) private var dismiss
    @State private var showCustom = false

    private var columns: [GridItem] { [GridItem(.adaptive(minimum: 150), spacing: HoradiaTheme.Spacing.m)] }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: HoradiaTheme.Spacing.l) {
                    Text(HoradiaFormat.range(slot.start, slot.end))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    LazyVGrid(columns: columns, spacing: HoradiaTheme.Spacing.m) {
                        ForEach(store.library) { template in
                            Button {
                                create(from: template)
                            } label: {
                                LibraryChip(template: template)
                            }
                            .buttonStyle(.plain)
                        }

                        Button {
                            showCustom = true
                        } label: {
                            LibraryChip.newActivity
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(HoradiaTheme.Spacing.l)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Añadir a Libre")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                }
            }
            .sheet(isPresented: $showCustom) {
                NewActivitySheet { name, palette, symbol in
                    let template = store.addToLibrary(name: name, kind: .custom, palette: palette, symbolName: symbol)
                    create(from: template)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private func create(from template: LibraryActivity) {
        let start = TimeGrid.snap(slot.start)
        let maxDuration = slot.end.timeIntervalSince(start)
        let duration = max(TimeGrid.minimumActivityDuration, min(template.defaultDuration, maxDuration))
        let item = template.makeItem(day: day, start: start, duration: duration)
        store.add(item)
        Haptics.drop.play()
        onCreated(item)
        dismiss()
    }
}

/// A tappable library tile.
struct LibraryChip: View {
    let title: String
    let symbol: String
    let palette: PastelColor?

    init(template: LibraryActivity) {
        self.title = template.name
        self.symbol = template.symbolName
        self.palette = template.palette
    }

    private init(title: String, symbol: String, palette: PastelColor?) {
        self.title = title
        self.symbol = symbol
        self.palette = palette
    }

    static let newActivity = LibraryChip(title: "Crear actividad", symbol: "plus", palette: nil)

    var body: some View {
        HStack(spacing: HoradiaTheme.Spacing.s) {
            Image(systemName: symbol)
                .foregroundStyle(palette?.accent ?? Color.accentColor)
                .frame(width: 24)
            Text(title)
                .font(.subheadline.weight(.medium))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Spacer(minLength: 0)
        }
        .padding(.vertical, HoradiaTheme.Spacing.m)
        .padding(.horizontal, HoradiaTheme.Spacing.m)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: HoradiaTheme.Radius.block, style: .continuous)
                .fill(palette?.fill ?? Color(.secondarySystemGroupedBackground))
        )
        .overlay(
            RoundedRectangle(cornerRadius: HoradiaTheme.Radius.block, style: .continuous)
                .strokeBorder(palette?.border ?? Color.secondary.opacity(0.25), lineWidth: 1)
        )
    }
}

/// Minimal "new activity" form (§10): name + colour + icon, nothing else.
struct NewActivitySheet: View {
    var onCreate: (_ name: String, _ palette: PastelColor, _ symbol: String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var palette: PastelColor = .lilac
    @State private var symbol = "sparkles"

    private let symbols = ["sparkles", "cup.and.saucer", "fork.knife", "figure.walk", "figure.pilates", "cart", "airplane", "gamecontroller", "music.note", "heart", "pawprint", "leaf"]

    var body: some View {
        NavigationStack {
            Form {
                Section("Nombre") {
                    TextField("Pilates, Comer, Academia…", text: $name)
                }
                Section("Color") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: HoradiaTheme.Spacing.s) {
                            ForEach(PastelColor.allCases) { option in
                                Circle()
                                    .fill(option.fill)
                                    .overlay(Circle().strokeBorder(option.border, lineWidth: 1))
                                    .overlay(
                                        Circle()
                                            .strokeBorder(Color.primary, lineWidth: palette == option ? 2 : 0)
                                            .padding(-3)
                                    )
                                    .frame(width: 30, height: 30)
                                    .onTapGesture { palette = option }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                Section("Icono") {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 44))], spacing: HoradiaTheme.Spacing.m) {
                        ForEach(symbols, id: \.self) { candidate in
                            Image(systemName: candidate)
                                .font(.title3)
                                .frame(width: 44, height: 44)
                                .background(
                                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                                        .fill(symbol == candidate ? palette.fill : Color(.tertiarySystemFill))
                                )
                                .onTapGesture { symbol = candidate }
                        }
                    }
                }
            }
            .navigationTitle("Nueva actividad")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Añadir") {
                        onCreate(name.trimmingCharacters(in: .whitespaces), palette, symbol)
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

#Preview("Crear rápido") {
    let store = PlannerStore.preview()
    let day = Date().startOfWeek()
    return Color.clear.sheet(isPresented: .constant(true)) {
        QuickCreateSheet(
            slot: TimeSlot(start: day.settingTime(TimeOfDay(hour: 14, minute: 0)),
                           end: day.settingTime(TimeOfDay(hour: 16, minute: 0))),
            day: day,
            store: store
        )
    }
}
