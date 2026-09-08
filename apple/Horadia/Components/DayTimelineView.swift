import SwiftUI

/// Vertical timeline for a single day (product brief §6, §12, §14, §33).
///
/// - Hour lines + labels in a left gutter.
/// - Activity and "Libre" blocks positioned by wall-clock time.
/// - Optional "AHORA" line for today.
/// - Optional drag layer (`dragConfig`): long-press lifts a block; dragging
///   re-times it on the 15-minute grid (personal only — classes stay put, §14);
///   dragging onto the "quitar" zone removes it (delete / "no asistir").
///
/// Gap maths and clamping already happened in `DayTimeline.build`; the store
/// owns the consequences of a drop. This view only turns gestures into calls.
struct DayTimelineView: View {
    let timeline: DayTimeline
    var now: Date? = nil
    var showsHourGutter: Bool = true
    var onSelectItem: (ScheduledItem) -> Void = { _ in }
    var onSelectFree: (TimeSlot) -> Void = { _ in }
    /// Non-nil enables drag-and-drop.
    var dragConfig: TimelineDragConfig? = nil

    @State private var activeDragID: UUID?
    @State private var liveTranslation: CGSize = .zero
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let pointsPerMinute = HoradiaTheme.Timeline.pointsPerMinute
    private var gutterWidth: CGFloat { showsHourGutter ? HoradiaTheme.Timeline.hourGutterWidth : 0 }

    private var totalMinutes: CGFloat { CGFloat(timeline.end.timeIntervalSince(timeline.start) / 60) }
    private var contentHeight: CGFloat { max(totalMinutes * pointsPerMinute, 120) }

    private var organizing: Bool { dragConfig?.interaction.organizationMode == true }

    var body: some View {
        ZStack(alignment: .topLeading) {
            hourLines
            if showsHourGutter { hourLabels }
            if activeDragID != nil { dropGhost }
            blocks
            if let now, isWithinTimeline(now) { nowIndicator(at: now) }
        }
        .frame(height: contentHeight, alignment: .topLeading)
        .padding(.leading, gutterWidth)
        .contentShape(Rectangle())
        .gesture(organizeEntryGesture)
    }

    /// Long-press on empty timeline space → enter organisation mode (§13).
    private var organizeEntryGesture: some Gesture {
        LongPressGesture(minimumDuration: 0.45)
            .onEnded { _ in
                guard let config = dragConfig, !config.interaction.organizationMode else { return }
                withAnimation(HoradiaTheme.Motion.standard) { config.interaction.enterOrganizationMode() }
            }
    }

    // MARK: Hour grid

    private var hourMarks: [Date] {
        let calendar = HoradiaCalendar.current
        var marks: [Date] = []
        var cursor = calendar.date(bySetting: .minute, value: 0, of: timeline.start) ?? timeline.start
        if cursor < timeline.start { cursor = cursor.adding(minutes: 60) }
        while cursor < timeline.end {
            marks.append(cursor)
            cursor = cursor.adding(minutes: 60)
        }
        return marks
    }

