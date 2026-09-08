import SwiftUI

/// One day column in the Semana screen (product brief sections 5, 34).
///
/// Header shows the weekday + date number, with a discreet accent-coloured
/// treatment for today (section 34: no garish elements). Body is the vertical
/// `DayTimelineView` inside its own scroll view.
struct DayColumnView: View {
    let timeline: DayTimeline
    let isToday: Bool
    let isWeekend: Bool
    var nowIndicator: Date? = nil
    var onSelectItem: (ScheduledItem) -> Void = { _ in }
    var onSelectFree: (TimeSlot) -> Void = { _ in }
    var dragConfig: TimelineDragConfig? = nil

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider().opacity(0.4)
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: HoradiaTheme.Spacing.s) {
                    if let note = timeline.dayNote {
                        dayNoteView(note)
                    }
                    DayTimelineView(
                        timeline: timeline,
                        now: nowIndicator,
                        showsHourGutter: !isWeekend,
                        onSelectItem: onSelectItem,
                        onSelectFree: onSelectFree,
                        dragConfig: dragConfig
                    )
                }
                .padding(.horizontal, HoradiaTheme.Spacing.s)
                .padding(.top, HoradiaTheme.Spacing.s)
                .padding(.bottom, HoradiaTheme.Spacing.xl)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: HoradiaTheme.Radius.card, style: .continuous)
                .fill(Color(.secondarySystemGroupedBackground))
        )
        .overlay(
            RoundedRectangle(cornerRadius: HoradiaTheme.Radius.card, style: .continuous)
                .strokeBorder(
                    isToday ? Color.accentColor.opacity(0.5) : Color.clear,
                    lineWidth: 1
                )
        )
        .horadiaRestingShadow()
    }

    private var header: some View {
        VStack(spacing: 1) {
            Text(HoradiaFormat.weekdayShort(timeline.date))
                .font(.caption2.weight(.medium))
                .textCase(.uppercase)
                .foregroundStyle(isToday ? Color.accentColor : .secondary)
            Text(dayNumber)
                .font(.headline)
                .foregroundStyle(isToday ? Color.accentColor : .primary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, HoradiaTheme.Spacing.s)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(HoradiaFormat.weekdayLong(timeline.date)) \(dayNumber)\(isToday ? ", hoy" : "")")
    }

    private func dayNoteView(_ note: String) -> some View {
        Text(note)
            .font(.caption.weight(.medium))
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, HoradiaTheme.Spacing.m)
            .padding(.vertical, HoradiaTheme.Spacing.s)
            .background(
                RoundedRectangle(cornerRadius: HoradiaTheme.Radius.block, style: .continuous)
                    .fill(Color(.tertiarySystemGroupedBackground))
            )
    }

    private var dayNumber: String {
        "\(HoradiaCalendar.current.component(.day, from: timeline.date))"
    }
}

#Preview("Day column") {
    let repo = MockScheduleRepository()
    let monday = Date().startOfWeek()
    return HStack(spacing: 10) {
        DayColumnView(timeline: repo.timeline(for: monday), isToday: true, isWeekend: false)
            .frame(width: 190)
        DayColumnView(timeline: repo.timeline(for: monday.adding(days: 5)), isToday: false, isWeekend: true)
            .frame(width: 130)
    }
    .padding()
    .frame(height: 600)
    .background(Color(.systemGroupedBackground))
}
