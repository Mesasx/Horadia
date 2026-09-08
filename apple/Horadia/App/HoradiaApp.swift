import SwiftUI
import SwiftData

/// Horadia — personal weekly planner for Alba (product brief section 1).
@main
struct HoradiaApp: App {

    /// SwiftData stack, ready for the persistence phase.
    private let modelContainer = PersistenceController.makeContainer()

    /// The live, mutable planner (Phase 2, in-memory). Persistence to the
    /// SwiftData store above lands in Phase 3.
    @State private var store = PlannerStore()

    var body: some Scene {
        WindowGroup {
            RootView(store: store)
        }
        .modelContainer(modelContainer)
    }
}
