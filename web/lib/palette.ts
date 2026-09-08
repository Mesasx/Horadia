/**
 * Horadia's pastel palette (product brief §3 "colores pastel", §21 "unique
 * auto-assigned pastel colours per subject") — port of the Swift `PastelColor`.
 *
 * Each token exposes three semantic roles, each with an explicit light and dark
 * RGB triple:
 * - `fill`   — the soft block background,
 * - `border` — a slightly stronger hairline for accessibility (§45),
 * - `accent` — a saturated version for text / icons / the "now" line.
 *
 * The triples are emitted as CSS custom properties (see `paletteCSS`) so the
 * rest of the UI just reads `var(--p-sky-fill)` and gets the right value per
 * appearance.
 */

export type PastelToken =
  | "blush"
  | "peach"
  | "apricot"
  | "butter"
  | "citron"
  | "sage"
  | "mint"
  | "seafoam"
  | "sky"
  | "periwinkle"
  | "lavender"
  | "lilac"
  | "mauve"
  | "rose"
  | "clay"
  | "stone";

export const PASTEL_TOKENS: PastelToken[] = [
  "blush", "peach", "apricot", "butter", "citron", "sage",
  "mint", "seafoam", "sky", "periwinkle", "lavender", "lilac",
  "mauve", "rose", "clay", "stone",
];

type Triple = [number, number, number];
interface Swatch {
  fillLight: Triple; fillDark: Triple;
  borderLight: Triple; borderDark: Triple;
  accentLight: Triple; accentDark: Triple;
}

/** 0…1 RGB, matching the Swift source exactly. */
const SWATCHES: Record<PastelToken, Swatch> = {
  blush:      { fillLight: [1.0, 0.9, 0.92], fillDark: [0.28, 0.17, 0.21], borderLight: [0.96, 0.74, 0.79], borderDark: [0.55, 0.33, 0.4], accentLight: [0.8, 0.34, 0.45], accentDark: [0.96, 0.68, 0.75] },
  peach:      { fillLight: [1.0, 0.91, 0.84], fillDark: [0.3, 0.2, 0.14], borderLight: [0.98, 0.78, 0.64], borderDark: [0.58, 0.38, 0.26], accentLight: [0.82, 0.45, 0.24], accentDark: [0.97, 0.73, 0.55] },
  apricot:    { fillLight: [1.0, 0.89, 0.79], fillDark: [0.31, 0.22, 0.13], borderLight: [0.98, 0.76, 0.57], borderDark: [0.6, 0.42, 0.24], accentLight: [0.8, 0.5, 0.18], accentDark: [0.96, 0.75, 0.48] },
  butter:     { fillLight: [1.0, 0.96, 0.82], fillDark: [0.29, 0.26, 0.14], borderLight: [0.95, 0.86, 0.58], borderDark: [0.56, 0.5, 0.26], accentLight: [0.66, 0.54, 0.14], accentDark: [0.92, 0.84, 0.48] },
  citron:     { fillLight: [0.94, 0.97, 0.8], fillDark: [0.23, 0.28, 0.14], borderLight: [0.83, 0.91, 0.56], borderDark: [0.44, 0.53, 0.25], accentLight: [0.48, 0.56, 0.14], accentDark: [0.8, 0.88, 0.46] },
  sage:       { fillLight: [0.88, 0.94, 0.86], fillDark: [0.17, 0.26, 0.19], borderLight: [0.72, 0.86, 0.7], borderDark: [0.36, 0.5, 0.36], accentLight: [0.28, 0.52, 0.3], accentDark: [0.66, 0.84, 0.66] },
  mint:       { fillLight: [0.84, 0.95, 0.9], fillDark: [0.13, 0.28, 0.24], borderLight: [0.64, 0.88, 0.8], borderDark: [0.3, 0.53, 0.46], accentLight: [0.16, 0.53, 0.44], accentDark: [0.56, 0.86, 0.78] },
  seafoam:    { fillLight: [0.83, 0.94, 0.94], fillDark: [0.13, 0.27, 0.28], borderLight: [0.62, 0.86, 0.87], borderDark: [0.29, 0.51, 0.53], accentLight: [0.15, 0.5, 0.53], accentDark: [0.54, 0.83, 0.86] },
  sky:        { fillLight: [0.84, 0.92, 0.99], fillDark: [0.13, 0.23, 0.32], borderLight: [0.63, 0.81, 0.96], borderDark: [0.3, 0.45, 0.6], accentLight: [0.18, 0.45, 0.72], accentDark: [0.56, 0.78, 0.97] },
  periwinkle: { fillLight: [0.87, 0.89, 0.99], fillDark: [0.18, 0.2, 0.34], borderLight: [0.7, 0.74, 0.97], borderDark: [0.37, 0.4, 0.63], accentLight: [0.33, 0.38, 0.75], accentDark: [0.66, 0.7, 0.98] },
  lavender:   { fillLight: [0.91, 0.87, 0.98], fillDark: [0.22, 0.18, 0.33], borderLight: [0.78, 0.7, 0.95], borderDark: [0.44, 0.37, 0.62], accentLight: [0.45, 0.34, 0.72], accentDark: [0.74, 0.66, 0.97] },
  lilac:      { fillLight: [0.95, 0.87, 0.97], fillDark: [0.27, 0.18, 0.31], borderLight: [0.87, 0.7, 0.92], borderDark: [0.51, 0.36, 0.57], accentLight: [0.55, 0.31, 0.63], accentDark: [0.83, 0.64, 0.9] },
  mauve:      { fillLight: [0.96, 0.88, 0.92], fillDark: [0.28, 0.19, 0.25], borderLight: [0.88, 0.72, 0.8], borderDark: [0.52, 0.37, 0.45], accentLight: [0.58, 0.34, 0.46], accentDark: [0.85, 0.66, 0.75] },
  rose:       { fillLight: [1.0, 0.88, 0.89], fillDark: [0.3, 0.17, 0.19], borderLight: [0.98, 0.72, 0.74], borderDark: [0.58, 0.34, 0.37], accentLight: [0.78, 0.32, 0.38], accentDark: [0.96, 0.66, 0.7] },
  clay:       { fillLight: [0.96, 0.9, 0.85], fillDark: [0.28, 0.22, 0.18], borderLight: [0.88, 0.76, 0.66], borderDark: [0.52, 0.42, 0.33], accentLight: [0.56, 0.42, 0.3], accentDark: [0.84, 0.72, 0.6] },
  stone:      { fillLight: [0.92, 0.92, 0.93], fillDark: [0.22, 0.23, 0.25], borderLight: [0.78, 0.79, 0.81], borderDark: [0.42, 0.44, 0.47], accentLight: [0.4, 0.42, 0.45], accentDark: [0.74, 0.76, 0.79] },
};

