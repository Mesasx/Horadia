import SwiftUI
import Charts

/// The Estadísticas screen (product brief section 35).
///
/// Phase 1: weekly per-category hours from the visible week, a simple native
/// Swift Charts bar chart and a legible list. Semana/Mes toggle is present;
/// "Planificado vs Realizado" and omitted-class detail come with later phases.
struct StatsView: View {
    /// Concrete store so totals refresh when activities change (§35).
    let store: PlannerStore
    @State private var model: StatsViewModel

    init(store: PlannerStore) {
        self.store = store
        _model = State(initialValue: StatsViewModel(repository: store))
    }

    var body: some View {
        let _ = store.personalItems.count
        let _ = store.omittedInstanceKeys.count

        return NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: HoradiaTheme.Spacing.xl) {
                    Picker("Periodo", selection: $model.range) {
                        ForEach(StatsViewModel.Range.allCases, id: \.self) { range in
                            Text(range.displayName).tag(range)
                        }
                    }
                    .pickerStyle(.segmented)

                    chart

                    VStack(spacing: 0) {
                        ForEach(model.rows) { row in
                            HStack {
                                Circle()
                                    .fill(row.category.palette.accent)
                                    .frame(width: 9, height: 9)
                                Text(row.category.displayName)
                                    .font(.subheadline)
                                Spacer()
                                Text(row.valueText)
                                    .font(.subheadline.weight(.medium))
                                    .monospacedDigit()
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.vertical, HoradiaTheme.Spacing.m)
                            if row.id != model.rows.last?.id {
                                Divider()
                            }
                        }
                    }
                    .padding(.horizontal, HoradiaTheme.Spacing.l)
                    .background(
                        RoundedRectangle(cornerRadius: HoradiaTheme.Radius.card, style: .continuous)
                            .fill(Color(.secondarySystemGroupedBackground))
                    )
                }
                .padding(HoradiaTheme.Spacing.l)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Estadísticas")
        }
    }

    private var chart: some View {
        Chart(model.rows) { row in
            BarMark(
                x: .value("Horas", row.hours),
                y: .value("Categoría", row.category.displayName)
            )
            .foregroundStyle(row.category.palette.accent)
            .cornerRadius(6)
            .annotation(position: .trailing, alignment: .leading) {
                Text(row.valueText)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .chartXAxis {
            AxisMarks { _ in
                AxisGridLine()
                AxisValueLabel()
            }
        }
        .frame(height: CGFloat(model.rows.count) * 38 + 24)
        .accessibilityLabel("Horas por categoría")
    }
}

#Preview("Stats") {
    StatsView(store: .preview())
}
