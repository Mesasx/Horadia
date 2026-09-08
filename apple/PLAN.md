# Horadia — plan por fases

Regla de trabajo (brief §50): al terminar cada fase → compila, corrige, tests,
informa, y solo se continúa si la base es estable. Nunca dejar el proyecto sin
compilar.

## ✅ Fase 1 — Base (actual)

- [x] Estructura del proyecto + `Horadia.xcodeproj` (grupos sincronizados Xcode 16)
- [x] Modelos SwiftData (§40) + value types de scheduling
- [x] Datos mock (`MockScheduleRepository`) + semilla `UniversitySchedule.json`
- [x] Navegación `TabView` de 4 pestañas, Semana por defecto (§4)
- [x] Shells de Semana / Hoy / Estadísticas / Ajustes
- [x] `ActivityCard` + `FreeTimeBlock` (§7)
- [x] `FreeTimeEngine` — huecos Libre ≥ 15 min (§6, §7, §42)
- [x] Previews de componentes y pantallas
- [x] Tests: motor de huecos, G1/Gr1, edad, semanas, stats, omisión de clase
- [x] `xcodebuild build` + `xcodebuild test` en verde

## Fase 2 — Interacción

### Checkpoint A ✅ (build + 36 tests en verde)
- [x] Columnas de Semana más anchas, **sin cortar palabras** (2 días/pantalla + peek)
- [x] `PlannerStore` mutable en memoria (mover, redimensionar, duplicar, copiar,
      fijar, realizada, eliminar, omitir/restaurar clase, biblioteca)
- [x] Sheet de detalle de actividad (§18): realizada · fijar/desbloquear ·
      duplicar · copiar al día siguiente · copiar a otro día · eliminar
- [x] Clases: sheet informativa + "No asistir este día" / "Volver a asistir" (§14)
- [x] Tocar "Libre" → creación rápida (§7) + "Crear actividad" (nombre/color/icono, §10)
- [x] App icon a partir del logo de Horadia (§47)

### Checkpoint B ✅ (build + 49 tests en verde)
- [x] Mantener pulsado → levantar (escala/sombra/haptic) → arrastrar → soltar (§12):
      rejilla de 15 min (§11) · cambio de día por arrastre lateral · ghost del destino
- [x] Zona "Soltar para quitar" / "no asistir" + banner "· Deshacer" 4 s (§14)
- [x] Detección de conflictos + diálogo "coincide con…" → Mantener ambas / Quitar / Cancelar (§15)
- [x] Modo organización "jiggle" (§13): entrar con pulsación larga en zona vacía,
      wobble muy sutil (respeta Reduce Motion), badge "−", botón "Finalizar"
- [x] "Mover a otro día…" en el sheet de detalle
- [x] `DragMath` + `ConflictEngine` puros y testeados
- ⚠️ El *tacto* del arrastre (seguir el dedo, inercia) necesita prueba en dispositivo;
      la lógica y los estados visuales están verificados por tests + capturas

### Checkpoint C ⏳
- [ ] Redimensionar con tirador (arrastrar el borde inferior)
- [ ] Reordenar entre columnas más fluido (autoscroll horizontal al arrastrar al borde)
- [ ] `SwiftDataScheduleRepository` + seeding de primera ejecución → **Fase 3**

## Fase 3 — Rutinas + universidad completa

- [ ] Rutinas (§16): editar una instancia vs. toda la serie
- [ ] Exámenes: cuenta atrás, estilo, avisos 24 h / 1 h (§25)
- [ ] Festivos / vacaciones a partir del DAMERO real (§26)
- [ ] Importador del "DAMERO CUARTO 26-27" real (1er cuatrimestre)
- [ ] Ajustes → Universidad: editar color de asignatura (§38)

## Fase 4 — Notificaciones + Estadísticas completas

- [ ] `UserNotifications` con los valores por defecto del §27
- [ ] Estadísticas: Planificado vs. Realizado, clases omitidas, Semana/Mes (§35)
- [ ] Preparación semanal del domingo (§36)

## Fase 5 — Extensiones del sistema

- [ ] WidgetKit: Ahora / Hoy / Mi día / Mi semana + lock screen (§30, §31)
- [ ] App Intents interactivos: marcar realizada, + Actividad (§32)
- [ ] EventKit opcional, desactivado por defecto (§28)
- [ ] iCloud/CloudKit: `cloudKitDatabase = .automatic` (§29)

## Fase 6 — Pulido

- [ ] Icono definitivo (§47), Dynamic Type y VoiceOver en todas las pantallas (§45)
- [ ] Reduced Motion, tamaños táctiles, contraste
- [ ] Cumpleaños como evento recurrente real (§39)
