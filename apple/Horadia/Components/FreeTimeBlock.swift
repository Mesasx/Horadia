import SwiftUI

/// The "Libre" block (product brief section 7).
///
/// Deliberately much lighter than an `ActivityCard`:
/// - transparent fill,
/// - dashed border,
/// - continuous corner radius,
/// - centred, quiet "Libre" label with the time range,
/// - works in light and dark.
///
/// Short gaps (the 15-minute breaks between classes) still count as Libre per
/// §7, but there is no room for a label — they render as a barely-there dashed
/// strip so the timeline stays calm and close to the Phase 1 visual sketch.
///
/// Tapping it opens the quick-create sheet (wired by the timeline layer); an
/// activity can also be dragged onto it.
struct FreeTimeBlock: View {
    let slot: TimeSlot
    var isDropTarget: Bool = false

    @Environment(\.dynamicTypeSize) private var typeSize

    /// Below this the block is a thin strip with no text.
    private var isCompact: Bool { slot.duration < 28 * 60 }
    private var showsRange: Bool {
        slot.duration >= 45 * 60 && !typeSize.isAccessibilitySize
    }

    private var strokeColor: Color {
        isDropTarget ? Color.accentColor : Color.secondary.opacity(isCompact ? 0.28 : 0.35)
    }

    var body: some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(
                RoundedRectangle(cornerRadius: HoradiaTheme.Radius.block, style: .continuous)
                    .fill(isDropTarget ? Color.accentColor.opacity(0.10) : Color.clear)
            )
            .overlay(
                RoundedRectangle(cornerRadius: HoradiaTheme.Radius.block, style: .continuous)
                    .strokeBorder(
                        strokeColor,
                        style: StrokeStyle(lineWidth: 1, dash: isCompact ? [3, 3] : [4, 4])
                    )
            )
            .animation(HoradiaTheme.Motion.quick, value: isDropTarget)
            .contentShape(RoundedRectangle(cornerRadius: HoradiaTheme.Radius.block, style: .continuous))
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Libre, \(HoradiaFormat.range(slot.start, slot.end))")
            .accessibilityHint("Toca para añadir una actividad")
    }

    @ViewBuilder
    private var content: some View {
        if isCompact {
            Color.clear
        } else {
            VStack(spacing: 2) {
                Text("Libre")
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(.secondary)
                if showsRange {
                    Text(HoradiaFormat.range(slot.start, slot.end))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
            .padding(.horizontal, HoradiaTheme.Spacing.s)
        }
    }
}

#Preview("Free blocks", traits: .sizeThatFitsLayout) {
    let day = Date().startOfDay()
    return VStack(spacing: 12) {
        FreeTimeBlock(slot: TimeSlot(
            start: day.settingTime(TimeOfDay(hour: 14, minute: 0)),
            end: day.settingTime(TimeOfDay(hour: 16, minute: 0))
        ))
        .frame(height: 120)

        FreeTimeBlock(slot: TimeSlot(
            start: day.settingTime(TimeOfDay(hour: 17, minute: 0)),
            end: day.settingTime(TimeOfDay(hour: 18, minute: 0))
        ), isDropTarget: true)
        .frame(height: 60)

        FreeTimeBlock(slot: TimeSlot(
            start: day.settingTime(TimeOfDay(hour: 10, minute: 30)),
            end: day.settingTime(TimeOfDay(hour: 10, minute: 45))
        ))
        .frame(height: 18)
    }
    .padding()
    .background(Color(.systemGroupedBackground))
}
