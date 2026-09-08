import SwiftUI

/// The Semana screen — Horadia's core surface and its launch tab
/// (product brief sections 4, 5).
///
/// - ~2 comfortable day columns with horizontal scrolling; weekend columns are
///   slightly more compact. Words are never truncated.
/// - Horizontal swipe moves between weeks (‹ previous · current · next ›).
/// - A clear "Hoy" affordance returns to the current week.
/// - Today's column is marked with the accent colour, not garish styling.
/// - Tap an activity → detail sheet (§18). Tap "Libre" → quick create (§7).
struct WeekView: View {
    let store: PlannerStore
    @State private var model: WeekViewModel
    @State private var interaction: PlannerInteraction
    @State private var dragOffset: CGFloat = 0
    @State private var sheet: WeekSheet?

    init(store: PlannerStore) {
        self.store = store
        _model = State(initialValue: WeekViewModel(repository: store))
        _interaction = State(initialValue: PlannerInteraction(store: store))
    }

    var body: some View {
        // Subscribe this view to the store so drops / edits re-render the week.
        let _ = store.personalItems.count
        let _ = store.omittedInstanceKeys.count

        return NavigationStack {
            VStack(spacing: 0) {
                if let greeting = model.birthdayGreeting {
                    BirthdayBanner(text: greeting)
                        .padding(.horizontal, HoradiaTheme.Spacing.l)
                        .padding(.top, HoradiaTheme.Spacing.s)
                }

                weekStrip
                    .padding(.top, HoradiaTheme.Spacing.s)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Semana")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text(model.weekTitle)
                        .font(.headline)
                        .accessibilityAddTraits(.isHeader)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Hoy") { model.goToToday() }
                        .fontWeight(.semibold)
                        .disabled(model.isViewingCurrentWeek)
                }
            }
            .sheet(item: $sheet) { active in
                switch active {
                case .detail(let item):
                    ActivityDetailSheet(item: item, store: store)
                case .quickCreate(let slot, let day):
                    QuickCreateSheet(slot: slot, day: day, store: store)
                }
            }
            .plannerInteractionChrome(interaction)
            .task { presentDemoSheetIfRequested() }
        }
    }

    /// Screenshot / UI-test hook: `-demo detail` or `-demo create`.
    private func presentDemoSheetIfRequested() {
        guard let index = CommandLine.arguments.firstIndex(of: "-demo"),
              CommandLine.arguments.indices.contains(index + 1) else { return }
        let monday = model.weekStart
        switch CommandLine.arguments[index + 1] {
        case "detail":
            if let deporte = store.personalItems(on: monday).first(where: { $0.title == "Deporte" }) {
                sheet = .detail(deporte)
            }
        case "create":
            let slot = TimeSlot(
                start: monday.settingTime(TimeOfDay(hour: 14, minute: 0)),
                end: monday.settingTime(TimeOfDay(hour: 16, minute: 0))
            )
            sheet = .quickCreate(slot: slot, day: monday)
        case "drag":
            if let deporte = store.personalItems(on: monday).first(where: { $0.title == "Deporte" }) {
                interaction.beginDrag(deporte)
            }
        case "dragDelete":
            if let deporte = store.personalItems(on: monday).first(where: { $0.title == "Deporte" }) {
                interaction.beginDrag(deporte)
                interaction.dragOverDelete = true
            }
        case "conflict":
            if let deporte = store.personalItems(on: monday).first(where: { $0.title == "Deporte" }) {
                interaction.commitMove(item: deporte, targetStart: monday.settingTime(TimeOfDay(hour: 10, minute: 45)))
            }
        case "organize":
            interaction.enterOrganizationMode()
        default:
            break
        }
    }

    // MARK: Week strip

    private var weekStrip: some View {
        GeometryReader { proxy in
            let layout = ColumnLayout(availableWidth: proxy.size.width)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: layout.spacing) {
                    ForEach(model.weekDates, id: \.self) { date in
                        DayColumnView(
                            timeline: model.timeline(for: date),
                            isToday: model.isToday(date),
                            isWeekend: model.isWeekend(date),
                            nowIndicator: model.nowIndicatorDate(for: date),
                            onSelectItem: { sheet = .detail($0) },
                            onSelectFree: { sheet = .quickCreate(slot: $0, day: date) },
                            dragConfig: TimelineDragConfig(
                                interaction: interaction,
                                day: date,
                                columnPitch: layout.weekdayWidth + layout.spacing
                            )
                        )
                        .frame(width: model.isWeekend(date) ? layout.weekendWidth : layout.weekdayWidth)
                        .id(date)
                    }
                }
                .padding(.horizontal, layout.spacing)
                .padding(.vertical, HoradiaTheme.Spacing.s)
            }
            .contentMargins(.bottom, HoradiaTheme.Spacing.m, for: .scrollContent)
            .id(model.weekStart)
            .transition(.opacity)
            .offset(x: dragOffset)
            .simultaneousGesture(weekSwipe(width: proxy.size.width), including: interaction.draggingItem == nil ? .all : .subviews)
            .animation(HoradiaTheme.Motion.standard, value: model.weekStart)
        }
    }

    private func weekSwipe(width: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: 24)
            .onChanged { value in
                if abs(value.translation.width) > abs(value.translation.height) {
                    dragOffset = value.translation.width * 0.35
                }
            }
            .onEnded { value in
                let horizontal = abs(value.translation.width) > abs(value.translation.height)
                let threshold = width * 0.18
                withAnimation(HoradiaTheme.Motion.standard) {
                    if horizontal, value.translation.width < -threshold {
                        model.goToNextWeek()
                    } else if horizontal, value.translation.width > threshold {
                        model.goToPreviousWeek()
                    }
                    dragOffset = 0
                }
            }
    }
}

/// Sheets the Semana screen can present.
enum WeekSheet: Identifiable {
    case detail(ScheduledItem)
    case quickCreate(slot: TimeSlot, day: Date)

    var id: String {
        switch self {
        case .detail(let item): return "detail-\(item.id)"
        case .quickCreate(_, let day): return "create-\(day.timeIntervalSinceReferenceDate)"
        }
    }
}

/// Column widths for the week strip (section 5).
///
/// The user's rule: **words are never cut**. We would rather show ~2 comfortable
/// day columns than squeeze in a third and hyphenate "Deporte". Columns are wide
/// enough for the longest built-in label to sit on one line; the next column
/// still peeks in to signal horizontal scrolling.
private struct ColumnLayout {
    let spacing: CGFloat = HoradiaTheme.Spacing.m
    let weekdayWidth: CGFloat
    let weekendWidth: CGFloat

    init(availableWidth: CGFloat) {
        let usable = max(availableWidth - spacing * 2, 300)
        // ~2 columns visible + a peek of the third.
        let base = (usable / 2.15).rounded()
        weekdayWidth = min(max(base, 176), 300)
        // Weekend is only "slightly" more compact (§5) and still fits whole words.
        weekendWidth = max((weekdayWidth * 0.82).rounded(), 150)
    }
}

/// Discreet birthday banner (sections 2 & 39) — a slim pill, never a takeover.
struct BirthdayBanner: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.footnote.weight(.medium))
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, HoradiaTheme.Spacing.m)
            .padding(.vertical, HoradiaTheme.Spacing.s)
            .background(
                RoundedRectangle(cornerRadius: HoradiaTheme.Radius.block, style: .continuous)
                    .fill(.ultraThinMaterial)
            )
            .accessibilityLabel(text)
    }
}

#Preview("Week") {
    WeekView(store: .preview())
}