/** Spanish display name (Ajustes → asignaturas colour picker, §38). */
export const PASTEL_NAMES: Record<PastelToken, string> = {
  blush: "Rubor", peach: "Melocotón", apricot: "Albaricoque", butter: "Mantequilla",
  citron: "Cidra", sage: "Salvia", mint: "Menta", seafoam: "Espuma", sky: "Cielo",
  periwinkle: "Vincapervinca", lavender: "Lavanda", lilac: "Lila", mauve: "Malva",
  rose: "Rosa", clay: "Arcilla", stone: "Piedra",
};

function rgb([r, g, b]: Triple): string {
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
}

/** CSS custom properties for every token/role, light values on `:root`, dark
 *  values under both the media query and an explicit `[data-theme="dark"]`. */
export function paletteCSS(): string {
  const light: string[] = [];
  const dark: string[] = [];
  for (const token of PASTEL_TOKENS) {
    const s = SWATCHES[token];
    light.push(`--p-${token}-fill:${rgb(s.fillLight)};`);
    light.push(`--p-${token}-border:${rgb(s.borderLight)};`);
    light.push(`--p-${token}-accent:${rgb(s.accentLight)};`);
    dark.push(`--p-${token}-fill:${rgb(s.fillDark)};`);
    dark.push(`--p-${token}-border:${rgb(s.borderDark)};`);
    dark.push(`--p-${token}-accent:${rgb(s.accentDark)};`);
  }
  return [
    `:root{${light.join("")}}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${dark.join("")}}}`,
    `:root[data-theme="dark"]{${dark.join("")}}`,
  ].join("\n");
}

export interface PaletteVars {
  fill: string;
  border: string;
  accent: string;
}

/** The `var(--…)` references for a token, for inline `style` props. */
export function paletteVars(token: PastelToken): PaletteVars {
  return {
    fill: `var(--p-${token}-fill)`,
    border: `var(--p-${token}-border)`,
    accent: `var(--p-${token}-accent)`,
  };
}
