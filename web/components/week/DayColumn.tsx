"use client";

import type { DayTimeline as DayTimelineModel } from "@/lib/scheduled-item";
import type { ScheduledItem } from "@/lib/scheduled-item";
import type { TimeSlot } from "@/lib/timeslot";
import { DayTimeline } from "@/components/timeline/DayTimeline";
import { formatWeekdayShort } from "@/lib/format";

export function DayColumn({
  timeline,
  date,
  isToday,
  now,
  columnPitch,
  onSelectItem,
  onSelectFree,
}: {
  timeline: DayTimelineModel;
  date: Date;
  isToday: boolean;
  now?: number;
  columnPitch: number;
  onSelectItem: (item: ScheduledItem) => void;
  onSelectFree: (slot: TimeSlot, day: Date) => void;
}) {
  return (
    <div
      className="flex min-h-full flex-col rounded-[var(--r-card)]"
      style={{
        background: "var(--surface)",
        border: `1px solid ${isToday ? "var(--accent)" : "var(--hairline)"}`,
        boxShadow: "var(--shadow-resting)",
        overflow: "clip",
      }}
    >
      <div
        className="sticky top-0 z-30 flex items-baseline justify-between px-3 py-2"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--hairline)",
        }}
      >
        <span
          className="text-[12px] font-semibold uppercase tracking-wide"
          style={{ color: isToday ? "var(--accent)" : "var(--text-secondary)" }}
        >
          {formatWeekdayShort(date)}
        </span>
        <span
          className="text-[15px] font-semibold tabular-nums"
          style={{ color: isToday ? "var(--accent)" : "var(--text)" }}
        >
          {date.getDate()}
        </span>
      </div>

      {timeline.dayNote ? (
        <div
          className="px-3 py-1.5 text-[11px] font-medium"
          style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--hairline)" }}
        >
          {timeline.dayNote}
        </div>
      ) : null}

      <div className="px-2 py-2">
        <DayTimeline
          timeline={timeline}
          now={now}
          columnPitch={columnPitch}
          onSelectItem={onSelectItem}
          onSelectFree={(slot) => onSelectFree(slot, date)}
        />
      </div>
    </div>
  );
}
