# Publicar Horadia (GitHub + Vercel)

El repositorio ya está listo localmente (rama `main`, primer commit hecho).
Falta **autenticar** GitHub y Vercel — eso solo lo puedes hacer tú.

## Opción A — Yo lo hago con tokens (lo más rápido)

Dame dos tokens (créalos, pégalos, y luego puedes revocarlos):

1. **GitHub** → https://github.com/settings/tokens?type=beta
   "Generate new token" · repositorio: solo `horadia` (o "All repositories" si
   aún no existe) · permisos: **Contents: Read and write**, **Administration:
   Read and write** (para crear el repo). Copia el `github_pat_...`.

2. **Vercel** → https://vercel.com/account/tokens
   "Create Token" · scope: tu cuenta · copia el `...`.

Con eso yo: creo el repo privado `horadia`, hago push, creo el proyecto en
Vercel apuntando a `web/`, despliego, y te paso la URL.

## Opción B — Lo haces tú (3 minutos)

### 1. GitHub

```bash
# crea el repo vacío en https://github.com/new  (nombre: horadia, Privado, sin README)
cd "/Users/pedrojr/Desktop/APPS MAC/horadia"
git remote add origin https://github.com/<tu-usuario>/horadia.git
git push -u origin main
```

### 2. Vercel

1. https://vercel.com/new → **Import** el repo `horadia`.
2. **Root Directory** → `web`  ← importante (es un monorepo).
3. Framework Preset: **Next.js** (se detecta solo). Sin variables de entorno.
4. **Deploy**. En ~1 min tienes una URL tipo `https://horadia.vercel.app`.

Cada `git push` a `main` vuelve a desplegar solo.

## Instalar en el iPhone (PWA)

1. Abre la URL de Vercel en **Safari** (no Chrome).
2. Compartir → **Añadir a pantalla de inicio**.
3. Se instala con icono propio, a pantalla completa, y funciona sin conexión.

> Nota: no es una app de la App Store — es una web-app instalada. No hay widgets
> ni iCloud (fuera de alcance). Los datos se guardan en el propio teléfono.
