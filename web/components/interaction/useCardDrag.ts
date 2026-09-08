"use client";

/**
 * The signature gesture (§12): **mantener pulsado → arrastrar → soltar**, like
 * rearranging Home-screen icons.
 *
 * - A press that stays put for `HOLD_MS` lifts the card (haptic, scale, shadow).
 * - Moving more than `SLOP` px before the timer fires is a scroll — abort.
 * - While lifted the card follows the finger (rendered by `<DragOverlay/>`).
 * - Dropping over the bottom zone removes it (§14); otherwise it re-times to the
 *   15-min grid, and a horizontal drag past half a column changes the day.
 * - University classes lift but never re-time (§14).
 */

import { useCallback, useEffect, useRef } from "react";
import { usePlannerInteraction } from "./PlannerInteractionContext";
import { haptic } from "@/lib/haptics";
import { TimeGrid, startOfDay, endOfDayMidnight } from "@/lib/time";
import { dayShift, shiftDay, clampStart } from "@/lib/dragmath";
import { itemDuration, type ScheduledItem } from "@/lib/scheduled-item";

const HOLD_MS = 480;
const SLOP = 6;
const DELETE_ZONE_PX = 104;

export interface CardDragConfig {
  pxPerMin: number;
  /** epoch ms at the top of this timeline */
  timelineStart: number;
  /** epoch ms at the bottom of this timeline */
  timelineEnd: number;
  /** epoch ms, the calendar day this column represents */
  day: number;
  /** column width + gap, for cross-day drags (0 in single-day views) */
  columnPitch: number;
}

export function useCardDrag(
  item: ScheduledItem,
  config: CardDragConfig,
  titleVariant: "short" | "full" = "short",
) {
  const interaction = usePlannerInteraction();
  const state = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    lifted: false,
    timer: null as ReturnType<typeof setTimeout> | null,
    tx: 0,
    ty: 0,
    overDelete: false,
    el: null as HTMLElement | null,
    suppressClickUntil: 0,
  });

  const clearTimer = () => {
    if (state.current.timer) {
      clearTimeout(state.current.timer);
      state.current.timer = null;
    }
  };

  const lift = useCallback(
    () => {
      const s = state.current;
      const el = s.el;
      if (!el) return;
      s.lifted = true;
      s.suppressClickUntil = Date.now() + 700;
      const rect = el.getBoundingClientRect();
      try {
        el.setPointerCapture(s.pointerId);
      } catch {
        /* no-op */
      }
      interaction.beginDrag({
        item,
        titleVariant,
        x: s.lastX,
        y: s.lastY,
        grabX: s.lastX - rect.left,
        grabY: s.lastY - rect.top,
        width: rect.width,
        height: rect.height,
      });
    },
    [interaction, item, titleVariant],
  );

  const finish = useCallback(() => {
    const s = state.current;
    if (!s.lifted) return;
    s.lifted = false;

    if (s.overDelete) {
      interaction.commitRemove(item);
      return;
    }
    if (item.isImmovable || item.isPinned) {
      interaction.endDrag();
      if (item.isImmovable) haptic("select");
      return;
    }

    const days = config.columnPitch > 0 ? dayShift(s.tx, config.columnPitch) : 0;
    const minutesDelta = s.ty / config.pxPerMin;
    let target = item.start + minutesDelta * 60_000;
    target = shiftDay(target, days);
    target = TimeGrid.snap(new Date(target)).getTime();

    const dur = Math.max(itemDuration(item), TimeGrid.minimumActivityDuration);
    const lower = startOfDay(new Date(target)).getTime();
    const upper = endOfDayMidnight(new Date(target)).getTime();
    target = clampStart(target, dur, lower, upper);

    interaction.commitMove(item, target, new Date(target));
  }, [interaction, item, config.columnPitch, config.pxPerMin]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const s = state.current;
      s.pointerId = e.pointerId;
      s.startX = e.clientX;
      s.startY = e.clientY;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.tx = 0;
      s.ty = 0;
      s.overDelete = false;
      s.lifted = false;
      s.el = e.currentTarget as HTMLElement;
      clearTimer();
      if (interaction.organizing) {
        lift();
      } else {
        s.timer = setTimeout(lift, HOLD_MS);
      }
    },
    [interaction.organizing, lift],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = state.current;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      if (!s.lifted) {
        if (Math.abs(dx) > SLOP || Math.abs(dy) > SLOP) clearTimer();
        return;
      }
      e.preventDefault();
      s.tx = dx;
      s.ty = dy;
      s.overDelete = e.clientY > window.innerHeight - DELETE_ZONE_PX;
      interaction.updateDrag({ x: e.clientX, y: e.clientY, overDelete: s.overDelete });
    },
    [interaction],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      clearTimer();
      const s = state.current;
      try {
        s.el?.releasePointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
      finish();
    },
    [finish],
  );

  const onPointerCancel = useCallback(() => {
    clearTimer();
    if (state.current.lifted) {
      state.current.lifted = false;
      interaction.endDrag();
    }
  }, [interaction]);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const consumeClick = useCallback((e: React.MouseEvent): boolean => {
    if (Date.now() >= state.current.suppressClickUntil) return false;
    e.preventDefault();
    e.stopPropagation();
    return true;
  }, []);

  useEffect(
    () => () => {
      if (state.current.timer) clearTimeout(state.current.timer);
    },
    [],
  );

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onContextMenu,
    },
    consumeClick,
    isDragging: interaction.draggingId === item.id,
  };
}
