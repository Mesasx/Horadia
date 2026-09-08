"use client";

/**
 * The Semana screen — Horadia's core surface (§4, §5). ~2 comfortable day
 * columns with horizontal scroll; weekend columns a little narrower. Only the
 * ‹ › buttons move between weeks; "Hoy" returns to the current week. Words
 * are never truncated — columns widen instead.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { usePlannerStore } from "@/store/planner-store";
import { weekTimelines } from "@/lib/planner";
import { weekDays, startOfWeek, addWeeks, isSameDay, dayKey } from "@/lib/time";
import { birthdayGreeting } from "@/lib/birthday";
import { formatDayMonth } from "@/lib/format";
import type { ScheduledItem } from "@/lib/scheduled-item";
import type { TimeSlot } from "@/lib/timeslot";
import { PLANNER_SCALE_LABELS, type PlannerScale } from "@/lib/planner-scale";
import { DayColumn } from "./DayColumn";
import { ChevronLeft, ChevronRight } from "lucide-react";

function columnWidths(available: number) {
  const spacing = 12;
  const usable = Math.max(available - spacing * 2, 300);
  const base = Math.round(usable / 2.15);
  const weekday = Math.min(Math.max(base, 176), 300);
  const weekend = Math.max(Math.round(weekday * 0.82), 150);
  return { spacing, weekday, weekend };
}

export function WeekView({
  now,
  scale = "week",
  onSelectItem,
  onSelectFree,
}: {
  now: number;
  scale?: PlannerScale;
  onSelectItem: (item: ScheduledItem) => void;
  onSelectFree: (slot: TimeSlot, day: Date) => void;
}) {
  const state = usePlannerStore();
  const today = useMemo(() => startOfWeek(new Date(now)), [now]);
  const [weekStart, setWeekStart] = useState<Date>(today);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(390);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const { spacing, weekday, weekend } = columnWidths(width);
  const columnPitch = weekday + spacing;

  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const timelines = useMemo(() => weekTimelines(state, weekStart), [state, weekStart]);

  const isCurrentWeek = isSameDay(weekStart, today);
  const greeting = birthdayGreeting(new Date(now), state.preferences);

  const weekTitle = `${formatDayMonth(days[0])} – ${formatDayMonth(days[6])}`;

  return (
    <div className="flex h-full flex-col">
      <header className="safe-top px-4 pb-1 pt-3">
        <p
          className="mb-0.5 px-1 text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-tertiary)" }}
          aria-label={`Escala actual: ${PLANNER_SCALE_LABELS[scale]}`}
        >
          {PLANNER_SCALE_LABELS[scale]}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              aria-label="Semana anterior"
              onClick={() => setWeekStart((w) => addWeeks(w, -1))}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full active:opacity-50"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-[17px] font-semibold no-truncate tabular-nums">
              {weekTitle}
            </h1>
            <button
              aria-label="Semana siguiente"
              onClick={() => setWeekStart((w) => addWeeks(w, 1))}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full active:opacity-50"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            onClick={() => setWeekStart(today)}
            disabled={isCurrentWeek}
            className="min-h-11 rounded-full px-3 py-1 text-[14px] font-semibold disabled:opacity-30"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            Hoy
          </button>
        </div>
        {greeting ? (
          <p
            className="mt-1.5 text-[13px] font-medium no-truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            {greeting}
          </p>
        ) : null}
      </header>

      <div
        ref={containerRef}
        className="min-h-0 flex-1"
      >
        <div
          className="week-scroller flex h-full snap-x snap-mandatory overflow-x-auto px-3 py-2"
          style={{ gap: spacing }}
        >
          {days.map((date, i) => (
            <div
              key={dayKey(date)}
              className="h-full shrink-0 snap-start"
              style={{
                width:
                  date.getDay() === 0 || date.getDay() === 6 ? weekend : weekday,
              }}
            >
              <DayColumn
                timeline={timelines[i]}
                date={date}
                isToday={isSameDay(date, new Date(now))}
                now={isSameDay(date, new Date(now)) ? now : undefined}
                columnPitch={columnPitch}
                onSelectItem={onSelectItem}
                onSelectFree={onSelectFree}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
