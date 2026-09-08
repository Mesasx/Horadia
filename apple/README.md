# Horadia

Planificador semanal personal, iOS nativo (Swift · SwiftUI · SwiftData).
Hecho inicialmente para Alba (estudiante de Farmacia que además trabaja).

> **Estado: Fase 1** — base de datos, motor de huecos "Libre", navegación y
> shells visuales de las cuatro pestañas. Sin widgets / EventKit / CloudKit
> todavía (ver `PLAN.md`).

## Abrir el proyecto

```bash
open Horadia.xcodeproj
```

Requiere **Xcode 16.2** (última versión compatible con macOS Sonoma 14).
Runtime del simulador: **iOS 18.3**. Deployment target: **iOS 17.0**.

### Compilar y testear desde la terminal

```bash
xcodebuild build -scheme Horadia \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro'

xcodebuild test -scheme Horadia \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro'
```

## Arquitectura

MVVM + capa de servicios pura. La lógica de negocio nunca vive en las vistas.

```
Horadia/
├── App/            HoradiaApp, RootView (TabView), PersistenceController
├── DesignSystem/   PastelColor (paleta claro/oscuro), HoradiaTheme, Haptics
├── Models/         @Model SwiftData: ActivityDefinition, ScheduledActivity,
│                   Routine, UniversitySubject/Event/Override, UserPreferences…
├── Scheduling/     Value types + motores PUROS (testables sin SwiftData):
│                   TimeSlot, FreeTimeEngine, DayAssembler, StatsEngine,
│                   ScheduleRepository (+ MockScheduleRepository),
│                   UniversityScheduleImporter (filtro G1 / equivalencia Gr1)
├── Components/     ActivityCard, FreeTimeBlock, DayTimelineView
├── Features/       Week/ · Today/ · Stats/ · Settings/  (View + ViewModel)
├── Support/        Date+Horadia (calendario lunes-primero, rejilla 15 min),
│                   Formatters
└── Resources/      UniversitySchedule.json (semilla), Assets.xcassets
```

### Conceptos clave

- **Bloque "Libre"** (`FreeTimeEngine`): todo hueco ≥ 15 min entre actividades se
  convierte en un único bloque Libre; huecos < 15 min no generan bloque; un día
  vacío es un solo bloque 09:00–00:00.
- **Día Horadia**: empieza a las 09:00 (antes si hay una actividad más temprana),
  termina a las 00:00; soporta actividades que cruzan medianoche.
- **Clases universitarias**: hora real e inmutable (`isImmovable`). Se pueden
  "no asistir" en una fecha concreta vía `UniversityEventOverride(omitted:)` sin
  tocar el horario oficial ni las demás instancias.
- **Grupo G1**: `PracticeGroup.normalized` trata `Gr1`, `GRUPO 1`… como `G1` y
  descarta G2/G3/G4.

### Datos universitarios

`UniversitySchedule.json` es **provisional**: generado a partir del patrón
semanal estándar del brief (sección 23), materializado por fecha para el primer
cuatrimestre (sep 2026 – fin de enero 2027). Pendiente de sustituir por el
"DAMERO CUARTO 26-27" real. El segundo cuatrimestre se deja sin inventar.

## Tests

`HoradiaTests/` (Swift Testing): motor de huecos (incl. objetivo visual de la
Fase 1, regla de los 15 min, medianoche, día vacío), filtro G1 / equivalencia
Gr1, cálculo de edad del cumpleaños, navegación entre semanas, totales de
estadísticas, omisión de una sola instancia de clase, festivos.
