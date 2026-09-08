import SwiftUI

/// The four-tab shell (product brief section 4). Semana is the default tab.
struct RootView: View {
    /// The live, mutable planner. Owned by `HoradiaApp`.
    let store: PlannerStore

    enum Tab: Hashable {
        case week, today, stats, settings
    }

    @State private var selection: Tab = RootView.initialTab

    /// Allows `-tab today|stats|settings` at launch (used for screenshots / UI
    /// testing). Defaults to Semana (§4).
    static var initialTab: Tab {
        guard let index = CommandLine.arguments.firstIndex(of: "-tab"),
              CommandLine.arguments.indices.contains(index + 1) else { return .week }
        switch CommandLine.arguments[index + 1] {
        case "today": return .today
        case "stats": return .stats
        case "settings": return .settings
        default: return .week
        }
    }

    var body: some View {
        TabView(selection: $selection) {
            WeekView(store: store)
                .tag(Tab.week)
                .tabItem { Label("Semana", systemImage: "calendar") }

            TodayView(store: store)
                .tag(Tab.today)
                .tabItem { Label("Hoy", systemImage: "sun.max") }

            StatsView(store: store)
                .tag(Tab.stats)
                .tabItem { Label("Estadísticas", systemImage: "chart.bar") }

            SettingsView(repository: store)
                .tag(Tab.settings)
                .tabItem { Label("Ajustes", systemImage: "gearshape") }
        }
    }
}

#Preview("Root") {
    RootView(store: .preview())
}