    private var hourLines: some View {
        ForEach(hourMarks, id: \.timeIntervalSinceReferenceDate) { mark in
            Rectangle()
                .fill(Color.secondary.opacity(0.12))
                .frame(height: HoradiaTheme.Stroke.hairline)
                .offset(x: -gutterWidth, y: yOffset(for: mark))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, gutterWidth)
        }
    }

    private var hourLabels: some View {
        ForEach(hourMarks, id: \.timeIntervalSinceReferenceDate) { mark in
            Text(HoradiaFormat.time(mark))
                .font(.caption2)
                .monospacedDigit()
                .foregroundStyle(.tertiary)
                .frame(width: gutterWidth - 6, alignment: .trailing)
                .offset(x: -gutterWidth, y: yOffset(for: mark) - 6)
                .accessibilityHidden(true)
        }
    }

    // MARK: Blocks

    private var blocks: some View {
        ForEach(timeline.blocks) { block in
            let dragging = isDragging(block)
            blockView(block)
                .frame(height: height(for: block.slot), alignment: .topLeading)
                .frame(maxWidth: .infinity, alignment: .leading)
                .offset(y: yOffset(for: block.start))
                .modifier(DragOffset(active: dragging, translation: liveTranslation))
                .zIndex(dragging ? 20 : 0)
        }
    }

    private func isDragging(_ block: TimelineBlock) -> Bool {
        guard let id = activeDragID, case .item(let item) = block else { return false }
        return item.id == id
    }

    @ViewBuilder
    private func blockView(_ block: TimelineBlock) -> some View {
        switch block {
        case .item(let item):
            itemCard(item)
        case .free(let slot):
            FreeTimeBlock(slot: slot)
                .onTapGesture { onSelectFree(slot) }
        }
    }

    @ViewBuilder
    private func itemCard(_ item: ScheduledItem) -> some View {
        let lifted = activeDragID == item.id
        let jiggling = organizing && item.isPersonal && !lifted

        let card = ActivityCard(item: item, isLifted: lifted)
            .overlay {
                if lifted, dragConfig?.interaction.dragOverDelete == true {
                    RoundedRectangle(cornerRadius: HoradiaTheme.Radius.block, style: .continuous)
                        .fill(Color.red.opacity(0.12))
                        .overlay(
                            Label(item.isPersonal ? "Quitar" : "No asistir", systemImage: "xmark.circle.fill")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.red)
                        )
                }
            }
            .overlay(alignment: .topLeading) {
                if organizing && item.isPersonal {
                    Button {
                        withAnimation(HoradiaTheme.Motion.quick) {
                            dragConfig?.interaction.commitRemove(item: item)
                        }
                    } label: {
                        Image(systemName: "minus.circle.fill")
                            .font(.title3)
                            .symbolRenderingMode(.palette)
                            .foregroundStyle(.white, .red)
                    }
                    .offset(x: -8, y: -8)
                    .accessibilityLabel("Eliminar \(item.title)")
                }
            }
            .modifier(Jiggle(active: jiggling, reduceMotion: reduceMotion, seed: item.id))
            .onTapGesture { onSelectItem(item) }

        if let config = dragConfig {
            card.gesture(dragGesture(for: item, config: config))
        } else {
            card
        }
    }

    // MARK: Drop ghost — where the block will land (§12)

    @ViewBuilder
    private var dropGhost: some View {
        if let id = activeDragID,
           let item = timeline.items.first(where: { $0.id == id }),
           item.isPersonal {
            let targetY = snappedTargetY(for: item)
            RoundedRectangle(cornerRadius: HoradiaTheme.Radius.block, style: .continuous)
                .strokeBorder(Color.accentColor.opacity(0.7), style: StrokeStyle(lineWidth: 1.5, dash: [5, 4]))
                .background(
                    RoundedRectangle(cornerRadius: HoradiaTheme.Radius.block, style: .continuous)
                        .fill(Color.accentColor.opacity(0.06))
                )
                .frame(height: height(for: item.slot))
                .frame(maxWidth: .infinity, alignment: .leading)
                .offset(y: targetY)
                .allowsHitTesting(false)
        }
    }

    // MARK: Drag gesture (§12)

    private func dragGesture(for item: ScheduledItem, config: TimelineDragConfig) -> some Gesture {
        // In organisation mode the block is already "picked up" — drag starts
        // immediately (§13). Otherwise a 0.3 s long-press lifts it first (§12).
        let hold = config.interaction.organizationMode ? 0.0 : 0.3
        return LongPressGesture(minimumDuration: hold)
            .sequenced(before: DragGesture(minimumDistance: 0, coordinateSpace: .global))
            .onChanged { value in
                switch value {
                case .first(true):
                    beginDragIfNeeded(item, config: config)
                case .second(_, let drag):
                    beginDragIfNeeded(item, config: config)
                    if let drag {
                        liveTranslation = drag.translation
                        config.interaction.dragOverDelete = drag.location.y > Self.deleteZoneThreshold
                    }
                default:
                    break
                }
            }
            .onEnded { value in
                defer { resetDrag() }
                guard case .second(_, let drag?) = value else {
                    config.interaction.endDrag()
                    return
                }
                handleDrop(item: item, translation: drag.translation, config: config)
            }
    }

    private func beginDragIfNeeded(_ item: ScheduledItem, config: TimelineDragConfig) {
        guard activeDragID != item.id else { return }
        activeDragID = item.id
        liveTranslation = .zero
        withAnimation(HoradiaTheme.Motion.lift) { config.interaction.beginDrag(item) }
        Haptics.pick.play()
    }

    private func resetDrag() {
        withAnimation(HoradiaTheme.Motion.standard) {
            activeDragID = nil
            liveTranslation = .zero
        }
    }

    private func handleDrop(item: ScheduledItem, translation: CGSize, config: TimelineDragConfig) {
        let interaction = config.interaction

        if interaction.dragOverDelete {
            withAnimation(HoradiaTheme.Motion.quick) { interaction.commitRemove(item: item) }
            return
        }
        guard item.isPersonal else {           // classes keep their real time (§14)
            interaction.endDrag()
            return
        }

        let calendar = HoradiaCalendar.current
        let minutesDelta = Double(translation.height / pointsPerMinute)
        var target = item.start.addingTimeInterval(minutesDelta * 60)

        if config.columnPitch > 0 {
            let shift = DragMath.dayShift(forHorizontalTranslation: translation.width, columnPitch: config.columnPitch)
            if shift != 0 {
                let targetDay = DragMath.shiftDay(of: config.day, by: shift, calendar: calendar)
                let secondsIntoDay = target.timeIntervalSince(target.startOfDay(calendar: calendar))
                target = targetDay.startOfDay(calendar: calendar).addingTimeInterval(secondsIntoDay)
            }
        }

        let snapped = TimeGrid.snap(target, calendar: calendar)
        let bounds = FreeTimeEngine.DayBounds.standard(for: snapped, calendar: calendar)
        let lower = min(bounds.defaultStart, snapped.startOfDay(calendar: calendar).addingTimeInterval(6 * 3600))
        let clamped = DragMath.clampStart(snapped, duration: item.duration, lower: lower, upper: bounds.end)

        withAnimation(HoradiaTheme.Motion.standard) {
            interaction.commitMove(item: item, targetStart: clamped)
        }
    }

    /// Finger below this global-y counts as "over the quitar zone".
    private static var deleteZoneThreshold: CGFloat {
        UIScreen.main.bounds.height - 132
    }

    // MARK: Now indicator (§33)

    private func nowIndicator(at date: Date) -> some View {
        HStack(spacing: 6) {
            Circle().fill(Color.accentColor).frame(width: 7, height: 7)
            Rectangle().fill(Color.accentColor).frame(height: 1.5)
        }
        .offset(x: -6, y: yOffset(for: date) - 3.5)
        .accessibilityLabel("Ahora, \(HoradiaFormat.time(date))")
    }

    // MARK: Geometry

    private func yOffset(for date: Date) -> CGFloat {
        CGFloat(date.timeIntervalSince(timeline.start) / 60) * pointsPerMinute
    }

    private func height(for slot: TimeSlot) -> CGFloat {
        max(CGFloat(slot.duration / 60) * pointsPerMinute, HoradiaTheme.Timeline.minSlotHeight)
    }

    private func isWithinTimeline(_ date: Date) -> Bool {
        date >= timeline.start && date <= timeline.end
    }

    /// The ghost's y: the item's origin plus the drag delta, snapped to 15 min.
    private func snappedTargetY(for item: ScheduledItem) -> CGFloat {
        let originY = yOffset(for: item.start)
        let rawY = originY + liveTranslation.height
        let minutes = (Double(rawY / pointsPerMinute) / 15).rounded() * 15
        return CGFloat(minutes) * pointsPerMinute
    }
}

