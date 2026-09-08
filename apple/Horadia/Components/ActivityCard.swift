import SwiftUI

/// A single activity block on the timeline (product brief sections 3, 12, 25).
///
/// Visual language:
/// - soft pastel `fill`, hairline `border`, extremely subtle resting shadow;
/// - continuous corner radius;
/// - exams get a stronger border + exam icon (section 25), never alarming red;
/// - a discreet 🔒 when pinned (section 17), ✓ when completed (section 20);
/// - immovable university classes read differently but are not visually loud.
///
/// The card is presentation-only. Gestures (long-press to lift, drag, resize)
/// are attached by the timeline layer in later phases.
struct ActivityCard: View {
    let item: ScheduledItem
    /// Height is driven by the timeline (points-per-minute); the card adapts its
    /// internal layout to whatever vertical space it gets.
    var isLifted: Bool = false

    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric(relativeTo: .caption) private var verticalPadding: CGFloat = 6
    @ScaledMetric(relativeTo: .caption) private var horizontalPadding: CGFloat = 10

    private var isExam: Bool {
        if case .university(.exam) = item.kind { return true }
        return false
    }

    private var borderWidth: CGFloat {
        isExam ? HoradiaTheme.Stroke.emphasised : HoradiaTheme.Stroke.block
    }

    var body: some View {
        HStack(alignment: .top, spacing: HoradiaTheme.Spacing.s) {
            RoundedRectangle(cornerRadius: 2, style: .continuous)
                .fill(item.palette.accent)
                .frame(width: 3)
                .padding(.vertical, 1)

            VStack(alignment: .leading, spacing: 2) {
                if let badge = item.badge {
                    Text(badge)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(item.palette.accent)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }

                HStack(spacing: 4) {
                    Image(systemName: item.symbolName)
                        .font(.caption2)
                        .foregroundStyle(item.palette.accent)
                        .accessibilityHidden(true)

                    // The user's rule: never break a word. Keep the title on one
                    // line; if it is genuinely too long, scale the whole string
                    // down rather than hyphenate or clip it.
                    Text(item.title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                        .allowsTightening(true)

                    if item.isPinned {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 9))
                            .foregroundStyle(.secondary)
                            .accessibilityHidden(true)
                    }
                    if item.isCompleted {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(item.palette.accent)
                            .accessibilityHidden(true)
                    }
                }

                if showsTimeRange {
                    Text(HoradiaFormat.range(item.start, item.end))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                        .fixedSize(horizontal: true, vertical: false)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, verticalPadding)
        .padding(.horizontal, horizontalPadding)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: HoradiaTheme.Radius.block, style: .continuous)
                .fill(item.palette.fill)
        )
        .overlay(
            RoundedRectangle(cornerRadius: HoradiaTheme.Radius.block, style: .continuous)
                .strokeBorder(item.palette.border, lineWidth: borderWidth)
        )
        .opacity(item.isCompleted ? 0.66 : 1)
        .scaleEffect(isLifted ? 1.03 : 1)
        .modifier(LiftShadow(isLifted: isLifted))
        .contentShape(RoundedRectangle(cornerRadius: HoradiaTheme.Radius.block, style: .continuous))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityLabel)
        .accessibilityHint(item.isImmovable ? "Clase con horario fijo" : "Mantén pulsado para mover")
    }

    /// Hide the time range on very short blocks (< 30 min) or huge type sizes to
    /// avoid clipping.
    private var showsTimeRange: Bool {
        item.duration >= 30 * 60 && !typeSize.isAccessibilitySize
    }

    private var accessibilityLabel: String {
        var parts: [String] = [item.kind.accessibilityCategory, item.fullTitle ?? item.title]
        parts.append(HoradiaFormat.range(item.start, item.end))
        if item.isPinned { parts.append("fijada") }
        if item.isCompleted { parts.append("realizada") }
        return parts.joined(separator: ", ")
    }
}

private struct LiftShadow: ViewModifier {
    let isLifted: Bool
    func body(content: Content) -> some View {
        if isLifted {
            content.horadiaLiftedShadow()
        } else {
            content.horadiaRestingShadow()
        }
    }
}

#Preview("Activity cards", traits: .sizeThatFitsLayout) {
    let day = Date().startOfDay()
    let samples: [ScheduledItem] = [
        ScheduledItem(id: UUID(), title: "Bioquímica e Inmunología", badge: nil,
                      start: day.settingTime(TimeOfDay(hour: 10, minute: 45)),
                      end: day.settingTime(TimeOfDay(hour: 12, minute: 15)),
                      kind: .university(.lecture), palette: .mint, symbolName: "book.closed",
                      isImmovable: true),
        ScheduledItem(id: UUID(), title: "Tecnología Farmacéutica II", badge: "EXAMEN · TF II",
                      start: day.settingTime(TimeOfDay(hour: 9, minute: 0)),
                      end: day.settingTime(TimeOfDay(hour: 10, minute: 30)),
                      kind: .university(.exam), palette: .lavender, symbolName: "pencil.and.list.clipboard",
                      isImmovable: true),
        ScheduledItem(id: UUID(), title: "Siesta", badge: nil,
                      start: day.settingTime(TimeOfDay(hour: 16, minute: 0)),
                      end: day.settingTime(TimeOfDay(hour: 17, minute: 0)),
                      kind: .nap, palette: .peach, symbolName: "moon.zzz", isPinned: true),
        ScheduledItem(id: UUID(), title: "Deporte", badge: nil,
                      start: day.settingTime(TimeOfDay(hour: 18, minute: 0)),
                      end: day.settingTime(TimeOfDay(hour: 19, minute: 30)),
                      kind: .sport, palette: .mint, symbolName: "figure.run", isCompleted: true),
    ]
    return VStack(spacing: 12) {
        ForEach(samples) { item in
            ActivityCard(item: item).frame(height: max(44, item.duration / 60 * HoradiaTheme.Timeline.pointsPerMinute))
        }
    }
    .padding()
    .background(Color(.systemGroupedBackground))
}
