# Horadia

Planificador semanal personal. La interacción principal es **mantener pulsado →
arrastrar → soltar**, como reorganizar los iconos de la pantalla de inicio.
Primera usuaria: Alba (Farmacia, 4º curso, grupo G1, que además trabaja).

## Estructura

| Carpeta | Qué es |
|---|---|
| [`web/`](web/) | App web (Next.js + React + TypeScript). Es la que se despliega en Vercel y se instala como PWA en el móvil. |
| [`apple/`](apple/) | App iOS nativa (Swift / SwiftUI / SwiftData). Fases 1–2 completas. |

Ambas comparten el mismo modelo de dominio: los motores puros (huecos "Libre",
conflictos, estadísticas, geometría de arrastre) y el mismo `UniversitySchedule`.

## web/

```bash
cd web
npm install
npm run dev      # http://localhost:3000
npm test         # motores portados de Swift (49 tests)
npm run build
```

- **Persistencia:** `localStorage` en el dispositivo. Sin login, sin backend, sin
  servidor. Funciona sin conexión (service worker + PWA).
- **Sin iCloud ni widgets** (fuera de alcance para la web).
- **Zona horaria:** usa la del navegador (la de Alba es Europe/Madrid).

## Horario de la universidad

`web/data/university-schedule.json` — de momento es una **semilla provisional**
generada a partir del patrón semanal estándar. Pendiente de sustituir por el
"DAMERO CUARTO 26-27" real (solo 1er cuatrimestre; sin inventar febrero–junio).
Solo se cargan las prácticas del **G1** (`Gr1` ≡ `G1`).

## Fases

Ver [`apple/PLAN.md`](apple/PLAN.md). La web retoma en la **Fase 3**: rutinas,
universidad completa, exámenes con cuenta atrás, notificaciones y estadísticas
Planificado vs. Realizado.