/// Everything `DayTimelineView` needs to turn a drop into a store mutation.
struct TimelineDragConfig {
    var interaction: PlannerInteraction
    /// The calendar day this timeline represents (for cross-day drops).
    var day: Date
    /// Column width + gap. `0` disables cross-day dragging (e.g. the Hoy screen).
    var columnPitch: CGFloat = 0
}

/// Applies the live drag translation only to the block being dragged.
private struct DragOffset: ViewModifier {
    let active: Bool
    let translation: CGSize
    func body(content: Content) -> some View {
        content.offset(active ? translation : .zero)
    }
}

/// A *very* subtle wobble for organisation mode (§13, §44). Honours Reduce
/// Motion (§45): with it on, the block simply sits still — the "−" badge already
/// signals the mode.
private struct Jiggle: ViewModifier {
    let active: Bool
    let reduceMotion: Bool
    let seed: UUID
    @State private var on = false

    private var amplitude: Double { seed.uuidString.first == "A" ? 0.7 : 0.55 }

    func body(content: Content) -> some View {
        content
            .rotationEffect(.degrees(active && on && !reduceMotion ? amplitude : (active && !reduceMotion ? -amplitude : 0)))
            .animation(
                active && !reduceMotion
                    ? .easeInOut(duration: 0.16).repeatForever(autoreverses: true)
                    : .default,
                value: on
            )
            .onChange(of: active) { _, isActive in
                on = isActive
            }
            .onAppear { if active { on = true } }
    }
}

#Preview("Day timeline") {
    let repo = MockScheduleRepository()
    let monday = Date().startOfWeek()
    return ScrollView {
        DayTimelineView(timeline: repo.timeline(for: monday), now: nil)
            .padding()
    }
    .background(Color(.systemGroupedBackground))
}
