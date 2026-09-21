# Horadia

Planificador semanal personal. La interacción principal es **mantener pulsado →
arrastrar → soltar**, como reorganizar los iconos de la pantalla de inicio.
Primera usuaria: Alba (Farmacia, 4º curso, grupo G2, que además trabaja).

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

- **Persistencia:** `localStorage` en el dispositivo. El acceso privado se valida
  en servidor y deja una sesión persistente por dispositivo. Funciona sin conexión
  una vez autorizada (service worker + PWA).
- **Sin iCloud ni widgets** (fuera de alcance para la web).
- **Zona horaria:** usa la del navegador (la de Alba es Europe/Madrid).

## Horario de la universidad

`web/data/university-schedule.json` contiene el DAMERO de primer cuatrimestre
transcrito para G2 y la cobertura de segundo cuatrimestre que ya existía en el
repositorio. Para verificar las fechas de G2 del segundo cuatrimestre faltan los
dos PDF oficiales correspondientes.
Solo se cargan las prácticas del **G2** (`Gr2` ≡ `G2`) y las actividades marcadas para todos los grupos.

La app web pide la contraseña del dispositivo la primera vez que se abre en cada navegador. Para desplegar el acceso privado hay que configurar `HORADIA_ACCESS_PASSWORD_HASH` y `HORADIA_SESSION_SECRET` en Vercel; nunca se debe guardar la contraseña en el repositorio.

En Semana, “Recordatorios y entregas” permite crear una entrega asociada a cualquiera de las asignaturas de Alba, con fecha límite, hora opcional, aviso y estado completada. Las entregas se guardan junto al resto de los datos locales y se sincronizan con Web Push cuando las notificaciones están activadas.

## Fases

Ver [`apple/PLAN.md`](apple/PLAN.md). La web retoma en la **Fase 3**: rutinas,
universidad completa, exámenes con cuenta atrás, notificaciones y estadísticas
Planificado vs. Realizado.
