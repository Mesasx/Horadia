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
const AUTO_SCROLL_EDGE_PX = 84;
const AUTO_SCROLL_STEP_PX = 10;

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
  const {
    organizing,
    beginDrag,
    updateDrag,
    endDrag,
    commitMove,
    commitRemove,
    draggingId,
  } = interaction;
  const state = useRef({
    pointerId: -1,
    touchId: -1,
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
    scrollEl: null as HTMLElement | null,
    usePageScroll: false,
    scrollDeltaY: 0,
    autoScrollSpeed: 0,
    autoScrollFrame: null as number | null,
  });

  const elementRef = useRef<HTMLElement | null>(null);

  const clearTimer = useCallback(() => {
    if (state.current.timer) {
      clearTimeout(state.current.timer);
      state.current.timer = null;
    }
  }, []);

  const stopAutoScroll = useCallback(() => {
    const s = state.current;
    s.autoScrollSpeed = 0;
    if (s.autoScrollFrame !== null) {
      cancelAnimationFrame(s.autoScrollFrame);
      s.autoScrollFrame = null;
    }
  }, []);

  const runAutoScroll = useCallback(() => {
    const tick = () => {
      const s = state.current;
      if (
        !s.lifted ||
        (!s.usePageScroll && !s.scrollEl) ||
        s.autoScrollSpeed === 0
      ) {
        s.autoScrollFrame = null;
        return;
      }
      const before = s.usePageScroll ? window.scrollY : s.scrollEl!.scrollTop;
      if (s.usePageScroll) {
        window.scrollBy({ top: s.autoScrollSpeed, behavior: "auto" });
      } else {
        s.scrollEl!.scrollTop += s.autoScrollSpeed;
      }
      const after = s.usePageScroll ? window.scrollY : s.scrollEl!.scrollTop;
      s.scrollDeltaY += after - before;
      s.ty = s.lastY - s.startY + s.scrollDeltaY;
      s.autoScrollFrame = requestAnimationFrame(tick);
    };

    if (state.current.autoScrollFrame === null) {
      state.current.autoScrollFrame = requestAnimationFrame(tick);
    }
  }, []);

  const lift = useCallback(
    () => {
      const s = state.current;
      const el = s.el;
      if (!el) return;
      s.lifted = true;
      s.suppressClickUntil = Date.now() + 700;
      s.usePageScroll = Boolean(el.closest(".week-scroller"));
      s.scrollEl = s.usePageScroll
        ? null
        : el.closest<HTMLElement>("[data-drag-scroll]");
      s.scrollDeltaY = 0;
      const rect = el.getBoundingClientRect();
      if (s.pointerId >= 0) {
        try {
          el.setPointerCapture(s.pointerId);
        } catch {
          /* no-op */
        }
      }
      beginDrag({
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
    [beginDrag, item, titleVariant],
  );

  const finish = useCallback(() => {
    const s = state.current;
    if (!s.lifted) return;
    s.lifted = false;
    stopAutoScroll();

    if (s.overDelete) {
      commitRemove(item);
      return;
    }
    if (item.isImmovable || item.isPinned) {
      endDrag();
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

    commitMove(item, target, new Date(target));
  }, [
    commitMove,
    commitRemove,
    endDrag,
    item,
    config.columnPitch,
    config.pxPerMin,
    stopAutoScroll,
  ]);

  const beginGesture = useCallback(
    (clientX: number, clientY: number, element: HTMLElement, pointerId = -1) => {
      const s = state.current;
      s.pointerId = pointerId;
      s.startX = clientX;
      s.startY = clientY;
      s.lastX = clientX;
      s.lastY = clientY;
      s.tx = 0;
      s.ty = 0;
      s.scrollDeltaY = 0;
      s.overDelete = false;
      s.lifted = false;
      s.el = element;
      clearTimer();
      stopAutoScroll();
      if (organizing) {
        lift();
      } else {
        s.timer = setTimeout(lift, HOLD_MS);
      }
    },
    [clearTimer, lift, organizing, stopAutoScroll],
  );

  const moveGesture = useCallback(
    (clientX: number, clientY: number): boolean => {
      const s = state.current;
      s.lastX = clientX;
      s.lastY = clientY;
      const dx = clientX - s.startX;
      const dy = clientY - s.startY;
      if (!s.lifted) {
        if (Math.abs(dx) > SLOP || Math.abs(dy) > SLOP) clearTimer();
        return false;
      }

      s.tx = dx;
      s.ty = dy + s.scrollDeltaY;
      s.overDelete = clientY > window.innerHeight - DELETE_ZONE_PX;

      const scrollRect = s.usePageScroll
        ? { top: 0, bottom: window.innerHeight - DELETE_ZONE_PX }
        : s.scrollEl?.getBoundingClientRect();
      if (s.overDelete) {
        stopAutoScroll();
      } else if (scrollRect) {
        if (clientY < scrollRect.top + AUTO_SCROLL_EDGE_PX) {
          s.autoScrollSpeed = -AUTO_SCROLL_STEP_PX;
        } else if (clientY > scrollRect.bottom - AUTO_SCROLL_EDGE_PX) {
          s.autoScrollSpeed = AUTO_SCROLL_STEP_PX;
        } else {
          stopAutoScroll();
        }
        if (s.autoScrollSpeed !== 0) runAutoScroll();
      }

      updateDrag({ x: clientX, y: clientY, overDelete: s.overDelete });
      return true;
    },
    [clearTimer, runAutoScroll, stopAutoScroll, updateDrag],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      beginGesture(e.clientX, e.clientY, e.currentTarget as HTMLElement, e.pointerId);
    },
    [beginGesture],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (moveGesture(e.clientX, e.clientY)) e.preventDefault();
    },
    [moveGesture],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      clearTimer();
      const s = state.current;
      try {
        s.el?.releasePointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
      finish();
    },
    [clearTimer, finish],
  );

  const onPointerCancel = useCallback(() => {
    clearTimer();
    stopAutoScroll();
    if (state.current.lifted) {
      state.current.lifted = false;
      endDrag();
    }
  }, [clearTimer, endDrag, stopAutoScroll]);

  const setElementRef = useCallback((element: HTMLDivElement | null) => {
    elementRef.current = element;
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      state.current.touchId = touch.identifier;
      beginGesture(touch.clientX, touch.clientY, element);
      if (organizing) event.preventDefault();
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = Array.from(event.touches).find(
        (candidate) => candidate.identifier === state.current.touchId,
      );
      if (!touch) return;
      if (moveGesture(touch.clientX, touch.clientY)) event.preventDefault();
    };
    const onTouchEnd = (event: TouchEvent) => {
      clearTimer();
      if (state.current.lifted) {
        event.preventDefault();
        finish();
      }
    };
    const onTouchCancel = () => onPointerCancel();

    element.addEventListener("touchstart", onTouchStart, { passive: false });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd, { passive: false });
    element.addEventListener("touchcancel", onTouchCancel);
    return () => {
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [beginGesture, clearTimer, finish, moveGesture, onPointerCancel, organizing]);

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
      stopAutoScroll();
    },
    [stopAutoScroll],
  );

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onContextMenu,
    },
    setElementRef,
    consumeClick,
    isDragging: draggingId === item.id,
  };
}
