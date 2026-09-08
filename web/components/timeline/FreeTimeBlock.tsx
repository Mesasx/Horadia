"use client";

/**
 * A "Libre" gap (§7). Transparent fill, dashed border, rounded corners, much
 * lighter than an activity. Very short gaps (< ~28 min) render as a thin dashed
 * strip with no text so the timeline stays calm. Tapping opens quick-create.
 */

import type { TimeSlot } from "@/lib/timeslot";
import { formatRange } from "@/lib/format";

export function FreeTimeBlock({
  slot,
  onClick,
  isDropTarget = false,
}: {
  slot: TimeSlot;
  onClick?: () => void;
  isDropTarget?: boolean;
}) {
  const minutes = (slot.end - slot.start) / 60_000;
  const compact = minutes < 28;
  const showRange = !compact && minutes >= 45;

  return (
    <button
      onClick={onClick}
      aria-label={`Libre, ${formatRange(slot.start, slot.end)}. Tocar para crear una actividad.`}
      className="flex h-full w-full flex-col items-start justify-center gap-0.5 px-2.5 text-left transition active:opacity-60"
      style={{
        borderRadius: "var(--r-block)",
        border: `1px dashed ${isDropTarget ? "var(--accent)" : "var(--separator)"}`,
        background: isDropTarget ? "var(--accent-soft)" : "transparent",
      }}
    >
      {!compact ? (
        <span
          className="text-[12px] font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Libre
        </span>
      ) : null}
      {showRange ? (
        <span
          className="text-[10px] tabular-nums"
          style={{ color: "var(--text-tertiary)" }}
        >
          {formatRange(slot.start, slot.end)}
        </span>
      ) : null}
    </button>
  );
}
