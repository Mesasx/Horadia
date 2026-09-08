import Foundation
import SwiftData

/// Owns the SwiftData stack (product brief sections 29, 40).
///
/// Phase 1 only *builds* the container so the schema is exercised and ready;
/// the running UI still reads from `MockScheduleRepository` to guarantee the
/// Phase 1 visual. CloudKit sync (`.automatic`) and first-run seeding are wired
/// in the persistence phase.
enum PersistenceController {

    static let schema = Schema([
        ActivityDefinition.self,
        ScheduledActivity.self,
        Routine.self,
        ActivityCompletion.self,
        NotificationPreference.self,
        UniversitySubject.self,
        UniversityEvent.self,
        UniversityEventOverride.self,
        UserPreferences.self,
    ])

    /// On-disk container for the app.
    static func makeContainer(inMemory: Bool = false) -> ModelContainer {
        let configuration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: inMemory
            // cloudKitDatabase: .automatic  // ← enabled in the iCloud phase
        )
        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            // A corrupt local store must not brick the app (section 29: keep
            // working locally). Fall back to a fresh in-memory store.
            assertionFailure("ModelContainer failed: \(error)")
            let fallback = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
            // swiftlint:disable:next force_try
            return try! ModelContainer(for: schema, configurations: [fallback])
        }
    }

    /// In-memory container for previews and tests.
    static func makePreviewContainer() -> ModelContainer {
        makeContainer(inMemory: true)
    }
}
