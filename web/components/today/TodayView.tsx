"use client";

/**
 * The Hoy screen (§33, §34): a single vertical timeline with the "AHORA" line
 * and a "A continuación" card for the next activity.
 */

import { useMemo } from "react";
import { usePlannerStore } from "@/store/planner-store";
import { timelineFor } from "@/lib/planner";
import { timelineItems, type ScheduledItem } from "@/lib/scheduled-item";
import type { TimeSlot } from "@/lib/timeslot";
import { DayTimeline } from "@/components/timeline/DayTimeline";
import { birthdayGreeting } from "@/lib/birthday";
import { timeOfDayGreeting } from "@/lib/greeting";
import { formatRelativeStart, formatRange, formatWeekdayLong } from "@/lib/format";
import { paletteVars } from "@/lib/palette";
import { iconFor } from "@/lib/icons";

export function TodayView({
  now,
  onSelectItem,
  onSelectFree,
}: {
  now: number;
  onSelectItem: (item: ScheduledItem) => void;
  onSelectFree: (slot: TimeSlot, day: Date) => void;
}) {
  const state = usePlannerStore();
  const today = useMemo(() => new Date(now), [now]);
  const timeline = useMemo(() => timelineFor(state, today), [state, today]);

  const next = useMemo(
    () => timelineItems(timeline).find((i) => i.start > now) ?? null,
    [timeline, now],
  );
  const greeting = timeOfDayGreeting(today, state.preferences.ownerName);
  const birthday = birthdayGreeting(today, state.preferences);

  return (
    <div className="flex h-full flex-col">
      <header className="safe-top px-4 pb-1 pt-3">
        <h1 className="text-[22px] font-bold no-truncate">Hoy</h1>
        <p className="text-[13px] capitalize" style={{ color: "var(--text-secondary)" }}>
          {formatWeekdayLong(today)} {today.getDate()}
        </p>
        <p className="mt-1 text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
          {greeting}
        </p>
        {birthday ? (
          <p className="text-[13px] font-medium" style={{ color: "var(--accent)" }}>
            {birthday}
          </p>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28">
        {next ? (
          <NextUpCard item={next} now={now} onSelect={() => onSelectItem(next)} />
        ) : null}
        <div
          className="mt-3 rounded-[var(--r-card)] p-2"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-resting)", border: "1px solid var(--hairline)" }}
        >
          <DayTimeline
            timeline={timeline}
            now={now}
            showHourGutter
            titleVariant="full"
            onSelectItem={onSelectItem}
            onSelectFree={(slot) => onSelectFree(slot, today)}
          />
        </div>
      </div>
    </div>
  );
}

function NextUpCard({
  item,
  now,
  onSelect,
}: {
  item: ScheduledItem;
  now: number;
  onSelect: () => void;
}) {
  const c = paletteVars(item.palette);
  const Icon = iconFor(item.symbolName);
  return (
    <button
      type="button"
      onClick={onSelect}
      className="interactive-card mt-2 flex min-h-11 w-full items-center gap-3 rounded-[var(--r-card)] px-4 py-3 text-left"
      style={{ background: c.fill, border: `1px solid ${c.border}`, color: c.accent }}
    >
      <Icon size={20} strokeWidth={2.2} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
          A continuación · {formatRelativeStart(now, item.start)}
        </p>
        <p className="text-[15px] font-semibold no-truncate">{item.fullTitle ?? item.title}</p>
        <p className="text-[12px] tabular-nums opacity-75">{formatRange(item.start, item.end)}</p>
      </div>
    </button>
  );
}
