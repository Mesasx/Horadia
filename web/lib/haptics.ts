"use client";

/**
 * Moderate haptic feedback (§43): pick up, place, delete, conflict, complete.
 * Uses the Vibration API where available (Android / some browsers). iOS Safari
 * ignores `navigator.vibrate`, so this is a progressive enhancement — the app
 * never depends on it.
 */

export type Haptic = "pick" | "drop" | "delete" | "conflict" | "complete" | "select";

const PATTERNS: Record<Haptic, number | number[]> = {
  pick: 12,
  drop: 8,
  delete: [10, 30, 20],
  conflict: [16, 40, 16],
  complete: [8, 20, 8],
  select: 5,
};

export function haptic(kind: Haptic): void {
  if (typeof navigator === "undefined") return;
  try {
    navigator.vibrate?.(PATTERNS[kind]);
  } catch {
    /* no-op */
  }
}
