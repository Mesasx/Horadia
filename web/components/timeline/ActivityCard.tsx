"use client";

/**
 * Presentation-only card for one scheduled block (§3, §25). Pastel fill, hairline
 * border, extremely subtle shadow. Exams get a slightly stronger border and a
 * distinct icon — elegant, never alarming red (§25).
 *
 * Words are never truncated (user rule): the title wraps rather than clipping —
 * "Deporte" must never become "Depor-te".
 */

import { paletteVars } from "@/lib/palette";
import { formatRange } from "@/lib/format";
import { iconFor } from "@/lib/icons";
import { accessibilityCategory, type ScheduledItem } from "@/lib/scheduled-item";
import { Check, Lock } from "lucide-react";

export function ActivityCard({
  item,
  lifted = false,
  compact = false,
  dragHint,
}: {
  item: ScheduledItem;
  lifted?: boolean;
  compact?: boolean;
  /** Red overlay label shown while held over the delete zone. */
  dragHint?: string | null;
}) {
  const c = paletteVars(item.palette);
  const Icon = iconFor(item.symbolName);
  const isExam = item.kind.type === "university" && item.kind.kind === "exam";
  const showRange = !compact && item.end - item.start >= 28 * 60_000;

  return (
    <div
      className="relative flex h-full w-full flex-col gap-0.5 overflow-hidden px-2.5 py-1.5 text-left"
      style={{
        background: c.fill,
        borderRadius: "var(--r-block)",
        border: `${isExam ? 1.5 : 1}px solid ${c.border}`,
        boxShadow: lifted ? "var(--shadow-lifted)" : "var(--shadow-resting)",
        transform: lifted ? "scale(1.03)" : "scale(1)",
        transition: "transform .18s cubic-bezier(.32,.72,0,1), box-shadow .18s",
        opacity: item.isCompleted ? 0.62 : 1,
        color: c.accent,
      }}
      aria-label={`${accessibilityCategory(item.kind)}: ${item.fullTitle ?? item.title}, ${formatRange(item.start, item.end)}`}
    >
      {item.badge ? (
        <span className="no-truncate text-[10px] font-semibold uppercase tracking-wide opacity-90">
          {item.badge}
        </span>
      ) : null}

      <div className="flex items-start gap-1.5">
        <Icon size={13} strokeWidth={2.4} className="mt-[3px] shrink-0" aria-hidden />
        <span
          className="no-truncate text-[13px] font-semibold leading-tight"
          style={{ wordBreak: "keep-all" }}
        >
          {item.title}
        </span>
        {item.isPinned ? (
          <Lock
            size={11}
            strokeWidth={2.6}
            className="ml-auto mt-[3px] shrink-0 opacity-70"
            aria-label="Fijada"
          />
        ) : null}
        {item.isCompleted ? (
          <Check
            size={12}
            strokeWidth={3}
            className="ml-auto mt-[2px] shrink-0"
            aria-label="Realizada"
          />
        ) : null}
      </div>

      {showRange ? (
        <span className="text-[11px] font-medium tabular-nums opacity-75">
          {formatRange(item.start, item.end)}
        </span>
      ) : null}

      {dragHint ? (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-[var(--r-block)] text-center text-[12px] font-semibold text-white"
          style={{ background: "var(--now)" }}
        >
          {dragHint}
        </div>
      ) : null}
    </div>
  );
}
