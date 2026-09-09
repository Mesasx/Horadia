"use client";

/**
 * The Semana screen — Horadia's core surface (§4, §5). ~2 comfortable day
 * columns with continuous horizontal scroll; weekend columns a little
 * narrower. Gesture navigation preserves the visible day across week
 * boundaries, while the ‹ › buttons and "Hoy" land on Monday.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePlannerStore } from "@/store/planner-store";
import { weekTimelines } from "@/lib/planner";
import { weekDays, startOfWeek, addWeeks, isSameDay, dayKey } from "@/lib/time";
import { birthdayGreeting } from "@/lib/birthday";
import { timeOfDayGreeting } from "@/lib/greeting";
import { formatDayMonth } from "@/lib/format";
import { scrollAfterWeekAdvance } from "@/lib/week-navigation";
import type { ScheduledItem } from "@/lib/scheduled-item";
import type { TimeSlot } from "@/lib/timeslot";
import { PLANNER_SCALE_LABELS, type PlannerScale } from "@/lib/planner-scale";
import { DayColumn } from "./DayColumn";
import { ReminderSection } from "@/components/reminders/ReminderSection";
import { NewReminderSheet } from "@/components/reminders/NewReminderSheet";
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const currentMondayRef = useRef<HTMLDivElement>(null);
  const nextMondayRef = useRef<HTMLDivElement>(null);
  const scrollSettleTimerRef = useRef<number | null>(null);
  const pendingScrollLeftRef = useRef<number | null>(null);
  const [width, setWidth] = useState(390);
  const [creatingReminder, setCreatingReminder] = useState(false);

  useEffect(() => {
    const linkedId = new URLSearchParams(window.location.search).get("reminder");
    if (!linkedId) return;
    const linked = state.reminders.find((reminder) => reminder.id === linkedId);
    if (!linked?.date) return;
    const linkedDay = new Date(`${linked.date}T00:00:00`);
    if (!Number.isNaN(linkedDay.getTime())) {
      setWeekStart(startOfWeek(linkedDay));
    }
  }, [state.reminders]);

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
  const nextWeekStart = useMemo(() => addWeeks(weekStart, 1), [weekStart]);
  const renderedDays = useMemo(
    () => [...days, ...weekDays(nextWeekStart)],
    [days, nextWeekStart],
  );
  const renderedTimelines = useMemo(
    () => [...timelines, ...weekTimelines(state, nextWeekStart)],
    [state, timelines, nextWeekStart],
  );

  const navigateToWeek = useCallback((nextWeek: Date) => {
    if (scrollSettleTimerRef.current !== null) {
      window.clearTimeout(scrollSettleTimerRef.current);
      scrollSettleTimerRef.current = null;
    }
    pendingScrollLeftRef.current = 0;
    setWeekStart(startOfWeek(nextWeek));
  }, []);

  const moveWeek = useCallback((offset: number) => {
    if (scrollSettleTimerRef.current !== null) {
      window.clearTimeout(scrollSettleTimerRef.current);
      scrollSettleTimerRef.current = null;
    }
    pendingScrollLeftRef.current = 0;
    setWeekStart((current) => addWeeks(current, offset));
  }, []);

  useLayoutEffect(() => {
    const nextScrollLeft = pendingScrollLeftRef.current;
    if (nextScrollLeft === null) return;
    scrollerRef.current?.scrollTo({ left: nextScrollLeft, behavior: "auto" });
    pendingScrollLeftRef.current = null;
  }, [weekStart]);

  const finishHorizontalScroll = useCallback(() => {
    scrollSettleTimerRef.current = null;
    const scroller = scrollerRef.current;
    const currentMonday = currentMondayRef.current;
    const nextMonday = nextMondayRef.current;
    if (!scroller || !currentMonday || !nextMonday) return;

    const nextMondayOffset = nextMonday.offsetLeft - currentMonday.offsetLeft;
    const recycledScrollLeft = scrollAfterWeekAdvance(
      scroller.scrollLeft,
      nextMondayOffset,
    );
    if (recycledScrollLeft === null) return;

    pendingScrollLeftRef.current = recycledScrollLeft;
    setWeekStart((current) => addWeeks(current, 1));
  }, []);

  const handleHorizontalScroll = useCallback(() => {
    if (scrollSettleTimerRef.current !== null) {
      window.clearTimeout(scrollSettleTimerRef.current);
    }
    scrollSettleTimerRef.current = window.setTimeout(finishHorizontalScroll, 120);
  }, [finishHorizontalScroll]);

  useEffect(
    () => () => {
      if (scrollSettleTimerRef.current !== null) {
        window.clearTimeout(scrollSettleTimerRef.current);
      }
    },
    [],
  );

  const isCurrentWeek = isSameDay(weekStart, today);
  const currentDate = useMemo(() => new Date(now), [now]);
  const greeting = timeOfDayGreeting(currentDate, state.preferences.ownerName);
  const birthday = birthdayGreeting(currentDate, state.preferences);

  const weekTitle = `${formatDayMonth(days[0])} – ${formatDayMonth(days[6])}`;

  return (
    <div className="flex flex-col">
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
              onClick={() => moveWeek(-1)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full active:opacity-50"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-[17px] font-semibold no-truncate tabular-nums">
              {weekTitle}
            </h1>
            <button
              aria-label="Semana siguiente"
              onClick={() => moveWeek(1)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full active:opacity-50"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            onClick={() => navigateToWeek(today)}
            disabled={isCurrentWeek}
            className="min-h-11 rounded-full px-3 py-1 text-[14px] font-semibold disabled:opacity-30"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            Hoy
          </button>
        </div>
        <p
          className="mt-1.5 text-[13px] font-medium no-truncate"
          style={{ color: "var(--text-secondary)" }}
        >
          {greeting}
        </p>
        {birthday ? (
          <p className="text-[13px] font-medium" style={{ color: "var(--accent)" }}>
            {birthday}
          </p>
        ) : null}
      </header>

      <div
        ref={containerRef}
        className="w-full"
      >
        <div
          ref={scrollerRef}
          onScroll={handleHorizontalScroll}
          className="week-scroller flex items-stretch snap-x snap-proximity overflow-x-auto px-3 py-2"
          style={{ gap: spacing }}
        >
          {renderedDays.map((date, i) => (
            <div
              key={dayKey(date)}
              ref={i === 0 ? currentMondayRef : i === 7 ? nextMondayRef : undefined}
              className="shrink-0 snap-start"
              style={{
                width:
                  date.getDay() === 0 || date.getDay() === 6 ? weekend : weekday,
              }}
            >
              <DayColumn
                timeline={renderedTimelines[i]}
                date={date}
                isToday={isSameDay(date, currentDate)}
                now={isSameDay(date, currentDate) ? now : undefined}
                columnPitch={columnPitch}
                onSelectItem={onSelectItem}
                onSelectFree={onSelectFree}
              />
            </div>
          ))}
        </div>
      </div>
      <ReminderSection
        weekStart={weekStart}
        onAdd={() => setCreatingReminder(true)}
      />
      {creatingReminder ? (
        <NewReminderSheet open onClose={() => setCreatingReminder(false)} />
      ) : null}
    </div>
  );
}
