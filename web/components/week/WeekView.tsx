"use client";

/**
 * The Semana screen — Horadia's core surface (§4, §5). ~2 comfortable day
 * columns with horizontal scroll; weekend columns a little narrower; swipe or
 * the ‹ › buttons move between weeks; "Hoy" returns to the current week. Words
 * are never truncated — columns widen instead.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { usePlannerStore } from "@/store/planner-store";
import { weekTimelines } from "@/lib/planner";
import { weekDays, startOfWeek, addDays, isSameDay } from "@/lib/time";
import { birthdayGreeting } from "@/lib/birthday";
import { formatDayMonth } from "@/lib/format";
import type { ScheduledItem } from "@/lib/scheduled-item";
import type { TimeSlot } from "@/lib/timeslot";
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
  onSelectItem,
  onSelectFree,
}: {
  now: number;
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

  // swipe between weeks
  const touch = useRef<{ x: number; y: number } | null>(null);

  return (
    <div className="flex h-full flex-col">
      <header className="safe-top px-4 pb-1 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              aria-label="Semana anterior"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              className="rounded-full p-1.5 active:opacity-50"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-[17px] font-semibold no-truncate tabular-nums">
              {weekTitle}
            </h1>
            <button
              aria-label="Semana siguiente"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              className="rounded-full p-1.5 active:opacity-50"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            onClick={() => setWeekStart(today)}
            disabled={isCurrentWeek}
            className="rounded-full px-3 py-1 text-[14px] font-semibold disabled:opacity-30"
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
        onTouchStart={(e) => {
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const t = touch.current;
          if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x;
          const dy = e.changedTouches[0].clientY - t.y;
          if (Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.6) {
            setWeekStart((w) => addDays(w, dx < 0 ? 7 : -7));
          }
          touch.current = null;
        }}
      >
        <div
          className="flex h-full snap-x snap-mandatory overflow-x-auto px-3 py-2"
          style={{ gap: spacing }}
        >
          {days.map((date, i) => (
            <div
              key={date.toISOString()}
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
