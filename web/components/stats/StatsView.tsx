"use client";

/**
 * The Estadísticas screen (§35): Semana / Mes toggle, a simple bar chart and a
 * per-category breakdown. Categories: Universidad / Trabajo / Estudio / Deporte /
 * Siesta / Libre.
 */

import { useMemo, useState } from "react";
import { usePlannerStore } from "@/store/planner-store";
import { timelineFor } from "@/lib/planner";
import { weekDays, startOfWeek, addDays } from "@/lib/time";
import {
  computeTotals,
  hoursOf,
  STAT_CATEGORIES,
  STAT_CATEGORY_NAME,
  STAT_CATEGORY_PALETTE,
} from "@/lib/stats";
import { paletteVars } from "@/lib/palette";

type Range = "week" | "month";

export function StatsView({ now }: { now: number }) {
  const state = usePlannerStore();
  const [range, setRange] = useState<Range>("week");

  const totals = useMemo(() => {
    const anchor = new Date(now);
    let days: Date[];
    if (range === "week") {
      days = weekDays(anchor);
    } else {
      const first = startOfWeek(anchor);
      days = Array.from({ length: 28 }, (_, i) => addDays(first, i - 14));
    }
    return computeTotals(days.map((d) => timelineFor(state, d)));
  }, [state, now, range]);

  const rows = STAT_CATEGORIES.map((cat) => ({
    cat,
    hours: hoursOf(totals, cat),
  })).filter((r) => r.hours > 0);
  const max = Math.max(1, ...rows.map((r) => r.hours));

  return (
    <div className="flex h-full flex-col">
      <header className="safe-top px-4 pb-2 pt-3">
        <h1 className="text-[22px] font-bold">Estadísticas</h1>
      </header>

      <div className="px-4">
        <div
          className="flex rounded-[10px] p-0.5 text-[13px] font-semibold"
          style={{ background: "var(--surface-sunken)" }}
        >
          {(["week", "month"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="flex-1 rounded-[8px] py-1.5 transition"
              style={{
                background: range === r ? "var(--surface)" : "transparent",
                boxShadow: range === r ? "var(--shadow-resting)" : "none",
              }}
            >
              {r === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {rows.length === 0 ? (
          <p className="mt-10 text-center text-[14px]" style={{ color: "var(--text-secondary)" }}>
            Sin datos todavía.
          </p>
        ) : (
          <>
            <div
              className="flex items-end gap-3 rounded-[var(--r-card)] p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--hairline)", height: 200 }}
            >
              {rows.map((r) => {
                const c = paletteVars(STAT_CATEGORY_PALETTE[r.cat]);
                return (
                  <div key={r.cat} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      {r.hours.toFixed(1)}
                    </span>
                    <div
                      className="w-full rounded-[6px]"
                      style={{
                        height: `${(r.hours / max) * 130}px`,
                        background: c.fill,
                        border: `1px solid ${c.border}`,
                      }}
                    />
                    <span className="no-truncate text-center text-[10px]" style={{ color: "var(--text-secondary)" }}>
                      {STAT_CATEGORY_NAME[r.cat]}
                    </span>
                  </div>
                );
              })}
            </div>

            <div
              className="mt-4 overflow-hidden rounded-[var(--r-card)]"
              style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}
            >
              {rows.map((r, i) => {
                const c = paletteVars(STAT_CATEGORY_PALETTE[r.cat]);
                return (
                  <div
                    key={r.cat}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderTop: i > 0 ? "1px solid var(--hairline)" : undefined }}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ background: c.accent }} />
                    <span className="no-truncate flex-1 text-[15px]">{STAT_CATEGORY_NAME[r.cat]}</span>
                    <span className="text-[15px] font-semibold tabular-nums">
                      {r.hours.toFixed(1)} h
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
