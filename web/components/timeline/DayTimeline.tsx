"use client";

/**
 * A single day's vertical timeline (§5, §33). Blocks are absolutely positioned
 * by wall-clock time; a red "AHORA" line marks the current moment. Cards carry
 * the long-press-drag gesture; in organisation mode they jiggle and show a "−"
 * badge (§13).
 */

import { useMemo, useRef } from "react";
import type { DayTimeline as DayTimelineModel } from "@/lib/scheduled-item";
import type { ScheduledItem } from "@/lib/scheduled-item";
import type { TimeSlot } from "@/lib/timeslot";
import { ActivityCard } from "./ActivityCard";
import { FreeTimeBlock } from "./FreeTimeBlock";
import { useCardDrag, type CardDragConfig } from "@/components/interaction/useCardDrag";
import { usePlannerInteraction } from "@/components/interaction/PlannerInteractionContext";
import { isPersonal } from "@/lib/scheduled-item";
import { Minus } from "lucide-react";

export const DEFAULT_PX_PER_MIN = 0.95;

function hourMarks(startMs: number, endMs: number): number[] {
  const marks: number[] = [];
  const first = new Date(startMs);
  first.setMinutes(0, 0, 0);
  if (first.getTime() < startMs) first.setHours(first.getHours() + 1);
  for (let t = first.getTime(); t <= endMs; t += 3_600_000) marks.push(t);
  return marks;
}

export function DayTimeline({
  timeline,
  now,
  pxPerMin = DEFAULT_PX_PER_MIN,
  showHourGutter = false,
  columnPitch = 0,
  onSelectItem,
  onSelectFree,
}: {
  timeline: DayTimelineModel;
  now?: number;
  pxPerMin?: number;
  showHourGutter?: boolean;
  columnPitch?: number;
  onSelectItem: (item: ScheduledItem) => void;
  onSelectFree: (slot: TimeSlot) => void;
}) {
  const totalHeight = ((timeline.end - timeline.start) / 60_000) * pxPerMin;
  const marks = useMemo(
    () => hourMarks(timeline.start, timeline.end),
    [timeline.start, timeline.end],
  );
  const gutter = showHourGutter ? 42 : 0;

  const dragConfig: CardDragConfig = {
    pxPerMin,
    timelineStart: timeline.start,
    timelineEnd: timeline.end,
    day: timeline.date,
    columnPitch,
  };

  const nowVisible =
    now !== undefined && now >= timeline.start && now <= timeline.end;
  const nowTop = nowVisible
    ? ((now! - timeline.start) / 60_000) * pxPerMin
    : 0;

  const interaction = usePlannerInteraction();
  const orgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearOrgTimer = () => {
    if (orgTimer.current) clearTimeout(orgTimer.current);
    orgTimer.current = null;
  };

  return (
    <div
      className="relative w-full"
      style={{ height: Math.max(totalHeight, 120), paddingLeft: gutter }}
      onPointerDown={(e) => {
        if (interaction.organizing || interaction.drag) return;
        if (e.target !== e.currentTarget) return; // only the empty backdrop
        clearOrgTimer();
        orgTimer.current = setTimeout(() => interaction.enterOrganizing(), 450);
      }}
      onPointerUp={clearOrgTimer}
      onPointerMove={clearOrgTimer}
      onPointerCancel={clearOrgTimer}
    >
      {/* hour lines + labels */}
      {marks.map((t) => {
        const top = ((t - timeline.start) / 60_000) * pxPerMin;
        return (
          <div key={t} className="pointer-events-none absolute inset-x-0" style={{ top }}>
            <div
              className="absolute right-0"
              style={{ left: gutter, borderTop: "1px solid var(--hairline)" }}
            />
            {showHourGutter ? (
              <span
                className="absolute -translate-y-1/2 text-[10px] tabular-nums"
                style={{ left: 0, color: "var(--text-tertiary)" }}
              >
                {String(new Date(t).getHours()).padStart(2, "0")}:00
              </span>
            ) : null}
          </div>
        );
      })}

      {/* blocks */}
      {timeline.blocks.map((block) => {
        const start = block.kind === "item" ? block.item.start : block.slot.start;
        const end = block.kind === "item" ? block.item.end : block.slot.end;
        const top = ((start - timeline.start) / 60_000) * pxPerMin;
        const height = Math.max(((end - start) / 60_000) * pxPerMin - 3, 18);

        if (block.kind === "free") {
          return (
            <div
              key={block.id}
              className="absolute"
              style={{ top, height, left: gutter, right: 0 }}
            >
              <FreeTimeBlock slot={block.slot} onClick={() => onSelectFree(block.slot)} />
            </div>
          );
        }

        return (
          <DraggableCard
            key={block.id}
            item={block.item}
            top={top}
            height={height}
            gutter={gutter}
            config={dragConfig}
            onSelect={() => onSelectItem(block.item)}
          />
        );
      })}

      {/* AHORA line */}
      {nowVisible ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-20"
          style={{ top: nowTop, left: gutter }}
        >
          <div className="relative">
            <span
              className="absolute -left-1 -top-[3px] h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--now)" }}
            />
            <div style={{ borderTop: "2px solid var(--now)" }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DraggableCard({
  item,
  top,
  height,
  gutter,
  config,
  onSelect,
}: {
  item: ScheduledItem;
  top: number;
  height: number;
  gutter: number;
  config: CardDragConfig;
  onSelect: () => void;
}) {
  const interaction = usePlannerInteraction();
  const { handlers, isDragging } = useCardDrag(item, config);
  const organizing = interaction.organizing;
  const canDelete = organizing && isPersonal(item);

  return (
    <div
      className="absolute"
      style={{
        top,
        height,
        left: gutter,
        right: 0,
        zIndex: isDragging ? 40 : 1,
        opacity: isDragging ? 0.28 : 1,
        touchAction: "pan-y",
      }}
    >
      <div
        {...handlers}
        onClick={() => {
          if (!interaction.drag) onSelect();
        }}
        className={organizing && isPersonal(item) ? "jiggle" : undefined}
        style={{ height: "100%", cursor: "pointer" }}
      >
        <ActivityCard item={item} />
      </div>

      {canDelete ? (
        <button
          aria-label={`Quitar ${item.title}`}
          onClick={(e) => {
            e.stopPropagation();
            interaction.commitRemove(item);
          }}
          className="absolute -left-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full text-white shadow"
          style={{ background: "var(--now)" }}
        >
          <Minus size={13} strokeWidth={3.5} />
        </button>
      ) : null}
    </div>
  );
}
