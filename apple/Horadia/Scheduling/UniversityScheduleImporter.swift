import Foundation

/// Decodes the bundled `UniversitySchedule.json` (product brief section 24) into
/// value types, applying the G1 practice-group filter (section 22).
///
/// The JSON is a *seed* derived from the standard weekly pattern until the real
/// DAMERO is imported; every row is materialised explicitly by date, never by
/// recurrence (section 23).
enum UniversityScheduleImporter {

    // MARK: DTOs (match the JSON shape from section 24)

    struct Document: Decodable {
        var meta: Meta
        var subjects: [SubjectDTO]
        var events: [EventDTO]
    }

    struct Meta: Decodable {
        var schemaVersion: Int
        var sourceDocument: String
        var provisional: Bool
        var practiceGroup: String?
    }

    struct SubjectDTO: Decodable {
        var code: String
        var fullName: String
        var color: String
    }

    struct EventDTO: Decodable {
        var date: String
        var subject: String?
        var start: String
        var end: String?
        var type: String
        var group: String?
        var location: String?
        var title: String?
        var source: String?
    }

    // MARK: Result

    struct ImportedSubject: Equatable {
        var code: String
        var fullName: String
        var color: PastelColor
    }

    struct ImportedEvent: Identifiable, Equatable {
        var id = UUID()
        var day: Date
        var subjectCode: String?
        var start: TimeOfDay
        var end: TimeOfDay
        var kind: UniversityEventKind
        var location: String? = nil
        var title: String? = nil
        var isImported: Bool = true
    }

    struct Result: Equatable {
        var subjects: [ImportedSubject]
        var events: [ImportedEvent]
        var provisional: Bool
    }

    enum ImportError: Error {
        case resourceMissing
        case malformed(String)
    }

    // MARK: API

    static func loadBundled(
        bundle: Bundle = .main,
        calendar: Calendar = HoradiaCalendar.current
    ) throws -> Result {
        guard let url = bundle.url(forResource: "UniversitySchedule", withExtension: "json") else {
            throw ImportError.resourceMissing
        }
        let data = try Data(contentsOf: url)
        return try decode(data, calendar: calendar)
    }

    static func decode(
        _ data: Data,
        calendar: Calendar = HoradiaCalendar.current
    ) throws -> Result {
        let document: Document
        do {
            document = try JSONDecoder().decode(Document.self, from: data)
        } catch {
            throw ImportError.malformed(String(describing: error))
        }

        let subjects = document.subjects.map {
            ImportedSubject(
                code: $0.code,
                fullName: $0.fullName,
                color: PastelColor(rawValue: $0.color) ?? .stone
            )
        }

        let dayParser = DateFormatter.horadiaDayKey
        var events: [ImportedEvent] = []

        for dto in document.events {
            // Section 22: only load practices for Alba's group (G1 / Gr1).
            // A non-nil group that does not normalise to G1 is skipped entirely.
            if dto.group != nil, PracticeGroup.normalized(from: dto.group) == nil {
                continue
            }

            guard let parsedDay = dayParser.date(from: dto.date) else {
                throw ImportError.malformed("bad date \(dto.date)")
            }
            let day = calendar.startOfDay(for: parsedDay)

            guard let start = TimeOfDay(dto.start) else {
                throw ImportError.malformed("bad start \(dto.start)")
            }
            // Exams may omit `end` (section 24) → default to a 90-minute block.
            let end = dto.end.flatMap(TimeOfDay.init)
                ?? TimeOfDay(hour: min(23, start.hour + 1), minute: start.minute + 30 >= 60 ? start.minute - 30 : start.minute + 30)

            guard let kind = mapKind(dto.type) else {
                throw ImportError.malformed("unknown type \(dto.type)")
            }

            events.append(
                ImportedEvent(
                    day: day,
                    subjectCode: dto.subject,
                    start: start,
                    end: end,
                    kind: kind,
                    location: dto.location,
                    title: dto.title
                )
            )
        }

        return Result(subjects: subjects, events: events, provisional: document.meta.provisional)
    }

    private static func mapKind(_ raw: String) -> UniversityEventKind? {
        switch raw.lowercased() {
        case "lecture", "clase": return .lecture
        case "practice", "practica", "práctica": return .practice
        case "exam", "examen": return .exam
        case "holiday", "festivo": return .holiday
        case "vacation", "vacaciones": return .vacation
        default: return nil
        }
    }
}
