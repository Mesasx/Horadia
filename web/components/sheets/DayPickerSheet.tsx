"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { weekDays, startOfWeek, addDays, isSameDay } from "@/lib/time";
import { formatWeekdayShort, formatDayMonth } from "@/lib/format";

export function DayPickerSheet({
  open,
  anchor,
  title = "Elegir día",
  onPick,
  onClose,
}: {
  open: boolean;
  anchor: Date;
  title?: string;
  onPick: (day: Date) => void;
  onClose: () => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const base = startOfWeek(anchor);
  const days = weekDays(addDays(base, weekOffset * 7));

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="flex items-center justify-between px-1 pb-2 text-[14px] font-semibold">
        <button onClick={() => setWeekOffset((w) => w - 1)} className="px-2 py-1">‹</button>
        <span style={{ color: "var(--text-secondary)" }}>
          {formatDayMonth(days[0])} – {formatDayMonth(days[6])}
        </span>
        <button onClick={() => setWeekOffset((w) => w + 1)} className="px-2 py-1">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => onPick(day)}
            className="flex flex-col items-center gap-1 rounded-[12px] py-2"
            style={{
              background: isSameDay(day, anchor) ? "var(--accent-soft)" : "var(--surface-sunken)",
            }}
          >
            <span className="text-[10px] uppercase" style={{ color: "var(--text-secondary)" }}>
              {formatWeekdayShort(day)}
            </span>
            <span className="text-[15px] font-semibold tabular-nums">{day.getDate()}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
