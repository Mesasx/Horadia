# Horadia — plan por fases

Regla de trabajo (brief §50): al terminar cada fase → compila, corrige, tests,
informa, y solo se continúa si la base es estable.

## Dos tracks

- **`apple/`** — app iOS nativa (SwiftUI). Fases 1–2 completas (49 tests). En
  pausa: no se puede probar en el iPhone (iOS 26) sin cuenta de desarrollador.
- **`web/`** — app web (Next.js). **Track activo.** Se despliega en Vercel y se
  instala como PWA. Sin widgets ni iCloud (fuera de alcance).

---

## web/ · Fase 3a — Base portada ✅  (build + 49 tests en verde)

- [x] Monorepo `horadia/` (`apple/` + `web/`), git init, primer commit
- [x] Motores portados Swift → TypeScript, 1:1, con sus tests (vitest, TZ Madrid)
      — huecos "Libre" ≥15 min, conflictos, stats, geometría de arrastre,
      importador con filtro G1 (`Gr1` ≡ `G1`), cumpleaños sin "22" fijo
- [x] `lib/planner.ts` (estado + mutaciones puras) + Zustand con persistencia
      `localStorage`
- [x] Semana (scroll horizontal, ~2 días, sin cortar palabras, swipe de semana)
- [x] Hoy (timeline vertical + línea AHORA + "A continuación")
- [x] Estadísticas (Semana/Mes, barras, desglose por categoría)
- [x] Ajustes (perfil, tema claro/oscuro/sistema, color de asignatura §38, reset)
- [x] Mantener pulsado → arrastrar → soltar (overlay que sigue el dedo):
      rejilla 15 min, cambio de día lateral, ghost del destino
- [x] Zona "Soltar para quitar" / "no asistir" + banner Deshacer (§14)
- [x] Diálogo de conflicto "coincide con…" (§15)
- [x] Modo organización jiggle (§13): pulsación larga en zona vacía, badge −, Finalizar
- [x] Sheet de detalle (§18): realizada / fijar / duplicar / copiar / mover / eliminar
- [x] Tocar "Libre" → creación rápida + "Crear actividad" (nombre/color/icono §10)
- [x] PWA: manifest, iconos, `apple-touch-icon`, service worker offline
- ⚠️ El *tacto* del arrastre solo se valida en el móvil real (sin navegador local
      para captura por un problema de certificados TLS del entorno)

## web/ · Fase 3b — Publicar ⏳

- [ ] Push a GitHub (repo privado `horadia`) — **falta autenticación del usuario**
- [ ] Proyecto Vercel con Root Directory `web/` → URL
- [ ] Instalar como PWA en el iPhone y revisar en dispositivo
- Ver [DEPLOY.md](DEPLOY.md)

## web/ · Fase 3c — Universidad completa + rutinas

- [x] Importar los **DAMERO CUARTO 26-27 oficiales** de 1C y 2C, con clases,
      prácticas G1/todos los grupos, exámenes, festivos y vacaciones.
- [ ] Rutinas (§16): editar una instancia vs. serie
- [ ] Exámenes: cuenta atrás, estilo, avisos 24 h / 1 h (§25)
- [ ] Festivos / vacaciones del DAMERO real (§26)

## web/ · Fase 4 — Notificaciones + Estadísticas completas

- [ ] Web Push (PWA iOS 16.4+) con los valores por defecto del §27
- [ ] Estadísticas: Planificado vs. Realizado, clases omitidas (§35)
- [ ] Preparación semanal del domingo (§36)

## web/ · Fase 5 — Pulido

- [ ] Accesibilidad completa: Dynamic Type, VoiceOver, contraste, Reduced Motion (§45)
- [ ] Icono definitivo (§47)
- [ ] Cumpleaños como evento recurrente real (§39)
- [ ] EventKit web equivalente: descartado (no hay API de calendario en web)
