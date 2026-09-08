import SwiftUI

/// The Hoy screen (product brief section 33).
///
/// A single vertical timeline for the current day with the "AHORA" line, plus a
/// compact "a continuación" strip. Tap an activity → detail (§18); tap "Libre" →
/// quick create (§7).
struct TodayView: View {
    let store: PlannerStore
    @State private var model: TodayViewModel
    @State private var interaction: PlannerInteraction
    @State private var sheet: WeekSheet?

    init(store: PlannerStore) {
        self.store = store
        _model = State(initialValue: TodayViewModel(repository: store))
        _interaction = State(initialValue: PlannerInteraction(store: store))
    }

    var body: some View {
        let _ = store.personalItems.count
        let _ = store.omittedInstanceKeys.count

        return NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: HoradiaTheme.Spacing.l) {
                    if let greeting = model.birthdayGreeting {
                        BirthdayBanner(text: greeting)
                    }

                    if let next = model.nextItem {
                        NextUpCard(item: next, relative: model.relativeStart(for: next))
                    }

                    DayTimelineView(
                        timeline: model.todayTimeline,
                        now: model.now,
                        onSelectItem: { sheet = .detail($0) },
                        onSelectFree: { sheet = .quickCreate(slot: $0, day: model.now) },
                        dragConfig: TimelineDragConfig(
                            interaction: interaction,
                            day: model.now.startOfDay()
                        )
                    )
                }
                .padding(.horizontal, HoradiaTheme.Spacing.l)
                .padding(.vertical, HoradiaTheme.Spacing.m)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Hoy")
            .navigationBarTitleDisplayMode(.large)
            .sheet(item: $sheet) { active in
                switch active {
                case .detail(let item):
                    ActivityDetailSheet(item: item, store: store)
                case .quickCreate(let slot, let day):
                    QuickCreateSheet(slot: slot, day: day, store: store)
                }
            }
            .plannerInteractionChrome(interaction)
        }
    }
}

/// "Siguiente: …" card (sections 30, 33).
struct NextUpCard: View {
    let item: ScheduledItem
    let relative: String

    var body: some View {
        HStack(spacing: HoradiaTheme.Spacing.m) {
            RoundedRectangle(cornerRadius: 4, style: .continuous)
                .fill(item.palette.accent)
                .frame(width: 4, height: 34)
            VStack(alignment: .leading, spacing: 2) {
                Text("A continuación")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text(item.fullTitle ?? item.title)
                    .font(.headline)
                Text("\(HoradiaFormat.range(item.start, item.end)) · \(relative)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: item.symbolName)
                .font(.title3)
                .foregroundStyle(item.palette.accent)
        }
        .padding(HoradiaTheme.Spacing.l)
        .background(
            RoundedRectangle(cornerRadius: HoradiaTheme.Radius.card, style: .continuous)
                .fill(Color(.secondarySystemGroupedBackground))
        )
        .horadiaRestingShadow()
        .accessibilityElement(children: .combine)
    }
}

#Preview("Today") {
    TodayView(store: .preview())
}
